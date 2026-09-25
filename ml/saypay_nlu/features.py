"""Text views and dense features for the intent model.

Three views of the same command, so different scripts and spellings share
features:
  norm     normalized tokens with slots masked:  "حول <num> <unit> <name>"
  latin    every token transliterated to Latin:   "hul <num> <unit> <name>"
  phon     consonant skeletons:                    "hl <num> <unit> <name>"
Arabic "حول", Arabizi "7awel" and Latin "hawel" meet in the phon view; the
char n-grams of the norm view absorb spelling-by-ear.

Slots are masked so the model learns the shape of a command, not which
names or amounts appeared in training.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .intents import INTENTS, keyword_hits
from .normalize import tokenize
from .numbers import extract_numbers, unit_of
from .phonetic import phonetic_key, to_latin
from .recipients import ContactIndex, find_address, find_ens, find_keyword_recipient

LABELS = INTENTS + ["unknown"]
_PLACEHOLDER = {"<num>", "<phone>", "<unit>", "<addr>", "<ens>", "<name>"}


@dataclass
class Views:
    norm: str
    latin: str
    phon: str
    dense: np.ndarray


def make_views(text: str, contacts: list[str] | None = None) -> Views:
    tokens = tokenize(text)
    scores, kw_idx = keyword_hits(tokens)
    spans = extract_numbers(tokens)
    masked: list[str | None] = [t.text for t in tokens]

    has_amount = has_phone = False
    for s in spans:
        tag = "<phone>" if s.kind == "phone" else "<num>"
        has_amount |= s.kind == "amount"
        has_phone |= s.kind == "phone"
        masked[s.start] = tag
        for k in range(s.start + 1, s.end):
            masked[k] = None
    has_unit = False
    for i, t in enumerate(tokens):
        if masked[i] and masked[i] not in _PLACEHOLDER and unit_of(t):
            masked[i] = "<unit>"
            has_unit = True
        elif t.script == "addr":
            masked[i] = "<addr>"
    ens = find_ens(tokens)
    if ens and ens.span:
        masked[ens.span[0]] = "<ens>"
        for k in range(ens.span[0] + 1, ens.span[1]):
            masked[k] = None
    reserved = set(kw_idx) | {i for i, m in enumerate(masked) if m is None or m in _PLACEHOLDER}
    contact = ContactIndex(contacts or []).match(tokens, reserved) if contacts else None
    if contact and contact.span:
        masked[contact.span[0]] = "<name>"
        for k in range(contact.span[0] + 1, contact.span[1]):
            masked[k] = None
    special = find_address(tokens) or ens or find_keyword_recipient(tokens)

    words = [m for m in masked if m]
    latin = [w if w in _PLACEHOLDER else (to_latin(w) or w) for w in words]
    phon = [w if w in _PLACEHOLDER else (phonetic_key(w) or w) for w in words]

    dense = np.array(
        [scores[i] / 3.0 for i in INTENTS]
        + [float(has_amount), float(has_unit), float(has_phone), float(contact is not None),
           float(special is not None), min(len(tokens), 20) / 20.0,
           float(max(scores.values()) <= 0)],
        dtype=np.float32,
    )
    return Views(" ".join(words), " ".join(latin), " ".join(phon), dense)


N_DENSE = len(INTENTS) + 7
