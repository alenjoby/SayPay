"""Request/response contract for the frontend."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Intent = Literal["check_balance", "send", "history", "tx_status", "receive", "add_contact",
                 "recovery_help", "cancel", "unknown"]
RecipientType = Literal["address", "ens", "handle", "phone", "contact", "clipboard", "qr", "self"]


class IntentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500, examples=["حول 0.1 إيثيريوم لأمي"])
    contacts: list[str] = Field(default_factory=list, max_length=1000,
                                examples=[["Amma", "Ahmed", "Rahul"]])
    reply_lang: Literal["ar", "en", "hi"] | None = Field(
        None, description="language of readback.text; default: the language the user spoke")
    default_unit: str | None = Field(
        None, examples=["AED"], description="wallet currency used when a send names none "
        "(then unit_assumed=true and the readback says it); if unset, the API asks for it")


class RecipientOut(BaseModel):
    type: RecipientType
    value: str | None = Field(None, description="address / ENS name / phone / contact name")
    contact: str | None = Field(None, description="matched saved contact, as the app sent it")
    score: float


class TxRef(BaseModel):
    ordinal: Literal["last", "first", "previous"] | None = None
    when: Literal["today", "yesterday", "this_morning", "this_week", "this_month"] | None = None
    direction: Literal["sent", "received"] | None = None
    contact: str | None = None
    amount: float | None = None
    hash: str | None = None


class Clarification(BaseModel):
    type: Literal["choose_intent", "missing", "unknown"]
    options: list[str] | None = None
    slots: list[str] | None = None


class Alternative(BaseModel):
    intent: str
    score: float


class Readback(BaseModel):
    text: str = Field(description="sentence to announce (aria-live) / speak before acting")
    lang: Literal["ar", "en", "hi"] = Field(description="BCP-47 base language for lang= / TTS")


class IntentResponse(BaseModel):
    intent: Intent
    confidence: float
    needs_clarification: bool = Field(
        description="true when confidence < 0.8 or a required slot is missing; "
                    "the app must ask instead of acting")
    clarification: Clarification | None = None
    alternatives: list[Alternative]
    amount: float | None = None
    unit: str | None = Field(None, description="ETH, AED, SAR, USD, INR, ... or null if unsaid")
    unit_assumed: bool = Field(False, description="unit came from default_unit, not the user")
    recipient: RecipientOut | None = None
    contact: str | None = Field(None, description="shortcut: recipient.contact when type=contact")
    phone: str | None = None
    name: str | None = Field(None, description="add_contact: the name to save")
    source: str | None = Field(None, description="add_contact: where the address comes from")
    similar_contacts: list[str] = Field(default_factory=list,
                                        description="add_contact: existing names that sound alike")
    tx_ref: TxRef | None = None
    lang_mix: list[str]
    normalized_text: str
    readback: Readback
    engine: str
    scores: dict[str, float] | None = None
