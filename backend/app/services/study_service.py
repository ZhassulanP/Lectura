from uuid import UUID, uuid4

from pydantic import ValidationError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.ai.provider import StudyProvider
from app.exceptions import AppError
from app.models import StudyMaterial
from app.repository import get_presentation, get_slides, public_material
from app.schemas import CardsContent, NotesContent, QuizContent, QuizOptions


def generation_input(db: Session, id: UUID):
    presentation = get_presentation(db, id)
    if presentation.status != "READY":
        raise AppError("Content extraction must complete before generation.", 409, "presentation_not_ready")
    slides = get_slides(db, id)
    if not any(s.content.strip() for s in slides):
        raise AppError("No extracted text is available. Scanned PDFs require OCR.", 422, "insufficient_evidence")
    return presentation.title, slides


def validate_sources(content, slides):
    supported = {s.number for s in slides if s.content.strip()}
    items = content.sections if isinstance(content, NotesContent) else content.questions if isinstance(content, QuizContent) else content.cards
    if any(not item.source_slides or not set(item.source_slides).issubset(supported) for item in items):
        raise AppError("AI content cited missing or empty slides. Nothing was saved.", 502, "invalid_source_reference")


def save_material(db: Session, id: UUID, kind: str, data: dict):
    # Re-check existence after the provider request (the presentation may be deleted).
    get_presentation(db, id)
    material = StudyMaterial(presentation_id=id, kind=kind, content=data)
    db.add(material)
    db.commit()
    return public_material(material)


async def generate(db: Session, id: UUID, kind: str, provider: StudyProvider, options: QuizOptions | None = None):
    title, slides = await run_in_threadpool(generation_input, db, id)
    # Release the read transaction while waiting on the provider.
    await run_in_threadpool(db.rollback)
    try:
        if kind == "notes":
            content = NotesContent.model_validate(await provider.generate_notes(slides))
        elif kind == "quiz":
            assert options is not None
            content = QuizContent.model_validate(await provider.generate_quiz(slides, options))
            if len(content.questions) != options.question_count:
                raise AppError("AI returned the wrong question count. Nothing was saved.", 502, "invalid_ai_output")
            if options.question_count >= 2 and {q.type for q in content.questions} != {"MULTIPLE_CHOICE", "SHORT_ANSWER"}:
                raise AppError("AI did not include both question types. Nothing was saved.", 502, "invalid_ai_output")
        else:
            content = CardsContent.model_validate(await provider.generate_flashcards(slides))
    except ValidationError:
        raise AppError("AI returned invalid study content. Nothing was saved.", 502, "invalid_ai_output") from None
    validate_sources(content, slides)
    data = content.model_dump(mode="json", by_alias=True)
    if kind == "notes":
        data["title"] = f"{title} — Notes"
    elif kind == "quiz":
        data["difficulty"] = options.difficulty
        for question in data["questions"]:
            question["id"] = str(uuid4())
    else:
        for card in data["cards"]:
            card["id"] = str(uuid4())
    return await run_in_threadpool(save_material, db, id, kind, data)
