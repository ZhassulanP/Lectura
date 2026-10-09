from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


json_type = JSON().with_variant(JSONB(), "postgresql")


class Presentation(Base):
    __tablename__ = "presentations"
    __table_args__ = (
        CheckConstraint("file_type IN ('PDF', 'PPTX')", name="valid_file_type"),
        CheckConstraint("status IN ('UPLOADING', 'EXTRACTING', 'READY', 'FAILED')", name="valid_status"),
        CheckConstraint("file_size_bytes > 0", name="positive_file_size"),
        CheckConstraint("slide_count IS NULL OR slide_count >= 0", name="valid_slide_count"),
        Index("ix_presentations_uploaded_at", "uploaded_at"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    filename: Mapped[str] = mapped_column(String(255))
    title: Mapped[str] = mapped_column(String(255))
    file_type: Mapped[str] = mapped_column(String(4))
    file_size_bytes: Mapped[int] = mapped_column(Integer)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    status: Mapped[str] = mapped_column(String(16), default="EXTRACTING")
    slide_count: Mapped[int | None] = mapped_column(Integer)
    subject: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(String(500))
    error_message: Mapped[str | None] = mapped_column(Text)
    slides: Mapped[list["SlideContent"]] = relationship(cascade="all, delete-orphan", passive_deletes=True)
    materials: Mapped[list["StudyMaterial"]] = relationship(cascade="all, delete-orphan", passive_deletes=True)


class SlideContent(Base):
    __tablename__ = "slide_contents"
    __table_args__ = (
        UniqueConstraint("presentation_id", "number", name="unique_slide_number"),
        CheckConstraint("number > 0", name="positive_slide_number"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    presentation_id: Mapped[UUID] = mapped_column(ForeignKey("presentations.id", ondelete="CASCADE"), index=True)
    number: Mapped[int] = mapped_column(Integer)
    title: Mapped[str | None] = mapped_column(Text)
    content: Mapped[str] = mapped_column(Text)


class StudyMaterial(Base):
    __tablename__ = "study_materials"
    __table_args__ = (CheckConstraint("kind IN ('notes', 'quiz', 'flashcards')", name="valid_material_kind"),)
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    presentation_id: Mapped[UUID] = mapped_column(ForeignKey("presentations.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(16))
    content: Mapped[dict] = mapped_column(json_type)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    attempts: Mapped[list["QuizAttempt"]] = relationship(cascade="all, delete-orphan", passive_deletes=True)


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    __table_args__ = (
        CheckConstraint("total > 0 AND score >= 0 AND score <= total", name="valid_score"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    quiz_id: Mapped[UUID] = mapped_column(ForeignKey("study_materials.id", ondelete="CASCADE"), index=True)
    answers: Mapped[list] = mapped_column(json_type)
    results: Mapped[list] = mapped_column(json_type)
    score: Mapped[int] = mapped_column(Integer)
    total: Mapped[int] = mapped_column(Integer)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
