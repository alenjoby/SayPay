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
from .readback import build_readback
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
                    # First model found wins: SAYPAY_TRANSFORMER, then fp32, then int8.
                    for cand in (os.getenv("SAYPAY_TRANSFORMER"), _MODELS_DIR / "mmbert_fp32",
                                 _MODELS_DIR / "mmbert_int8"):
                        onnx = OnnxIntentModel.load(Path(cand)) if cand else None
                        if onnx is not None:
                            break
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
    "pichhle", "pichhla", "pichhli", "batao", "bata", "dikha", "maango", "karna", "kardo", "dena",
    "bhejna", "bhejdo", "kitni", "gaye", "gayi", "tha", "thi", "wapas", "bhool", "bhul",
}
# Arabic written in Latin letters. Words with digits (7awel, 3ndi) are already
# tagged "arabizi" by the tokenizer; these are the common all-letter ones.
_ARABIZI = {
    "kam", "rasidi", "raseedi", "rasedi", "raseed", "rasid", "abi", "abgha", "abga", "abgh",
    "wain", "wen", "wein", "shu", "shoo", "shlon", "flous", "flousi", "flus", "fulus", "fulusi",
    "hawel", "hawil", "haweli", "arsel", "ersel", "arsil", "abaath", "aindi", "andi", "endi",
    "ana", "ila", "ela", "lil", "min", "yalla", "khalas", "habibi", "akhoy", "akhooy", "ukhti",
    "yumma", "ummi", "abooy", "abuy", "atlub", "a6lub", "alghi", "elghi", "wasalat", "wasal",
    "nseet", "naseet", "nsit", "3amaliyat", "amaliyat", "hesabi", "7sabi", "dirhamain",
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
# Phrases that mean the user wants money *from* someone. With one of these present,
# the model is never allowed to propose "send" (asking for money must not send it).
_REQUEST_CUES = [tuple(clean(w) for w in seq.split()) for seq in [
    "request", "requesting", "ask for", "pay me", "send me", "transfer me", "give me money",
    "collect", "bill", "maango", "mango", "maang", "maang lo", "mangwa", "mangwao", "mangwa do",
    "mangao", "mujhe bheje", "mujhe bhejo", "मांगो", "मांग", "मंगवाओ", "मंगवा",
    "اطلب", "طلب", "يحول لي", "يرسل لي", "تحول لي", "ترسل لي", "يدفع لي", "حولي لي",
    "a6lub", "atlub",
]]
# "I forgot my password / PIN / recovery phrase": always a recovery request.
_FORGOT = {clean(w) for w in ["forgot", "forget", "forgotten", "نسيت", "ناسي", "nseet", "naseet",
                              "nsit", "bhool", "bhul", "bhula", "भूल", "भूला", "भूली"]}
_SECRET = {clean(w) for w in ["password", "pin", "passcode", "seed", "phrase", "passphrase",
                              "key", "keys", "كلمه", "السر", "سر", "الرقم", "الباسورد", "باسورد",
                              "رمز", "الرمز", "كود", "العبارة", "المفتاح", "مفتاح", "पासवर्ड",
                              "पिन", "चाबी", "wallet", "محفظتي", "المحفظه", "वॉलेट"]}
# Verbs that mean "pay out" (to a scanned code or a copied address).
_PAY_VERBS = {clean(w) for w in ["pay", "send", "transfer", "ادفع", "وادفع", "حول", "وحول", "ارسل",
                                 "bhejo", "bhej", "pay karo", "भेजो", "भेज"]}
_MY = {clean(w) for w in ["my", "mine", "mera", "meri", "mere", "मेरा", "मेरी"]}

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
    unit_assumed: bool
    recipient: dict | None
    contact: str | None
    phone: str | None
    name: str | None
    source: str | None
    similar_contacts: list[str]
    tx_ref: dict | None
    lang_mix: list[str]
    normalized_text: str
    readback: dict = field(default_factory=dict)
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
            elif t.text in _ARABIZI:
                lang = "ar"
            elif t.text in _ENGLISH:
                lang = "en"
        if lang:
            # English loanwords are normal inside Hinglish and Arabizi ("cancel karo"),
            # so one Hinglish/Arabizi word outweighs one English word.
            w = 1.5 if t.script == "latin" and lang != "en" else 1.0
            counts[lang] = counts.get(lang, 0) + w
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


def _has_request_cue(tokens: list[Token]) -> bool:
    texts = [t.text for t in tokens]
    for seq in _REQUEST_CUES:
        n = len(seq)
        if any(tuple(texts[i:i + n]) == seq for i in range(len(texts) - n + 1)):
            return True
    # "ask <name> for ..." with a name in between
    if "ask" in texts and "for" in texts and texts.index("ask") < len(texts) - 1 - texts[::-1].index("for"):
        return True
    return False


def _has_seq(tokens: list[Token], seq: tuple[str, ...]) -> bool:
    texts = [t.text for t in tokens]
    n = len(seq)
    return any(tuple(texts[i:i + n]) == seq for i in range(len(texts) - n + 1))


def _move(probs: dict[str, float], to: str, frm: tuple[str, ...], keep: float = 0.0
          ) -> dict[str, float]:
    """Move the probability mass of ``frm`` onto ``to``."""
    probs = dict(probs)
    for k in frm:
        if k in probs and k != to:
            probs[to] += probs[k] * (1 - keep)
            probs[k] *= keep
    return probs


def _guards(probs: dict[str, float], tokens: list[Token], recipient: Recipient | None
            ) -> dict[str, float]:
    """Deterministic corrections on top of the model, for cases where a rule is certain."""
    texts = {t.text for t in tokens}
    top = max(probs, key=probs.get)
    # "I forgot my password / PIN / seed phrase" -> recovery, never "unknown".
    if texts & _FORGOT and texts & _SECRET and top in ("unknown", "check_balance", "receive"):
        probs = _move(probs, "recovery_help", ("unknown", "check_balance", "receive"))
    # "Pay the QR code" / "send to the address I copied": paying out to a scanned
    # code is a send (it still asks for the amount and the fingerprint).
    # "Show MY QR so someone can pay me" stays receive (request cue / "my").
    if (recipient and recipient.type in ("qr", "clipboard") and top == "receive"
            and texts & _PAY_VERBS and not texts & _MY and not _has_request_cue(tokens)):
        probs = _move(probs, "send", ("receive",))
    return probs


def parse(text: str, contacts: list[str] | None = None, model="auto",
          reply_lang: str | None = None, default_unit: str | None = None) -> ParseResult:
    """Parse one command. ``model``: "auto" (trained model if present), None (rules),
    or an IntentModel instance (used by the evaluation). ``default_unit``: the
    wallet's currency, used (and read back) when a send names no currency;
    without it the parser asks."""
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
        if max(probs, key=probs.get) == "send" and _has_request_cue(tokens):
            probs = dict(probs)
            probs["receive"], probs["send"] = probs["receive"] + probs["send"], 0.0
        if tx_hash and max(probs, key=probs.get) not in ("history", "tx_status"):
            # A pasted 66-char hash can only be a transaction lookup.
            probs = {k: (0.95 if k == "tx_status" else v * 0.05) for k, v in probs.items()}
        probs = _guards(probs, tokens, recipient)
        ranked = sorted(probs.items(), key=lambda kv: -kv[1])
        top, conf = ranked[0]
    else:
        probs = softmax(scores)
        ranked = sorted(probs.items(), key=lambda kv: -kv[1])
        top, conf = ranked[0]
        if max(scores.values()) <= 0:
            top, conf = "unknown", 0.0

    unit = amount_span.unit if amount_span else None
    unit_assumed = False
    if top == "send" and amount_span and unit is None and default_unit:
        unit, unit_assumed = default_unit, True
    missing: list[str] = []
    if top == "send":
        if amount_span is None:
            missing.append("amount")
        elif unit is None:
            missing.append("unit")  # "send 10 to Amma": ten dirhams? ten ETH? ask.
        if recipient is None:
            missing.append("recipient")
    if top == "receive" and recipient and recipient.type in ("qr", "clipboard", "self"):
        # Receiving shows the user's own code; "from the scanned code" is meaningless.
        recipient = None

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

    result = ParseResult(
        intent=top,
        confidence=round(conf, 3),
        needs_clarification=needs,
        clarification=clarification,
        alternatives=[{"intent": k, "score": round(v, 3)} for k, v in ranked[1:3] if k != top],
        amount=amount_span.value if amount_span else None,
        unit=unit,
        unit_assumed=unit_assumed,
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
    result.readback = build_readback(result, reply_lang)
    return result


__all__ = ["parse", "ParseResult", "INTENTS", "CONFIDENCE_THRESHOLD"]
