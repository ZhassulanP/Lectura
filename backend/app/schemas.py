from datetime import datetime, timezone
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_serializer, model_validator
from pydantic.alias_generators import to_camel

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=10000)]
Difficulty = Literal["EASY", "MEDIUM", "HARD"]


class Schema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True, extra="forbid")

    @field_serializer("*", when_used="json", check_fields=False)
    def serialize_dates(self, value):
        # SQLite test timestamps are naive; all application timestamps are UTC.
        if isinstance(value, datetime):
            return value.replace(tzinfo=value.tzinfo or timezone.utc).astimezone(timezone.utc).isoformat()
        return value


class PresentationOut(Schema):
    id: UUID
    title: str
    filename: str
    file_type: Literal["PDF", "PPTX"]
    file_size_bytes: int
    uploaded_at: datetime
    slide_count: int | None
    status: Literal["UPLOADING", "EXTRACTING", "READY", "FAILED"]
    subject: str | None
    description: str | None
    error_message: str | None


class Slide(Schema):
    number: int = Field(gt=0)
    title: str | None = None
    content: str


class Sourced(Schema):
    source_slides: list[int] = Field(min_length=1, max_length=500)


class Definition(Schema):
    term: Text
    definition: Text


class NoteSection(Sourced):
    heading: Text
    summary: Text
    definitions: list[Definition] = Field(default_factory=list, max_length=100)
    formulas: list[Text] = Field(default_factory=list, max_length=100)
    examples: list[Text] = Field(default_factory=list, max_length=100)


class NotesContent(Schema):
    overview: Text
    sections: list[NoteSection] = Field(min_length=1, max_length=100)


class Question(Sourced):
    type: Literal["MULTIPLE_CHOICE", "SHORT_ANSWER"]
    prompt: Text
    options: list[Text] | None = Field(default=None, min_length=2, max_length=6)
    correct_answer: Text
    explanation: Text

    @model_validator(mode="after")
    def valid_options(self):
        if self.type == "MULTIPLE_CHOICE":
            if not self.options or len(set(self.options)) != len(self.options):
                raise ValueError("Multiple-choice questions require unique options")
            if self.correct_answer not in self.options:
                raise ValueError("The correct answer must be one option")
        elif self.options is not None:
            raise ValueError("Short-answer questions cannot have options")
        return self


class QuizContent(Schema):
    questions: list[Question] = Field(min_length=1, max_length=20)


class Card(Sourced):
    front: Text
    back: Text


class CardsContent(Schema):
    cards: list[Card] = Field(min_length=1, max_length=100)


class MaterialOut(Schema):
    id: UUID
    presentation_id: UUID
    created_at: datetime


class NotesOut(MaterialOut, NotesContent):
    title: str


class QuestionOut(Sourced):
    id: UUID
    type: Literal["MULTIPLE_CHOICE", "SHORT_ANSWER"]
    prompt: str
    options: list[str] | None = None


class QuizOut(MaterialOut):
    difficulty: Difficulty
    questions: list[QuestionOut]


class CardOut(Card):
    id: UUID


class DeckOut(MaterialOut):
    cards: list[CardOut]


class QuizOptions(Schema):
    question_count: int = Field(default=5, ge=1, le=20)
    difficulty: Difficulty = "MEDIUM"


class Answer(Schema):
    question_id: UUID
    answer: str | None = Field(default=None, max_length=10000)


class AttemptInput(Schema):
    answers: list[Answer] = Field(max_length=20)


class QuestionResult(Sourced):
    question_id: UUID
    given_answer: str | None
    correct: bool
    correct_answer: str
    explanation: str


class AttemptOut(Schema):
    id: UUID
    quiz_id: UUID
    submitted_at: datetime
    score: int
    total: int
    results: list[QuestionResult]


class MaterialsOut(Schema):
    notes: list[NotesOut]
    quizzes: list[QuizOut]
    flashcards: list[DeckOut]
    attempts: list[AttemptOut]
