import unicodedata
from uuid import UUID

from sqlalchemy.orm import Session

from app.exceptions import AppError
from app.models import QuizAttempt
from app.repository import get_quiz
from app.schemas import AttemptInput


def normalized(value: str):
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())


def score_attempt(db: Session, quiz_id: UUID, submission: AttemptInput):
    quiz = get_quiz(db, quiz_id)
    questions = quiz.content["questions"]
    known_ids = {q["id"] for q in questions}
    answers = {str(a.question_id): a.answer for a in submission.answers}
    if len(answers) != len(submission.answers):
        raise AppError("A question was answered more than once.", 422, "invalid_answers")
    if not set(answers).issubset(known_ids):
        raise AppError("An answer refers to a question outside this quiz.", 422, "invalid_answers")
    results = []
    for question in questions:
        answer = answers.get(question["id"])
        answer = answer.strip() if answer and answer.strip() else None
        if answer is not None and question["type"] == "MULTIPLE_CHOICE" and answer not in question["options"]:
            raise AppError("Choose one of the question's answer options.", 422, "invalid_answers")
        correct = answer is not None and (
            answer == question["correctAnswer"] if question["type"] == "MULTIPLE_CHOICE"
            else normalized(answer) == normalized(question["correctAnswer"])
        )
        results.append({
            "questionId": question["id"], "givenAnswer": answer, "correct": correct,
            "correctAnswer": question["correctAnswer"], "explanation": question["explanation"],
            "sourceSlides": question["sourceSlides"],
        })
    attempt = QuizAttempt(quiz_id=quiz_id, answers=submission.model_dump(mode="json", by_alias=True)["answers"], results=results, score=sum(r["correct"] for r in results), total=len(questions))
    db.add(attempt)
    db.commit()
    return attempt
