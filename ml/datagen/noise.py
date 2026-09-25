"""Augmentations that imitate how real input drifts from the clean form.

- Arabic script -> Arabizi ("حول" -> "7awel")
- spelling by ear / speech-to-text drift (vowels, doubled letters, ph/f ...)
- Arabic orthographic confusions (أ/ا/إ, ة/ه, ى/ي, ذ/ز ...)
- SMS-style Hinglish ("nahi" -> "nhi", "karo" -> "kro")
- code-switching: swapping Arabic/Hindi words for English equivalents
- filler words, punctuation, casing
"""

from __future__ import annotations

import random
import re

_AR_TO_ARABIZI = {
    "ا": ["a"], "أ": ["a", "2a"], "إ": ["e", "i"], "آ": ["a", "2a"], "ب": ["b"], "ت": ["t"],
    "ث": ["th", "s"], "ج": ["j", "g"], "ح": ["7", "h"], "خ": ["5", "kh", "7'"], "د": ["d"],
    "ذ": ["th", "dh", "z"], "ر": ["r"], "ز": ["z"], "س": ["s"], "ش": ["sh", "ch"],
    "ص": ["9", "s"], "ض": ["d", "9'", "dh"], "ط": ["6", "t"], "ظ": ["th", "z", "6'"],
    "ع": ["3", "a", "'"], "غ": ["gh", "3'"], "ف": ["f"], "ق": ["9", "q", "g", "8"], "ك": ["k"],
    "ل": ["l"], "م": ["m"], "ن": ["n"], "ه": ["h"], "ة": ["a", "ah", "e"], "و": ["w", "o", "u", "oo"],
    "ي": ["y", "i", "ee", "e"], "ى": ["a", "y"], "ء": ["2", ""], "ئ": ["2", "e"], "ؤ": ["2", "o"],
    "ـ": [""],
}
_AR_LETTERS = set(_AR_TO_ARABIZI)
_VOWEL_LIKE = set("aeiou7329")


def arabic_to_arabizi(text: str, rng: random.Random) -> str:
    """Rough but varied Arabizi: consonant map plus guessed short vowels."""
    out_words = []
    for word in text.split():
        if not any(ch in _AR_LETTERS for ch in word):
            out_words.append(word)
            continue
        pieces: list[str] = []
        for i, ch in enumerate(word):
            if ch not in _AR_TO_ARABIZI:
                pieces.append(ch)
                continue
            p = rng.choice(_AR_TO_ARABIZI[ch])
            # Short vowels are not written in Arabic script: guess one between
            # two consonants most of the time.
            if pieces and p and pieces[-1] and pieces[-1][-1] not in _VOWEL_LIKE and \
                    p[0] not in "aeiouwy" and rng.random() < 0.6:
                pieces.append(rng.choice("aaaeei"))
            pieces.append(p)
        w = "".join(pieces)
        # "al-" handling: "الرصيد" -> "el raseed" / "al raseed" / "elraseed"
        if w.startswith(("al", "el")) and word.startswith("ال") and rng.random() < 0.5:
            w = rng.choice(["el ", "al ", "l "]) + w[2:]
        out_words.append(w)
    return " ".join(out_words)


# --- spelling by ear -----------------------------------------------------------

_LATIN_SWAPS = [
    ("ee", "i"), ("i", "ee"), ("oo", "u"), ("u", "oo"), ("ph", "f"), ("f", "ph"), ("ck", "k"),
    ("c", "k"), ("k", "c"), ("s", "z"), ("w", "v"), ("v", "w"), ("th", "t"), ("a", "e"),
    ("e", "a"), ("ou", "u"), ("y", "i"), ("q", "k"), ("x", "ks"), ("aa", "a"), ("a", "aa"),
]
_AR_SWAPS = [
    ("ا", "أ"), ("أ", "ا"), ("إ", "ا"), ("ا", "إ"), ("ة", "ه"), ("ه", "ة"), ("ي", "ى"),
    ("ى", "ي"), ("ذ", "ز"), ("ز", "ذ"), ("ظ", "ض"), ("ض", "ظ"), ("ث", "س"), ("ق", "ك"),
    ("ط", "ت"), ("ت", "ط"), ("ص", "س"), ("ح", "ه"),
]
_HINGLISH_SMS = [
    ("nahi", "nhi"), ("nahi", "nai"), ("karo", "kro"), ("karo", "kr do"), ("hai", "h"),
    ("hai", "he"), ("kya", "kia"), ("kya", "kyaa"), ("mera", "mra"), ("mere", "mre"),
    ("bhejo", "bejo"), ("bhejo", "bhejdo"), ("paise", "pese"), ("paise", "paisa"),
    ("kitna", "ktna"), ("kitne", "kitne"), ("phone", "fone"), ("please", "plz"),
    ("please", "pls"), ("transfer", "trnsfer"), ("balance", "balence"), ("balance", "blnc"),
]
_EN_SMS = [
    ("please", "pls"), ("please", "plz"), ("you", "u"), ("are", "r"), ("balance", "balence"),
    ("balance", "ballance"), ("transfer", "transfar"), ("money", "mony"), ("what's", "whats"),
    ("what is", "wats"), ("my", "ma"), ("send", "snd"), ("to", "2"), ("cancel", "cancle"),
    ("address", "adress"), ("phone", "fone"), ("transaction", "transction"),
]

