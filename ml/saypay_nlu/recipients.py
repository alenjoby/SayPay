"""Who the money goes to, without the user ever speaking an address.

Recipient types, in priority order:
  address   a pasted/typed 0x... address (40 hex chars)
  ens       "ahmed.eth", "ahmed dot eth"
  handle    "@ahmed"
  phone     "0501234567", "zero five zero ..." (looked up server side later)
  contact   a saved contact matched by name, across scripts and spellings
  clipboard "the address I copied"
  qr        "scan the code"
  self      "send to myself" (the app blocks this; users did it by mistake in
            the MetaMask study)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from rapidfuzz import fuzz

from .lexicon import FAMILY_ALIASES, STOPWORDS, ar_variants
from .normalize import Token, clean
from .phonetic import phonetic_key, to_latin

ADDRESS_RE = re.compile(r"^0x[0-9a-f]{40}$")
TX_HASH_RE = re.compile(r"^0x[0-9a-f]{64}$")
ENS_RE = re.compile(r"^[a-z0-9-]{3,}\.eth$")

_DOT = {"dot", "دوت", "نقطه", "डॉट"}
_ETH = {"eth", "ايث", "ايثير", "ايثر", "ईथ", "एथ"}

_CLIPBOARD = {clean(w) for w in ["copied", "clipboard", "pasted", "paste", "copy", "نسخت",
                                 "المنسوخ", "منسوخ", "نسخته", "كليببورد", "الحافظه", "कॉपी"]}
_QR = {clean(w) for w in ["qr", "scan", "scanner", "barcode", "باركود", "كيو", "امسح",
                          "مسح", "سكان", "اسكان", "स्कैन", "क्यूआर"]}
_SELF = {clean(w) for w in ["myself", "yourself", "self", "نفسي", "لنفسي", "حالي", "لحالي",
                            "khud", "apne", "खुद", "अपने"]}

_FAMILY_INDEX: dict[str, int] = {}
for _i, _group in enumerate(FAMILY_ALIASES):
    for _w in _group:
        _FAMILY_INDEX[clean(_w)] = _i

_STOP = {clean(w) for w in STOPWORDS}


@dataclass
class Recipient:
    type: str
    value: str | None = None
    contact: str | None = None
    score: float = 1.0
    span: tuple[int, int] | None = None

    def as_dict(self) -> dict:
        return {"type": self.type, "value": self.value, "contact": self.contact,
                "score": round(self.score, 3)}


@dataclass
class _Contact:
    name: str
    forms: set[str] = field(default_factory=set)  # normalized full-name forms
    latin: str = ""
    key: str = ""
    family: int | None = None


def _token_forms(tok: Token) -> list[str]:
    forms = [tok.text]
    if tok.script == "ar":
        forms = ar_variants(tok.text)
    elif tok.script in ("latin", "arabizi") and len(tok.text) > 3 and tok.text.endswith("s"):
        forms.append(tok.text[:-1])  # "ahmeds" (from "ahmed's")
    return forms


class ContactIndex:
    def __init__(self, names: list[str]):
        self.contacts: list[_Contact] = []
        for name in names:
            if not name or not name.strip():
                continue
            norm = clean(name).strip()
            c = _Contact(name=name.strip(), forms={norm}, latin=to_latin(name), key=phonetic_key(name))
            for w in norm.split():
                if w in _FAMILY_INDEX:
                    c.family = _FAMILY_INDEX[w]
            c.forms.add(c.latin)
            self.contacts.append(c)

    def _score(self, cand_forms: list[str], contact: _Contact) -> float:
        best = 0.0
        for f in cand_forms:
            if f in contact.forms:
                return 1.0
            if contact.family is not None and _FAMILY_INDEX.get(f) == contact.family:
                best = max(best, 0.97)
                continue
            latin = to_latin(f)
            key = phonetic_key(f)
            ratio = fuzz.ratio(latin, contact.latin) / 100
            if key and key == contact.key and len(key.replace(" ", "")) >= 2:
                best = max(best, 0.88 + 0.1 * ratio)
            elif len(contact.latin) >= 4 and ratio >= 0.85:
                best = max(best, 0.9 * ratio)
            elif key and contact.key and len(contact.key) >= 3:
                kr = fuzz.ratio(key, contact.key) / 100
                if kr >= 0.85 and ratio >= 0.7:
                    best = max(best, 0.8 * kr)
        return best

    def match(self, tokens: list[Token], reserved: set[int], threshold: float = 0.8
              ) -> Recipient | None:
        """Best contact mentioned in the token list (1-3 token spans)."""
        best: Recipient | None = None
        for n in (3, 2, 1):
            for i in range(len(tokens) - n + 1):
                idx = range(i, i + n)
                if any(k in reserved for k in idx):
                    continue
                span = tokens[i:i + n]
                if n == 1 and span[0].text in _STOP and span[0].text not in _FAMILY_INDEX:
                    continue
                if span[0].script in ("num", "addr", "sym"):
                    continue
                if n == 1:
                    forms = _token_forms(span[0])
                else:
                    rest = " ".join(t.text for t in span[1:])
                    forms = [f"{f} {rest}" for f in _token_forms(span[0])]
                for c in self.contacts:
                    s = self._score(forms, c)
                    # Multi-token spans must match a multi-word contact name.
                    if n > 1 and " " not in c.latin.strip():
                        continue
                    if s >= threshold and (best is None or s > best.score):
                        best = Recipient("contact", c.name, c.name, s, (i, i + n))
        return best

    def similar(self, name: str, threshold: float = 0.8) -> list[tuple[str, float]]:
        """Existing contacts that sound like ``name`` (duplicate check)."""
        forms = [clean(name).strip()]
        out = [(c.name, self._score(forms, c)) for c in self.contacts]
        return sorted([o for o in out if o[1] >= threshold], key=lambda o: -o[1])


def find_address(tokens: list[Token]) -> Recipient | None:
    for i, t in enumerate(tokens):
        if t.script == "addr" and ADDRESS_RE.match(t.text):
            return Recipient("address", t.text, span=(i, i + 1))
    return None


def find_tx_hash(tokens: list[Token]) -> str | None:
    for t in tokens:
        if t.script == "addr" and TX_HASH_RE.match(t.text):
            return t.text
    return None


def find_ens(tokens: list[Token]) -> Recipient | None:
    for i, t in enumerate(tokens):
        if ENS_RE.match(t.text):
            return Recipient("ens", t.text, span=(i, i + 1))
        if t.text.startswith("@") and len(t.text) > 2:
            return Recipient("handle", t.text[1:], span=(i, i + 1))
        # Spoken: "ahmed dot eth" / "احمد دوت ايث"
        if i + 2 < len(tokens) and tokens[i + 1].text in _DOT and tokens[i + 2].text in _ETH:
            name = re.sub(r"[^a-z0-9-]", "", to_latin(t.text))
            if len(name) >= 3:
                return Recipient("ens", f"{name}.eth", span=(i, i + 3))
    return None


def find_keyword_recipient(tokens: list[Token]) -> Recipient | None:
    for i, t in enumerate(tokens):
        forms = _token_forms(t)
        if any(f in _CLIPBOARD for f in forms):
            return Recipient("clipboard", span=(i, i + 1))
        if any(f in _QR for f in forms):
            return Recipient("qr", span=(i, i + 1))
    for i, t in enumerate(tokens):
        forms = _token_forms(t)
        if any(f in _SELF for f in forms):
            return Recipient("self", span=(i, i + 1))
        if t.text == "own" and i > 0 and tokens[i - 1].text == "my":
            return Recipient("self", span=(i - 1, i + 1))
    return None
