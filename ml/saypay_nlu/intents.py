"""Rule-based intent scoring (v1).

Each intent has weighted keywords and phrases in Arabic (script + Arabizi),
English and Hindi (Latin + Devanagari). Scores become probabilities with a
softmax, so the confidence gate (0.8) behaves the same way it will for the
trained model later.
"""

from __future__ import annotations

import math

from rapidfuzz import fuzz

from .lexicon import ar_variants
from .normalize import Token, clean

INTENTS = ["check_balance", "send", "history", "tx_status", "receive", "add_contact",
           "recovery_help", "cancel"]

# weight: 3 = decisive on its own, 2 = strong hint, 1 = weak hint
_RAW: dict[str, dict[float, list[str]]] = {
    "check_balance": {
        3: ["balance", "balanse", "ballance", "bal", "بالانس", "بيلانس", "رصيد", "رصيدي",
            "raseed", "rasid", "raseedi", "rasidi", "rasedi", "बैलेंस", "बेलेंस", "बकाया",
            "how much do i have", "how much money do i have", "how much is in my wallet",
            "كم عندي", "كم معي", "كم فلوسي", "kam aindi", "kam andi", "kam endi",
            "kitna paisa hai", "kitne paise hai", "कितना पैसा", "कितने पैसे"],
        2: ["funds", "فلوسي", "baaki", "baki", "باقي", "how much left", "paise kitne"],
        1: ["left", "kitna", "कितना", "how much", "wallet"],
    },
    "send": {
        3: ["send", "pay", "bhejo", "bhej", "bhejna", "bhejdo", "bhejiye", "bhej do", "भेजो",
            "भेज", "भेजना", "भेज दो", "भेजिए", "حول", "احول", "حولي", "حوله", "ارسل", "ارسلي",
            "ابعث", "ابعت", "ابعثي", "ابعتي", "دز", "ادز", "دزي", "ادفع", "hawel", "hawil",
            "haweli", "arsel", "ersel", "arsil", "abaath", "abaat", "pay karo", "transfer karo",
            "de do", "dedo", "दे दो"],
        2.5: ["transfer", "wire"],
        2: ["تحويل", "دفع", "give", "اعطي", "عط", "اعط", "ادي", "دفعه"],
    },
    "history": {
        3: ["history", "transactions", "transaction history", "statement", "عمليات", "معاملات",
            "حركات", "كشف حساب", "تحويلات", "len den", "lenden", "लेन देन", "लेनदेन", "हिस्ट्री",
            "transaction list", "past transactions", "recent transactions", "سجل العمليات",
            "سجل التحويلات"],
        2: ["transaction", "عمليه", "معامله", "حركه", "سجل", "recent", "past", "payments",
            "ट्रांजेक्शन", "ट्रांजैक्शन", "transactions dikhao"],
        1: ["last", "اخر", "pichla", "pichhla", "pichli", "pichle", "पिछला", "पिछली",
            "आखिरी", "list", "previous"],
        0.5: ["show", "dikhao", "عرض", "وريني"],
    },
    "tx_status": {
        3: ["status", "pending", "go through", "went through", "gone through", "did it arrive",
            "has it arrived", "did it reach", "وصلت", "وصل", "انرسلت", "راحت", "حاله التحويل",
            "حاله", "pahuncha", "pahunchi", "pahunch", "पहुंचा", "पहुंची", "पहुंच", "stuck",
            "is it done", "confirmed yet", "واصله", "gaya kya", "पहुंचा क्या"],
        2: ["confirmed", "arrived", "reached", "تمت", "hua kya", "successful", "failed",
            "processing", "نجحت", "فشلت", "ناجحه", "हुआ क्या", "हो गया क्या"],
        1: ["complete", "completed", "done", "خلصت"],
    },
    "receive": {
        3: ["my address", "wallet address", "my qr", "request money", "get paid", "receive",
            "عنواني", "عنوان محفظتي", "استقبل", "استلم", "اطلب فلوس", "mera address",
            "मेरा पता", "मेरा एड्रेस", "share my address", "شارك عنواني", "my wallet address",
            "payment request", "mangwana", "mangwao"],
        2: ["request", "عنوان", "اطلب", "qr code", "एड्रेस", "पता", "manga"],
        1.5: ["share", "شارك"],
        1: ["محفظتي", "my wallet", "address"],
    },
    "add_contact": {
        3: ["contact", "contacts", "add contact", "new contact", "save", "save karo",
            "add karo", "ضيف", "اضف", "احفظ", "كونتاكت", "جهات الاتصال", "save as", "باسم",
            "सेव", "कॉन्टैक्ट", "संपर्क", "jodo", "जोड़ो", "जोडो", "naam se"],
        2: ["add", "اضافه", "جهات", "اسمه", "सेव करो"],
        1.5: ["سجل"],
        1: ["اتصال", "naam", "नाम"],
    },
    "recovery_help": {
        3: ["lost", "stolen", "recover", "recovery", "restore", "locked out", "cant access",
            "lost my phone", "new phone", "new device", "ضاع", "ضايع", "ضيعت", "فقدت", "انسرق",
            "سرق", "انسرقت", "استرجاع", "استرداد", "استعاده", "جوال جديد", "تلفون جديد",
            "جهاز جديد", "kho gaya", "khoya", "kho gya", "chori", "gum ho gaya", "naya phone",
            "खो गया", "खोया", "चोरी", "रिकवरी", "नया फोन", "daa3", "dayya3"],
        2: ["kho", "खो", "guardian", "guardians", "حارس", "الاوصياء", "access"],
    },
    # Phrases that contain intent words but carry no intent themselves; they
    # consume the tokens so "give me my address" is not scored as send.
    "_neutral": {
        0: ["give me", "عطني", "اعطني", "عطيني", "mujhe do", "mujhe de", "मुझे दो", "tell me",
            "i want", "ابي", "ابغي"],
    },
    "cancel": {
        3: ["cancel", "never mind", "nevermind", "abort", "forget it", "الغاء", "الغي", "كنسل",
            "بلاش", "rehne do", "rehne", "cancel karo", "रहने दो", "रहने", "रद्द", "कैंसल",
            "mat bhejo", "don't send", "dont send", "لا ترسل", "لا تحول", "stop"],
        2.5: ["وقف", "ruko", "रुको", "hold on"],
        2: ["nope", "خلاص", "wait", "انتظر", "undo"],
        1.5: ["no", "لا", "nahi", "nahin", "नहीं", "ماابي", "mat"],
    },
}

