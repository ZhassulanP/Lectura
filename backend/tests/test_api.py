from io import BytesIO
from uuid import uuid4

import pytest
from pypdf import PdfWriter

from app.ai.gemini_provider import get_provider
from app.core.config import Settings, get_settings
from app.exceptions import AppError
from app.schemas import CardsContent, NotesContent, Question
from conftest import StubProvider, pdf_bytes, pptx_bytes

PREFIX = "/api/v1"


def test_health_and_contract(client):
    assert client.get(f"{PREFIX}/health").json() == {"status": "ok", "database": "ok"}
    paths = client.get("/openapi.json").json()["paths"]
    assert f"{PREFIX}/presentations/{{presentation_id}}/materials" in paths


@pytest.mark.parametrize("filename,data,expected", [("lecture.pdf", pdf_bytes(), "PDF"), ("lecture.pptx", pptx_bytes(), "PPTX")], ids=["pdf", "pptx"])
def test_extraction_and_persistence(client, filename, data, expected):
    response = client.post(f"{PREFIX}/presentations", files={"file": ("../../" + filename, data)}, data={"subject": "Physics", "description": "Lecture"})
    assert response.status_code == 201, response.text
    presentation = response.json()
    assert presentation["filename"] == filename
    assert presentation["status"] == "READY"
    assert presentation["fileType"] == expected
    assert presentation["fileSizeBytes"] == len(data)
    assert presentation["subject"] == "Physics"
    assert client.get(f"{PREFIX}/presentations/{presentation['id']}").json() == presentation
    assert client.get(f"{PREFIX}/presentations").json()[0] == presentation
    slides = client.get(f"{PREFIX}/presentations/{presentation['id']}/slides").json()
    assert "Energy is conserved" in slides[0]["content"]
    assert slides[0]["number"] == 1
    if expected == "PPTX":
        assert len(slides) == 2 and slides[1]["number"] == 2 and slides[1]["content"] == ""


@pytest.mark.parametrize("filename,data,status", [("empty.pdf", b"", 422), ("lecture.txt", b"hello", 415), ("fake.pdf", b"not pdf", 422), ("fake.pptx", b"not zip", 422), ("broken.pdf", b"%PDF-1.7\nbroken", 422)])
def test_invalid_upload(client, filename, data, status):
    response = client.post(f"{PREFIX}/presentations", files={"file": (filename, data)})
    assert response.status_code == status
    assert response.json()["message"]
    assert client.get(f"{PREFIX}/presentations").json() == []


def test_encrypted_pdf(client):
    writer = PdfWriter(BytesIO(pdf_bytes()))
    writer.encrypt("password")
    buffer = BytesIO()
    writer.write(buffer)
    response = client.post(f"{PREFIX}/presentations", files={"file": ("locked.pdf", buffer.getvalue())})
    assert response.status_code == 422
    assert response.json()["code"] == "encrypted_document"


def test_size_limit(client):
    client.app.dependency_overrides[get_settings] = lambda: Settings(max_upload_bytes=10)
    response = client.post(f"{PREFIX}/presentations", files={"file": ("large.pdf", pdf_bytes())})
    assert response.status_code == 413


