from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.exceptions import AppError
from app.models import Presentation, QuizAttempt, SlideContent, StudyMaterial
from app.schemas import DeckOut, NotesOut, QuizOut, Slide


def get_presentation(db: Session, id: UUID) -> Presentation:
    presentation = db.get(Presentation, id)
    if not presentation:
        raise AppError("Presentation not found.", 404, "not_found")
    return presentation


def get_slides(db: Session, id: UUID) -> list[Slide]:
    get_presentation(db, id)
    return [Slide.model_validate(s) for s in db.scalars(select(SlideContent).where(SlideContent.presentation_id == id).order_by(SlideContent.number))]


def get_quiz(db: Session, id: UUID) -> StudyMaterial:
    material = db.get(StudyMaterial, id)
    if not material or material.kind != "quiz":
        raise AppError("Quiz not found.", 404, "not_found")
    return material


def public_material(material: StudyMaterial):
    data = dict(material.content)
    if material.kind == "quiz":
        data["questions"] = [{k: v for k, v in q.items() if k not in ("correctAnswer", "explanation")} for q in data["questions"]]
    data.update(id=material.id, presentationId=material.presentation_id, createdAt=material.created_at)
    schema = {"notes": NotesOut, "quiz": QuizOut, "flashcards": DeckOut}[material.kind]
    return schema.model_validate(data)


def list_attempts(db: Session, quiz_id: UUID):
    return list(db.scalars(select(QuizAttempt).where(QuizAttempt.quiz_id == quiz_id).order_by(QuizAttempt.submitted_at.desc())))