# Arabic/Hindi word -> English word, for code-switching augmentation.
_SWITCH = {
    "رصيدي": ["balance حقي", "الbalance"], "الرصيد": ["الbalance", "balance"],
    "حول": ["transfer", "send"], "ارسل": ["send"], "فلوس": ["money", "cash"],
    "الفلوس": ["الmoney", "الcash"], "تلفوني": ["الphone حقي", "phone"],
    "جوالي": ["الmobile", "phone"], "عنواني": ["الaddress حقي"], "التحويل": ["الtransfer"],
    "العمليات": ["الtransactions"], "الغي": ["cancel"], "محفظتي": ["الwallet حقي"],
    "paise": ["money"], "bhejo": ["send karo", "transfer karo"], "phone": ["mobile"],
    "khoya": ["lost"], "pichla": ["last"], "dikhao": ["show karo"],
}

_FILLERS = {
    "ar": ["يعني", "طيب", "لو سمحت", "بس", "اه", "ممكن", "يا ريت"],
    "arabizi": ["ya3ni", "6ayeb", "law sama7t", "bas", "please"],
    "en": ["um", "uh", "please", "hey", "ok so", "can you", "quickly"],
    "hi": ["yaar", "bhai", "please", "zara", "jaldi", "achha"],
    "deva": ["यार", "भाई", "ज़रा", "प्लीज़"],
}


def _apply_swaps(word: str, swaps, rng: random.Random) -> str:
    cands = [(a, b) for a, b in swaps if a in word]
    if not cands:
        return word
    a, b = rng.choice(cands)
    idx = [m.start() for m in re.finditer(re.escape(a), word)]
    i = rng.choice(idx)
    return word[:i] + b + word[i + len(a):]


def spelling_noise(text: str, lang: str, rng: random.Random, n_ops: int) -> str:
    words = text.split()
    if not words:
        return text
    for _ in range(n_ops):
        k = rng.randrange(len(words))
        w = words[k]
        if re.fullmatch(r"[\d.,]+", w):
            continue
        r = rng.random()
        if re.search(r"[؀-ۿ]", w):
            if r < 0.7:
                w = _apply_swaps(w, _AR_SWAPS, rng)
            elif len(w) > 3:
                i = rng.randrange(1, len(w) - 1)  # drop/duplicate a letter
                w = w[:i] + w[i + 1:] if rng.random() < 0.5 else w[:i] + w[i] + w[i:]
        elif re.search(r"[a-z]", w, re.I):
            if r < 0.45:
                w = _apply_swaps(w, _LATIN_SWAPS, rng)
            elif r < 0.65 and len(w) > 3:
                vowels = [i for i, c in enumerate(w) if c in "aeiou" and i > 0]
                if vowels:
                    i = rng.choice(vowels)
                    w = w[:i] + w[i + 1:]
            elif r < 0.8 and len(w) > 3:
                i = rng.randrange(1, len(w) - 1)
                w = w[:i] + w[i] + w[i:]
            elif len(w) > 3:
                i = rng.randrange(0, len(w) - 1)
                w = w[:i] + w[i + 1] + w[i] + w[i + 2:]
        words[k] = w
    out = " ".join(words)
    sms = _HINGLISH_SMS if lang == "hi" else _EN_SMS if lang == "en" else []
    if sms and rng.random() < 0.5:
        a, b = rng.choice(sms)
        out = re.sub(rf"\b{re.escape(a)}\b", b, out, count=1)
    return out


def code_switch(text: str, rng: random.Random) -> str:
    words = text.split()
    idx = [i for i, w in enumerate(words) if w in _SWITCH]
    if not idx:
        return text
    i = rng.choice(idx)
    words[i] = rng.choice(_SWITCH[words[i]])
    return " ".join(words)


def surface(text: str, lang: str, rng: random.Random) -> str:
    """Fillers, punctuation and casing."""
    if rng.random() < 0.25:
        f = rng.choice(_FILLERS.get(lang, _FILLERS["en"]))
        text = f"{f} {text}" if rng.random() < 0.6 else f"{text} {f}"
    r = rng.random()
    if r < 0.15:
        text += rng.choice(["?", "؟", "!", ".", "..."]) if lang == "ar" else rng.choice(["?", "!", ".", "..."])
    if re.search(r"[a-z]", text) and rng.random() < 0.15:
        text = text.capitalize() if rng.random() < 0.7 else text.upper()
    return text