def test_multipart_limit_before_parsing(monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import create_app
    monkeypatch.setattr("app.main.get_settings", lambda: Settings(max_upload_bytes=10))
    with TestClient(create_app()) as client:
        response = client.post(f"{PREFIX}/presentations", files={"file": ("large.pdf", b"x" * 100_000)})
    assert response.status_code == 413
    assert "size limit" in response.json()["message"]


def test_scanned_pdf_is_honest(client):
    response = client.post(f"{PREFIX}/presentations", files={"file": ("scan.pdf", pdf_bytes(""))})
    assert response.status_code == 201
    assert response.json()["status"] == "FAILED"
    assert "OCR" in response.json()["errorMessage"]
    assert client.post(f"{PREFIX}/presentations/{response.json()['id']}/notes").status_code == 409


@pytest.mark.parametrize("path", ["presentations", "quizzes", "quiz-attempts"])
def test_missing_records(client, path):
    assert client.get(f"{PREFIX}/{path}/{uuid4()}").status_code == 404


def generate_quiz(client, presentation_id):
    response = client.post(f"{PREFIX}/presentations/{presentation_id}/quizzes", json={"questionCount": 2, "difficulty": "MEDIUM"})
    assert response.status_code == 201, response.text
    return response.json()


def test_generation_persistence_and_answer_key_privacy(client, presentation_id):
    notes = client.post(f"{PREFIX}/presentations/{presentation_id}/notes")
    cards = client.post(f"{PREFIX}/presentations/{presentation_id}/flashcards")
    assert notes.status_code == cards.status_code == 201
    quiz = generate_quiz(client, presentation_id)
    assert all("correctAnswer" not in q and "explanation" not in q for q in quiz["questions"])
    assert client.get(f"{PREFIX}/quizzes/{quiz['id']}").json() == quiz
    history = client.get(f"{PREFIX}/presentations/{presentation_id}/materials").json()
    assert history["notes"][0] == notes.json()
    assert history["flashcards"][0] == cards.json()
    assert history["quizzes"][0] == quiz
    assert history["attempts"] == []
    # No provider call on retrieval.
    class BrokenProvider(StubProvider):
        async def generate_notes(self, slides):
            raise AssertionError("Retrieval must not regenerate")
    client.app.dependency_overrides[get_provider] = BrokenProvider
    assert client.get(f"{PREFIX}/presentations/{presentation_id}/materials").json() == history


def test_scoring_attempts_and_cascade_delete(client, presentation_id):
    quiz = generate_quiz(client, presentation_id)
    submission = {"answers": [{"questionId": quiz["questions"][0]["id"], "answer": "Energy"}, {"questionId": quiz["questions"][1]["id"], "answer": "  ENTROPY  "}]}
    response = client.post(f"{PREFIX}/quizzes/{quiz['id']}/attempts", json=submission)
    assert response.status_code == 201, response.text
    attempt = response.json()
    assert attempt["score"] == 2 and attempt["total"] == 2
    assert attempt["results"][0]["correctAnswer"] == "Energy"
    assert attempt["results"][0]["sourceSlides"] == [1]
    assert client.get(f"{PREFIX}/quiz-attempts/{attempt['id']}").json() == attempt
    assert client.get(f"{PREFIX}/quizzes/{quiz['id']}/attempts").json() == [attempt]
    skipped = client.post(f"{PREFIX}/quizzes/{quiz['id']}/attempts", json={"answers": []}).json()
    assert skipped["score"] == 0 and skipped["total"] == 2
    assert len(client.get(f"{PREFIX}/presentations/{presentation_id}/materials").json()["attempts"]) == 2
    assert client.delete(f"{PREFIX}/presentations/{presentation_id}").status_code == 204
    assert client.get(f"{PREFIX}/quizzes/{quiz['id']}").status_code == 404
    assert client.get(f"{PREFIX}/quiz-attempts/{attempt['id']}").status_code == 404


@pytest.mark.parametrize("kind", ["unknown", "duplicate", "option", "client_score"])
def test_invalid_answers(client, presentation_id, kind):
    quiz = generate_quiz(client, presentation_id)
    answer = {"questionId": quiz["questions"][0]["id"], "answer": "Energy"}
    body = {"answers": [answer]}
    if kind == "unknown":
        answer["questionId"] = str(uuid4())
    elif kind == "duplicate":
        body["answers"].append(answer)
    elif kind == "option":
        answer["answer"] = "Unknown option"
    else:
        body["score"] = 100
    assert client.post(f"{PREFIX}/quizzes/{quiz['id']}/attempts", json=body).status_code == 422
    assert client.get(f"{PREFIX}/quizzes/{quiz['id']}/attempts").json() == []


@pytest.mark.parametrize("count", [0, 21, 1.5])
def test_invalid_question_count(client, presentation_id, count):
    assert client.post(f"{PREFIX}/presentations/{presentation_id}/quizzes", json={"questionCount": count}).status_code == 422


def test_bad_ai_sources_never_persist(client, presentation_id):
    class BadProvider(StubProvider):
        async def generate_notes(self, slides):
            value = await super().generate_notes(slides)
            value.sections[0].source_slides = [999]
            return value
    client.app.dependency_overrides[get_provider] = BadProvider
    response = client.post(f"{PREFIX}/presentations/{presentation_id}/notes")
    assert response.status_code == 502
    assert response.json()["code"] == "invalid_source_reference"
    assert client.get(f"{PREFIX}/presentations/{presentation_id}/materials").json()["notes"] == []


def test_provider_failure_never_persists(client, presentation_id):
    class FailedProvider(StubProvider):
        async def generate_notes(self, slides):
            raise AppError("Rate limited", 429, "provider_rate_limit")
    client.app.dependency_overrides[get_provider] = FailedProvider
    response = client.post(f"{PREFIX}/presentations/{presentation_id}/notes")
    assert response.status_code == 429 and response.headers["Retry-After"] == "30"
    assert client.get(f"{PREFIX}/presentations/{presentation_id}/materials").json()["notes"] == []


def test_ai_schema_validation():
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        NotesContent.model_validate({"overview": "Overview", "sections": []})
    with pytest.raises(ValidationError):
        Question.model_validate({"type": "MULTIPLE_CHOICE", "prompt": "Prompt", "options": ["A", "A"], "correctAnswer": "B", "explanation": "Explanation", "sourceSlides": [1]})
    with pytest.raises(ValidationError):
        CardsContent.model_validate({"cards": [{"front": "Front", "back": "Back", "sourceSlides": []}]})
