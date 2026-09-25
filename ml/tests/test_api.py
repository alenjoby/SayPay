from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/health").json()["status"] == "ok"


def test_intent_contract():
    r = client.post("/intent", json={"text": "Rahul ko 500 bhejo", "contacts": ["Amma", "Rahul"]})
    assert r.status_code == 200
    body = r.json()
    for key in ("intent", "amount", "contact", "confidence", "lang_mix", "needs_clarification"):
        assert key in body
    assert body["intent"] == "send" and body["amount"] == 500 and body["contact"] == "Rahul"
    assert body["scores"] is None


def test_debug_scores():
    r = client.post("/intent?debug=true", json={"text": "cancel"})
    assert r.json()["scores"]["cancel"] > 0


def test_rejects_empty():
    assert client.post("/intent", json={"text": ""}).status_code == 422
