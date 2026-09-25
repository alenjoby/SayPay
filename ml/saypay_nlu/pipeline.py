"""text + contacts -> one structured, proposed action.

The result is only a proposal: the app reads it back and the user approves
with a fingerprint. Nothing here moves money.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from .intents import INTENTS, keyword_hits, softmax
from .lexicon import STOPWORDS
from .normalize import Token, clean, normalized_text, tokenize
from .numbers import extract_numbers, pick_amount, unit_of
from .recipients import (
    ContactIndex,
    Recipient,
    find_address,
    find_ens,
    find_keyword_recipient,
    find_tx_hash,
)
from .txref import extract_tx_ref

CONFIDENCE_THRESHOLD = 0.8

_MODEL = None
_ENGINE = "rules-v1"
_MODEL_LOADED = False
_MODELS_DIR = Path(__file__).resolve().parents[1] / "models"


def get_model():
    """The intent model to use. SAYPAY_ENGINE picks it:
    auto (default): v3 + mmBERT ensemble if the ONNX model exists, else v3, else rules
    ensemble | v3 | rules: force one."""
    global _MODEL, _ENGINE, _MODEL_LOADED
    if not _MODEL_LOADED:
        _MODEL_LOADED = True
        want = os.getenv("SAYPAY_ENGINE", "auto").lower()
        if want != "rules":
            from .classifier import IntentModel
            v3 = IntentModel.load()
            onnx = None
            if want in ("auto", "ensemble") and v3 is not None:
                try:
                    from .transformer import OnnxIntentModel
                    onnx = OnnxIntentModel.load(Path(os.getenv(
                        "SAYPAY_TRANSFORMER", _MODELS_DIR / "mmbert_int8")))
                except ImportError:  # onnxruntime / tokenizers not installed
                    onnx = None
            if onnx is not None:
                from .transformer import Ensemble
                _MODEL, _ENGINE = Ensemble(v3, onnx), "v3+mmbert"
            elif v3 is not None:
                _MODEL, _ENGINE = v3, "tfidf-v3"
    return _MODEL


def engine_name() -> str:
    get_model()
    return _ENGINE

_STOP = {clean(w) for w in STOPWORDS}

# Latin words that mark Hinglish rather than English.
_HINGLISH = {
    "ko", "hai", "hain", "mera", "meri", "mere", "kitna", "kitne", "bhejo", "bhej", "karo", "kya",
    "nahi", "nahin", "rehne", "gaya", "gya", "pichla", "pichli", "pichle", "dikhao", "paise",
    "paisa", "se", "ke", "ki", "ka", "liye", "aur", "bhi", "mujhe", "yaar", "abhi", "kal", "aaj",
    "sau", "hazaar", "hazar", "dedh", "dhai", "kho", "khoya", "chori", "naya", "jodo", "mat",
    "ruko", "pahuncha", "pahunchi", "bheja", "mila", "lenden", "len", "den", "baaki", "ek",
    "paanch", "panch", "teen", "char", "das", "bees", "pachas", "naam", "wala", "wali", "hua",
}
_ENGLISH = {
    "send", "to", "my", "balance", "what", "whats", "is", "how", "much", "transfer", "pay",
    "history", "last", "transaction", "transactions", "cancel", "the", "please", "add", "contact",
    "save", "lost", "phone", "status", "did", "it", "go", "through", "receive", "show", "me",
    "check", "money", "address", "and", "a", "an", "of", "for", "i", "have", "can", "you",
    "never", "mind", "stop", "no", "yes", "new", "as", "wallet", "recent", "stolen", "recover",
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "hundred",
    "thousand", "point", "zero", "half", "request", "give", "just", "this", "that", "user",
    "copied", "scan", "code", "qr", "myself", "yesterday", "today", "sent", "pending", "arrived",
    "funds", "left", "dollars", "dirhams", "riyals", "ether", "ethereum", "eth",
}

_NAME_CUES = {clean(w) for w in ["as", "named", "called", "باسم", "اسمه", "اسمها", "سمه",
                                 "naam", "नाम"]}
_LAST_SENDER = [("who", "sent"), ("sent", "me"), ("sender",), ("last", "person"), ("اللي", "ارسل"),
                ("اللي", "حول"), ("الي", "حول"), ("المرسل",), ("jisne", "bheja"),
                ("jisne",), ("जिसने",)]


@dataclass
class ParseResult:
    intent: str
    confidence: float
    needs_clarification: bool
    clarification: dict | None
    alternatives: list[dict]
    amount: float | None
    unit: str | None
    recipient: dict | None
    contact: str | None
    phone: str | None
    name: str | None
    source: str | None
    similar_contacts: list[str]
    tx_ref: dict | None
    lang_mix: list[str]
    normalized_text: str
    scores: dict[str, float] = field(default_factory=dict)

    def as_dict(self) -> dict:
        d = dict(self.__dict__)
        d.pop("scores")
        return d


def detect_lang_mix(tokens: list[Token]) -> list[str]:
    counts: dict[str, int] = {}
    for t in tokens:
        lang = None
        if t.script in ("ar", "arabizi"):
            lang = "ar"
        elif t.script == "deva":
            lang = "hi"
        elif t.script == "latin":
            if t.text in _HINGLISH:
                lang = "hi"
            elif t.text in _ENGLISH:
                lang = "en"
        if lang:
            counts[lang] = counts.get(lang, 0) + 1
    return [k for k, _ in sorted(counts.items(), key=lambda kv: -kv[1])]


def _new_name(tokens: list[Token], reserved: set[int]) -> str | None:
    """Name for add_contact: the token after "as/باسم", else the first free word."""
    for i, t in enumerate(tokens):
        if t.text in _NAME_CUES and i + 1 < len(tokens) and i + 1 not in reserved:
            return _display(tokens[i + 1])
    for i, t in enumerate(tokens):
        if i in reserved or t.script in ("num", "addr", "sym") or t.text in _STOP:
            continue
        if t.text in _NAME_CUES or len(t.text) < 2:
            continue
        return _display(t)
    return None


def _display(t: Token) -> str:
    return t.raw.title() if t.raw.isascii() else t.raw


def _has_seq(tokens: list[Token], seq: tuple[str, ...]) -> bool:
    texts = [t.text for t in tokens]
    n = len(seq)
    return any(tuple(texts[i:i + n]) == seq for i in range(len(texts) - n + 1))


def parse(text: str, contacts: list[str] | None = None, model="auto") -> ParseResult:
    """Parse one command. ``model``: "auto" (trained model if present), None (rules),
    or an IntentModel instance (used by the evaluation)."""
    tokens = tokenize(text)
    index = ContactIndex(contacts or [])

    scores, keyword_idx = keyword_hits(tokens)
    spans = extract_numbers(tokens)
    amount_span = pick_amount(spans)
    phone_span = next((s for s in spans if s.kind == "phone"), None)
    tx_hash = find_tx_hash(tokens)

    reserved = set(keyword_idx)
    for s in spans:
        reserved.update(range(s.start, s.end))
    for i, t in enumerate(tokens):
        if unit_of(t):
            reserved.add(i)

    # Recipient, most specific first.
    recipient: Recipient | None = find_address(tokens) or find_ens(tokens)
    if recipient is None and phone_span:
        recipient = Recipient("phone", phone_span.text, span=(phone_span.start, phone_span.end))
    if recipient is None:
        recipient = index.match(tokens, reserved)
    if recipient is None:
        recipient = find_keyword_recipient(tokens)
    if recipient and recipient.span:
        reserved.update(range(*recipient.span))

    tx_ref = extract_tx_ref(tokens)
    if tx_hash:
        tx_ref["hash"] = tx_hash

    # Slot evidence nudges the keyword scores.
    if amount_span:
        scores["send"] += 1.5
    if recipient and recipient.type != "self":
        scores["send"] += 1.0 if amount_span else 0.5
    if recipient and recipient.type == "self":
        scores["send"] += 0.5
    if tx_hash:
        scores["tx_status"] += 3
    if tx_ref.get("when") or tx_ref.get("direction"):
        scores["history"] += 0.5
        scores["tx_status"] += 0.5
        scores["send"] -= 1.0 if tx_ref.get("direction") == "sent" else 0
    if tx_ref.get("ordinal") and amount_span is None:
        # "my last transfer ..." talks about a past transaction, not a new one.
        scores["send"] -= 2.5
        scores["tx_status"] += 0.5
    if any(t.text in _NAME_CUES for t in tokens[:-1]):
        scores["add_contact"] += 1.5
    if len(tokens) <= 2 and scores["cancel"] > 0:
        scores["cancel"] += 1.5  # a bare "no" / "لا" / "nahi"

    if model == "auto":
        model = get_model()
    if model is not None:
        probs = model.predict_one(text, contacts)
        if tx_hash and max(probs, key=probs.get) not in ("history", "tx_status"):
            # A pasted 66-char hash can only be a transaction lookup.
            probs = {k: (0.95 if k == "tx_status" else v * 0.05) for k, v in probs.items()}
        ranked = sorted(probs.items(), key=lambda kv: -kv[1])
        top, conf = ranked[0]
    else:
        probs = softmax(scores)
        ranked = sorted(probs.items(), key=lambda kv: -kv[1])
        top, conf = ranked[0]
        if max(scores.values()) <= 0:
            top, conf = "unknown", 0.0

    missing: list[str] = []
    if top == "send":
        if amount_span is None:
            missing.append("amount")
        if recipient is None:
            missing.append("recipient")

    name = None
    source = None
    similar: list[str] = []
    if top == "add_contact":
        if recipient and recipient.type in ("clipboard", "qr", "address", "ens", "handle", "phone"):
            source = recipient.type
        elif any(_has_seq(tokens, tuple(clean(w) for w in seq)) for seq in _LAST_SENDER):
            source = "last_sender"
        if recipient and recipient.type == "contact":
            # Saying an existing name: probably a duplicate; let the app ask.
            name = recipient.contact
        else:
            name = _new_name(tokens, reserved)
        if name:
            similar = [n for n, _ in index.similar(name)]

    if top in ("history", "tx_status") and recipient and recipient.type == "contact":
        tx_ref["contact"] = recipient.contact
    if top in ("history", "tx_status") and amount_span:
        tx_ref["amount"] = amount_span.value

    clarification = None
    needs = conf < CONFIDENCE_THRESHOLD or bool(missing) or top == "unknown"
    if top == "unknown":
        clarification = {"type": "unknown"}
    elif missing and conf >= 0.5:
        # "How much should I send to Ahmed?" also confirms the intent.
        clarification = {"type": "missing", "slots": missing}
    elif conf < CONFIDENCE_THRESHOLD:
        options = [k for k, _ in ranked if k != "unknown"][:2]
        clarification = {"type": "choose_intent", "options": options}

    return ParseResult(
        intent=top,
        confidence=round(conf, 3),
        needs_clarification=needs,
        clarification=clarification,
        alternatives=[{"intent": k, "score": round(v, 3)} for k, v in ranked[1:3] if k != top],
        amount=amount_span.value if amount_span else None,
        unit=amount_span.unit if amount_span else None,
        recipient=recipient.as_dict() if recipient else None,
        contact=recipient.contact if recipient and recipient.type == "contact" else None,
        phone=phone_span.text if phone_span else None,
        name=name,
        source=source,
        similar_contacts=similar,
        tx_ref=tx_ref or None,
        lang_mix=detect_lang_mix(tokens),
        normalized_text=normalized_text(tokens),
        scores={k: round(v, 3) for k, v in scores.items()},
    )


__all__ = ["parse", "ParseResult", "INTENTS", "CONFIDENCE_THRESHOLD"]
