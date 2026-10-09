from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Form, Response, UploadFile
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.ai.gemini_provider import get_provider
from app.ai.provider import StudyProvider
from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.exceptions import AppError
from app.models import Presentation, QuizAttempt, SlideContent, StudyMaterial
from app.repository import get_presentation, get_quiz, get_slides, list_attempts, public_material
from app.schemas import AttemptInput, AttemptOut, DeckOut, MaterialsOut, NotesOut, PresentationOut, QuizOptions, QuizOut, Slide
from app.services.document_parser import extract_document, file_type
from app.services.quiz_service import score_attempt
from app.services.study_service import generate

router = APIRouter()
DB = Annotated[Session, Depends(get_db)]
Config = Annotated[Settings, Depends(get_settings)]
Provider = Annotated[StudyProvider, Depends(get_provider)]


@router.get("/health")
def health(db: DB):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}


@router.get("/presentations", response_model=list[PresentationOut])
def presentations(db: DB):
    return list(db.scalars(select(Presentation).order_by(Presentation.uploaded_at.desc())))


def persist_upload(db: Session, filename: str, kind: str, size: int, slides: list[Slide], subject: str | None, description: str | None):
    has_text = any(s.content.strip() for s in slides)
    presentation = Presentation(
        filename=filename, title=filename.rsplit(".", 1)[0] or "Untitled presentation",
        file_type=kind, file_size_bytes=size, subject=subject, description=description,
        slide_count=len(slides), status="READY" if has_text else "FAILED",
        error_message=None if has_text else "No extractable text was found. Scanned PDFs require OCR, which is outside this MVP. Upload a text-based PDF or PPTX.",
    )
    db.add(presentation)
    db.flush()
    db.add_all([SlideContent(presentation_id=presentation.id, number=s.number, title=s.title, content=s.content) for s in slides])
    db.commit()
    return PresentationOut.model_validate(presentation)


@router.post("/presentations", response_model=PresentationOut, status_code=201)
async def upload(
    file: UploadFile, db: DB, settings: Config,
    subject: Annotated[str | None, Form(max_length=100)] = None,
    description: Annotated[str | None, Form(max_length=500)] = None,
):
    try:
        # Originals are never used as filesystem paths; uploaded bytes are discarded.
        filename = (file.filename or "presentation").replace("\\", "/").rsplit("/", 1)[-1]
        if len(filename) > 255:
            raise AppError("The filename is too long.", 422)
        kind = file_type(filename)
        data = bytearray()
        while chunk := await file.read(1024 * 1024):
            if len(data) + len(chunk) > settings.max_upload_bytes:
                raise AppError("This file exceeds the upload size limit.", 413, "file_too_large")
            data.extend(chunk)
        slides = await run_in_threadpool(extract_document, bytes(data), kind, settings)
        return await run_in_threadpool(persist_upload, db, filename, kind, len(data), slides, subject.strip() if subject else None, description.strip() if description else None)
    finally:
        await file.close()


@router.get("/presentations/{presentation_id}", response_model=PresentationOut)
def presentation(presentation_id: UUID, db: DB):
    return get_presentation(db, presentation_id)


@router.get("/presentations/{presentation_id}/slides", response_model=list[Slide])
def slides(presentation_id: UUID, db: DB):
    return get_slides(db, presentation_id)


@router.delete("/presentations/{presentation_id}", status_code=204)
def delete_presentation(presentation_id: UUID, db: DB):
    db.delete(get_presentation(db, presentation_id))
    db.commit()
    return Response(status_code=204)


@router.post("/presentations/{presentation_id}/notes", response_model=NotesOut, status_code=201)
async def notes(presentation_id: UUID, db: DB, provider: Provider):
    return await generate(db, presentation_id, "notes", provider)


@router.post("/presentations/{presentation_id}/quizzes", response_model=QuizOut, status_code=201)
async def quizzes(presentation_id: UUID, options: QuizOptions, db: DB, provider: Provider):
    return await generate(db, presentation_id, "quiz", provider, options)


@router.post("/presentations/{presentation_id}/flashcards", response_model=DeckOut, status_code=201)
async def flashcards(presentation_id: UUID, db: DB, provider: Provider):
    return await generate(db, presentation_id, "flashcards", provider)


@router.get("/presentations/{presentation_id}/materials", response_model=MaterialsOut)
def materials(presentation_id: UUID, db: DB):
    get_presentation(db, presentation_id)
    items = list(db.scalars(select(StudyMaterial).where(StudyMaterial.presentation_id == presentation_id).order_by(StudyMaterial.created_at.desc())))
    attempts = list(db.scalars(select(QuizAttempt).join(StudyMaterial).where(StudyMaterial.presentation_id == presentation_id).order_by(QuizAttempt.submitted_at.desc())))
    return {
        "notes": [public_material(m) for m in items if m.kind == "notes"],
        "quizzes": [public_material(m) for m in items if m.kind == "quiz"],
        "flashcards": [public_material(m) for m in items if m.kind == "flashcards"],
        "attempts": attempts,
    }


@router.get("/quizzes/{quiz_id}", response_model=QuizOut)
def quiz(quiz_id: UUID, db: DB):
    return public_material(get_quiz(db, quiz_id))


@router.post("/quizzes/{quiz_id}/attempts", response_model=AttemptOut, status_code=201)
def submit(quiz_id: UUID, submission: AttemptInput, db: DB):
    return score_attempt(db, quiz_id, submission)


@router.get("/quizzes/{quiz_id}/attempts", response_model=list[AttemptOut])
def attempts(quiz_id: UUID, db: DB):
    get_quiz(db, quiz_id)
    return list_attempts(db, quiz_id)


@router.get("/quiz-attempts/{attempt_id}", response_model=AttemptOut)
def attempt(attempt_id: UUID, db: DB):
    found = db.get(QuizAttempt, attempt_id)
    if not found:
        raise AppError("Quiz attempt not found.", 404, "not_found")
    return found
