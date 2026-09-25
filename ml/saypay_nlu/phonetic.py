"""Cross-script transliteration and phonetic keys.

Used to match names that arrive in different scripts/spellings:
"Ahmed" / "Ahmad" / "أحمد" / "अहमद" all reduce to the key "hmd".
"""

from __future__ import annotations

import re

from .normalize import ARABIC_RE, DEVANAGARI_RE, clean

# Arabic letter -> Latin. Long vowels/semivowels are handled separately so
# that و/ي act as consonants at the start of a word and as vowels elsewhere.
_AR_TO_LATIN = {
    "ا": "a", "ب": "b", "ت": "t", "ث": "t", "ج": "j", "ح": "h", "خ": "kh",
    "د": "d", "ذ": "d", "ر": "r", "ز": "z", "س": "s", "ش": "sh", "ص": "s",
    "ض": "d", "ط": "t", "ظ": "z", "ع": "a", "غ": "gh", "ف": "f", "ق": "q",
    "ك": "k", "ل": "l", "م": "m", "ن": "n", "ه": "h", "ء": "", "پ": "p",
    "چ": "ch", "ڤ": "v",
}

_DEVA_CONSONANTS = {
    "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n", "च": "ch", "छ": "chh",
    "ज": "j", "झ": "jh", "ञ": "n", "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh",
    "ण": "n", "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n", "प": "p",
    "फ": "ph", "ब": "b", "भ": "bh", "म": "m", "य": "y", "र": "r", "ल": "l",
    "व": "v", "श": "sh", "ष": "sh", "स": "s", "ह": "h", "ळ": "l",
}
_DEVA_VOWELS = {
    "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo", "ऋ": "ri",
    "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "ऑ": "o",
}
_DEVA_MATRAS = {
    "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri", "े": "e",
    "ै": "ai", "ो": "o", "ौ": "au", "ॉ": "o",
}
_DEVA_VIRAMA = "्"
_DEVA_ANUSVARA = "ं"
_DEVA_VISARGA = "ः"


def arabic_to_latin(word: str) -> str:
    out: list[str] = []
    for i, ch in enumerate(word):
        if ch in ("و", "ي"):
            if i == 0:
                out.append("w" if ch == "و" else "y")
            else:
                out.append("u" if ch == "و" else "i")
            continue
        out.append(_AR_TO_LATIN.get(ch, ch if ch.isascii() else ""))
    return "".join(out)


def devanagari_to_latin(word: str) -> str:
    out: list[str] = []
    chars = list(word)
    for i, ch in enumerate(chars):
        nxt = chars[i + 1] if i + 1 < len(chars) else ""
        if ch in _DEVA_CONSONANTS:
            out.append(_DEVA_CONSONANTS[ch])
            # Inherent "a" unless followed by a matra/virama, or word-final
            # (schwa deletion: "राहुल" -> "rahul", not "rahula").
            if nxt and nxt not in _DEVA_MATRAS and nxt != _DEVA_VIRAMA:
                out.append("a")
        elif ch in _DEVA_VOWELS:
            out.append(_DEVA_VOWELS[ch])
        elif ch in _DEVA_MATRAS:
            out.append(_DEVA_MATRAS[ch])
        elif ch == _DEVA_ANUSVARA:
            out.append("n")
        elif ch == _DEVA_VISARGA:
            out.append("h")
        elif ch.isascii():
            out.append(ch)
    return "".join(out)


def to_latin(text: str) -> str:
    """Transliterate any supported script to lowercase Latin letters."""
    text = clean(text)
    words = []
    for w in text.split():
        if ARABIC_RE.search(w):
            words.append(arabic_to_latin(w))
        elif DEVANAGARI_RE.search(w):
            words.append(devanagari_to_latin(w))
        else:
            words.append(w)
    return " ".join(words)


_DIGRAPHS = [
    ("chh", "c"), ("sch", "s"), ("kh", "k"), ("gh", "g"), ("sh", "s"), ("ch", "c"),
    ("th", "t"), ("dh", "d"), ("ph", "f"), ("bh", "b"), ("jh", "j"), ("ck", "k"),
    ("ou", "u"), ("ee", "i"), ("oo", "u"),
]
_LETTER_MAP = str.maketrans({"q": "k", "c": "k", "x": "k", "z": "j", "v": "w", "p": "b"})


def phonetic_key(text: str) -> str:
    """Consonant skeleton of a word or name, script-independent.

    Vowels are dropped (Arabic script rarely writes them, transliterations
    disagree on them), digraphs collapse, doubled letters collapse, and a
    trailing silent "h" is dropped ("Fatimah" == "Fatima" == "فاطمة").
    """
    s = to_latin(text)
    s = re.sub(r"[^a-z ]", "", s)
    keys = []
    for w in s.split():
        for a, b in _DIGRAPHS:
            w = w.replace(a, b)
        w = w.translate(_LETTER_MAP)
        head = w[0] if w and w[0] in "wy" else ""
        body = re.sub(r"[aeiouwy]", "", w[1:] if head else w)
        body = re.sub(r"(.)\1+", r"\1", head + body)
        if len(body) > 1 and body.endswith("h"):
            body = body[:-1]
        keys.append(body)
    return " ".join(k for k in keys if k)
