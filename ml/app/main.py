"""SayPay intent API.

Run:  uvicorn app.main:app --host 0.0.0.0 --port 8000
The text of voice commands is never logged or stored.
"""

from __future__ import annotations

import os

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from saypay_nlu import CONFIDENCE_THRESHOLD, INTENTS, __version__, engine_name, parse

from .schemas import IntentRequest, IntentResponse

app = FastAPI(title="SayPay Intent API", version=__version__)

_origins = [o.strip() for o in os.getenv("SAYPAY_CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "engine": engine_name(), "version": __version__, "intents": INTENTS,
            "confidence_threshold": CONFIDENCE_THRESHOLD}


@app.post("/intent", response_model=IntentResponse, response_model_exclude_none=False)
def intent(req: IntentRequest, debug: bool = False) -> IntentResponse:
    result = parse(req.text, req.contacts, reply_lang=req.reply_lang,
                   default_unit=req.default_unit)
    body = result.as_dict()
    body["engine"] = engine_name()
    body["scores"] = result.scores if debug else None
    return IntentResponse(**body)


_VOICE_MAP = {
    "en": "en-US-JennyNeural",
    "hi": "hi-IN-SwaraNeural",
    "ar": "ar-SA-ZariyahNeural",
}


@app.get("/tts")
async def tts(text: str = "", lang: str = "en"):
    """Streams high-quality Microsoft Edge Neural TTS audio MP3."""
    import edge_tts
    from fastapi.responses import Response

    cleaned_text = text.strip()
    if not cleaned_text:
        return Response(status_code=400, content=b"Missing text parameter")

    voice = _VOICE_MAP.get(lang, "en-US-JennyNeural")
    try:
        communicate = edge_tts.Communicate(cleaned_text, voice)
        audio_chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])
        return Response(content=b"".join(audio_chunks), media_type="audio/mpeg")
    except Exception as exc:
        return Response(status_code=500, content=str(exc).encode("utf-8"))


@app.get("/", include_in_schema=False)
def tester() -> FileResponse:
    """Small voice/text test page for trying the model by hand."""
    return FileResponse(Path(__file__).parent / "static" / "index.html")