# Negation words: when one sits right before an action verb, the action is
# being cancelled ("don't send", "لا ترسل", "mat bhejo").
_NEGATIONS = {clean(w) for w in ["dont", "don't", "do not", "not", "لا", "ما", "مو", "mat",
                                 "na", "nahi", "मत", "ना"]}


def _build() -> tuple[dict[str, list[tuple[str, float]]], dict[str, list[tuple[tuple[str, ...], float]]]]:
    words: dict[str, list[tuple[str, float]]] = {}
    phrases: dict[str, list[tuple[tuple[str, ...], float]]] = {}
    for intent, groups in _RAW.items():
        for weight, items in groups.items():
            for item in items:
                norm = clean(item).replace("'", "").split()
                if len(norm) == 1:
                    words.setdefault(norm[0], []).append((intent, weight))
                elif norm:
                    phrases.setdefault(intent, []).append((tuple(norm), weight))
    return words, phrases


WORDS, PHRASES = _build()
_LATIN_KEYWORDS = [w for w in WORDS if w.isascii() and len(w) >= 5]


def _forms(tok: Token) -> list[str]:
    if tok.script == "ar":
        forms = ar_variants(tok.text)
        # Pronoun suffixes: رصيدي -> رصيد, احفظه -> احفظ
        for f in list(forms):
            for suf in ("ها", "هم", "كم", "نا", "ني", "ي", "ه", "ك"):
                if f.endswith(suf) and len(f) - len(suf) >= 2:
                    forms.append(f[: -len(suf)])
        return forms
    return [tok.text]


def keyword_hits(tokens: list[Token]) -> tuple[dict[str, float], set[int]]:
    """Intent scores from keywords, and the token indices that were keywords."""
    scores = {i: 0.0 for i in INTENTS}
    scores["_neutral"] = 0.0
    used: set[int] = set()
    texts = [t.text for t in tokens]
    forms = [_forms(t) for t in tokens]

    # Phrases first; their tokens are then not counted again as single words.
    for intent, plist in PHRASES.items():
        for phrase, weight in plist:
            n = len(phrase)
            for i in range(len(tokens) - n + 1):
                if all(phrase[k] in forms[i + k] for k in range(n)):
                    if any(i + k in used for k in range(n)) and weight < 3:
                        continue
                    scores[intent] += weight
                    used.update(range(i, i + n))
                    break

    for i, t in enumerate(tokens):
        if i in used or t.script in ("num", "addr", "sym"):
            continue
        hits: list[tuple[str, float]] = []
        for f in forms[i]:
            if f in WORDS:
                hits = WORDS[f]
                break
        if not hits and t.script in ("latin", "arabizi") and len(t.text) >= 5:
            # Spelling by ear: "ballence", "transfar"
            best, best_r = None, 0.0
            for kw in _LATIN_KEYWORDS:
                r = fuzz.ratio(t.text, kw)
                if r > best_r:
                    best, best_r = kw, r
            if best and best_r >= 85:
                hits = [(intent, w * 0.9) for intent, w in WORDS[best]]
        if hits:
            used.add(i)
        for intent, weight in hits:
            # Negated action -> cancel
            if intent in ("send", "add_contact") and i > 0 and texts[i - 1] in _NEGATIONS:
                scores["cancel"] += weight
                continue
            scores[intent] += weight
    scores.pop("_neutral")
    return scores, used


def softmax(scores: dict[str, float], temperature: float = 1.2) -> dict[str, float]:
    m = max(scores.values())
    exps = {k: math.exp((v - m) * temperature) for k, v in scores.items()}
    z = sum(exps.values())
    return {k: v / z for k, v in exps.items()}
