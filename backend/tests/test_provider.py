import asyncio
import json

import httpx
import pytest

from app.ai.gemini_provider import GeminiProvider
from app.core.config import Settings
from app.exceptions import AppError
from app.schemas import Slide


def run(response=None, error=None, settings=None):
    def handle(request):
        assert request.headers["x-goog-api-key"] == "test-key"
        body = json.loads(request.content)
        assert "untrusted" in body["systemInstruction"]["parts"][0]["text"]
        structured = body["generationConfig"]["responseFormat"]["text"]
        assert structured["mimeType"] == "application/json"
        assert "NoteSection" in structured["schema"]["$defs"]
        if error:
            raise error
        return response
    provider = GeminiProvider(settings or Settings(gemini_api_key="test-key"), httpx.MockTransport(handle))
    return asyncio.run(provider.generate_notes([Slide(number=1, content="Energy is conserved.")]))


@pytest.mark.parametrize("status,expected", [(429, 429), (401, 502), (500, 502)])
def test_http_failures(status, expected):
    with pytest.raises(AppError) as caught:
        run(httpx.Response(status, json={"error": "sensitive provider details"}))
    assert caught.value.status == expected
    assert "sensitive" not in caught.value.message


@pytest.mark.parametrize("error,status", [(httpx.ReadTimeout("timeout"), 504), (httpx.ConnectError("unreachable"), 502)])
def test_network_failures(error, status):
    with pytest.raises(AppError) as caught:
        run(error=error)
    assert caught.value.status == status


@pytest.mark.parametrize("body", [{}, {"candidates": []}, {"candidates": [{"finishReason": "MAX_TOKENS"}]}])
def test_invalid_provider_envelopes(body):
    with pytest.raises(AppError) as caught:
        run(httpx.Response(200, json=body))
    assert caught.value.code == "invalid_ai_output"


@pytest.mark.parametrize("text,code", [('not json', 'invalid_ai_output'), ('{"overview":"O","sections":[]}', 'invalid_ai_output'), ('{"error":"insufficient_evidence"}', 'insufficient_evidence')])
def test_invalid_generated_json(text, code):
    with pytest.raises(AppError) as caught:
        run(httpx.Response(200, json={"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": text}]}}]}))
    assert caught.value.code == code


def test_valid_response():
    body = {"overview": "Energy conservation", "sections": [{"heading": "Energy", "summary": "Energy is conserved.", "sourceSlides": [1]}]}
    notes = run(httpx.Response(200, json={"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": json.dumps(body)}]}}]}))
    assert notes.sections[0].source_slides == [1]


def test_missing_key_and_input_limit():
    with pytest.raises(AppError) as missing:
        run(settings=Settings(gemini_api_key=""))
    assert missing.value.status == 503
    with pytest.raises(AppError) as limit:
        run(settings=Settings(gemini_api_key="test-key", max_ai_input_chars=1))
    assert limit.value.status == 413
