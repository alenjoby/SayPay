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
    result = parse(req.text, req.contacts)
    body = result.as_dict()
    body["engine"] = engine_name()
    body["scores"] = result.scores if debug else None
    return IntentResponse(**body)


@app.get("/", include_in_schema=False)
def tester() -> FileResponse:
    """Small voice/text test page for trying the model by hand."""
    return FileResponse(Path(__file__).parent / "static" / "index.html")
