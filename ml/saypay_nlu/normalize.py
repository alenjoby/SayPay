"""Text normalization for code-mixed Arabic / English / Hindi input.

Speech-to-text and typed input arrive in three scripts (Arabic, Latin,
Devanagari) plus Arabizi (Arabic written in Latin letters with digits,
e.g. "7awel"). Everything downstream works on the token list produced here.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

# --- Arabic -----------------------------------------------------------------

_AR_DIACRITICS = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭ]")
_AR_TATWEEL = "ـ"
_AR_CHAR_MAP = str.maketrans(
    {
        "أ": "ا",
        "إ": "ا",
        "آ": "ا",
        "ٱ": "ا",
        "ى": "ي",
        "ة": "ه",
        "ؤ": "و",
        "ئ": "ي",
        "ک": "ك",
        "ی": "ي",
        "گ": "ك",
        "٫": ".",  # Arabic decimal separator
        "٬": ",",  # Arabic thousands separator
        "،": ",",
        "؟": "?",
        "؛": ";",
    }
)

# Arabic-Indic (U+0660..) and Persian (U+06F0..) digits -> ASCII.
_DIGIT_MAP = str.maketrans(
    {**{chr(0x0660 + i): str(i) for i in range(10)}, **{chr(0x06F0 + i): str(i) for i in range(10)}}
)

# --- Devanagari --------------------------------------------------------------

_DEVA_DIGIT_MAP = str.maketrans({chr(0x0966 + i): str(i) for i in range(10)})
_DEVA_NUKTA = "़"
_DEVA_CANDRABINDU = "ँ"
_DEVA_ANUSVARA = "ं"

# --- Arabizi -------------------------------------------------------------------

# Digits used as letters in Arabizi, mapped to the closest Latin sound so the
# Latin lexicon ("hawel", "raseed") and phonetic keys can match them.
_ARABIZI_MAP = {"2": "a", "3": "a", "5": "kh", "6": "t", "7": "h", "8": "gh", "9": "q"}
_ARABIZI_TOKEN = re.compile(r"^(?=.*[a-z])(?=.*[235679])[a-z235679']+$")

# Suffixes that may be glued to a number and still mean "amount + unit".
GLUE_SUFFIXES = {
    "eth", "ether", "aed", "sar", "usd", "inr", "kwd", "qar", "bhd", "omr",
    "dh", "rs", "k", "dollar", "dollars", "dirham", "dirhams", "riyal", "riyals",
    "rupee", "rupees",
}

# A number glued to a unit/suffix: "5eth", "0.1eth", "500aed", "5k".
_NUM_GLUED = re.compile(r"^(\d+(?:[.,]\d+)?)([a-z]+)$")

ARABIC_RE = re.compile(r"[؀-ۿݐ-ݿ]")
DEVANAGARI_RE = re.compile(r"[ऀ-ॿ]")
LATIN_RE = re.compile(r"[a-z]")

_ADDRESS_RE = re.compile(r"0x[0-9a-f]{40,64}")


@dataclass(frozen=True)
class Token:
    text: str  # normalized form used for matching
    raw: str  # form as it appeared (after case folding)
    script: str  # "ar", "latin", "deva", "num", "arabizi", "addr", "sym"


def normalize_arabic(text: str) -> str:
    text = _AR_DIACRITICS.sub("", text)
    text = text.replace(_AR_TATWEEL, "")
    return text.translate(_AR_CHAR_MAP)


def normalize_devanagari(text: str) -> str:
    text = text.replace(_DEVA_NUKTA, "").replace(_DEVA_CANDRABINDU, _DEVA_ANUSVARA)
    return text.translate(_DEVA_DIGIT_MAP)


def arabizi_to_latin(token: str) -> str:
    out = []
    for ch in token:
        out.append(_ARABIZI_MAP.get(ch, ch))
    return "".join(out).replace("'", "")


def _script_of(ch: str) -> str:
    if ARABIC_RE.match(ch):
        return "ar"
    if DEVANAGARI_RE.match(ch):
        return "deva"
    if ch.isdigit():
        return "num"
    if ch.isalpha():
        return "latin"
    return "sym"


def _split_script_boundaries(text: str) -> str:
    """Insert spaces where Arabic/Devanagari touches Latin letters or digits.

    "الbalance" -> "ال balance", "ل5" -> "ل 5". Latin+digit runs are kept
    together because they are Arabizi ("7awel") or amounts ("5eth").
    """
    out: list[str] = []
    prev = ""
    for ch in text:
        cur = _script_of(ch)
        if prev and cur != prev and cur != "sym" and prev != "sym":
            pair = {prev, cur}
            if pair & {"ar", "deva"}:
                out.append(" ")
        out.append(ch)
        if cur != "sym":
            prev = cur
        else:
            prev = ""
    return "".join(out)


def clean(text: str) -> str:
    """Unicode/script-level cleanup, returns a single normalized string."""
    text = unicodedata.normalize("NFKC", text)
    text = text.translate(_DIGIT_MAP)
    text = normalize_arabic(text)
    text = normalize_devanagari(text)
    text = text.casefold()
    # Standalone Arabic definite article with a kashida/hyphen before an
    # English word: "الـ balance" / "ال-balance".
    text = re.sub(r"ال[-_]\s*(?=[a-z])", "ال ", text)
    # Hyphenated suffixes common in transliteration: "amma-kku", "rahul-ko".
    text = re.sub(r"(?<=[a-z])-(?=[a-z])", " ", text)
    text = _split_script_boundaries(text)
    # Thousands separators inside numbers: 1,000 -> 1000 (but keep decimals).
    text = re.sub(r"(?<=\d),(?=\d{3}\b)", "", text)
    # Decimal comma "0,5" -> "0.5".
    text = re.sub(r"(?<=\d),(?=\d)", ".", text)
    return text


_TOKEN_RE = re.compile(
    r"0x[0-9a-f]+"  # hex addresses / hashes
    r"|[+]?\d+(?:\.\d+)?[a-z]*"  # numbers, optionally glued to a unit ("5eth")
    r"|\.\d+"  # ".5"
    r"|@[\w.-]+"  # handles
    r"|[\w\u0600-\u06FF\u0900-\u097F'.]+"  # words (incl. ENS names like ahmed.eth)
    r"|[$₹€£]",
    re.UNICODE,
)


def tokenize(text: str) -> list[Token]:
    """Normalize ``text`` and split it into tokens."""
    cleaned = clean(text)
    tokens: list[Token] = []
    for m in _TOKEN_RE.finditer(cleaned):
        raw = m.group(0).strip(".'")
        if not raw:
            continue
        if raw in "$₹€£":
            tokens.append(Token(raw, raw, "sym"))
            continue
        if _ADDRESS_RE.fullmatch(raw) or re.fullmatch(r"0x[0-9a-f]+", raw):
            tokens.append(Token(raw, raw, "addr"))
            continue
        glued = _NUM_GLUED.match(raw)
        if glued and (glued.group(2) in GLUE_SUFFIXES or raw[0] not in _ARABIZI_MAP):
            # "5eth" -> "5", "eth". A tail that is not a known suffix after an
            # Arabizi digit ("3ndi", "7awel") is Arabizi, handled below.
            tokens.append(Token(glued.group(1), glued.group(1), "num"))
            tokens.append(Token(glued.group(2), glued.group(2), "latin"))
            continue
        if re.fullmatch(r"[+]?\d+(?:\.\d+)?|\.\d+", raw):
            tokens.append(Token(raw, raw, "num"))
            continue
        if ARABIC_RE.search(raw):
            tokens.append(Token(raw, raw, "ar"))
            continue
        if DEVANAGARI_RE.search(raw):
            tokens.append(Token(raw, raw, "deva"))
            continue
        if _ARABIZI_TOKEN.match(raw) and not raw.endswith(".eth"):
            tokens.append(Token(arabizi_to_latin(raw), raw, "arabizi"))
            continue
        tokens.append(Token(raw.replace("'", ""), raw, "latin"))
    return tokens


def normalized_text(tokens: list[Token]) -> str:
    return " ".join(t.text for t in tokens)
