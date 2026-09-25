"""Refer to a transaction by description instead of by its 66-char hash.

"my last transfer to Ahmed", "آخر تحويل لأمي أمس", "kal Rahul ko jo bheja"
-> {"ordinal": "last", "when": "yesterday", "direction": "sent", "contact": ...}
The app resolves this against its local transaction list.
"""

from __future__ import annotations

from .lexicon import ar_variants
from .normalize import Token, clean


def _index(groups: dict[str, list[str]]) -> dict[str, str]:
    return {clean(w): key for key, words in groups.items() for w in words}


_ORDINAL = _index({
    "last": ["last", "latest", "recent", "most recent", "اخر", "الاخير", "الاخيره", "pichla",
             "pichhla", "pichli", "pichle", "aakhri", "akhri", "पिछला", "पिछली", "आखिरी"],
    "first": ["first", "اول", "pehla", "pehli", "पहला", "पहली"],
    "previous": ["previous", "before", "السابق", "السابقه", "قبل"],
})
_WHEN = _index({
    "today": ["today", "اليوم", "aaj", "आज"],
    "yesterday": ["yesterday", "امس", "البارحه", "مبارح", "kal", "कल"],
    "this_morning": ["morning", "الصبح", "الصباح", "subah", "सुबह"],
    "this_week": ["week", "الاسبوع", "hafte", "hafta", "हफ्ते"],
    "this_month": ["month", "الشهر", "mahina", "mahine", "महीने"],
})
_DIRECTION = _index({
    "sent": ["sent", "paid", "transferred", "ارسلت", "حولت", "دفعت", "دزيت", "bheja", "bheje",
             "भेजा", "भेजे", "diya", "दिया"],
    "received": ["received", "got", "incoming", "وصلني", "استلمت", "جاني", "اجاني", "mila",
                 "aaya", "मिला", "आया"],
})


def extract_tx_ref(tokens: list[Token]) -> dict:
    ref: dict = {}
    for t in tokens:
        forms = ar_variants(t.text) if t.script == "ar" else [t.text]
        for f in forms:
            if "ordinal" not in ref and f in _ORDINAL:
                ref["ordinal"] = _ORDINAL[f]
            if "when" not in ref and f in _WHEN:
                ref["when"] = _WHEN[f]
            if "direction" not in ref and f in _DIRECTION:
                ref["direction"] = _DIRECTION[f]
    return ref
