"""Rule-based extraction of amounts, units and phone numbers.

Amounts are never left to the model. Supports digits ("0.1", "1,000", "٥"),
English, Gulf/MSA Arabic and Hindi (Latin + Devanagari) number words,
decimals ("zero point one", "صفر فاصلة واحد"), halves/quarters and
multipliers ("5k", "paanch sau", "خمس آلاف").
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .lexicon import ar_variants
from .normalize import Token, clean

# Kinds: NUM (additive value), MULT (multiplier), POINT (decimal separator),
# FRAC (added fraction: "and a half"), AND (connector inside a number).
NUM, MULT, POINT, FRAC, AND = "NUM", "MULT", "POINT", "FRAC", "AND"


def _table() -> dict[str, tuple[str, float]]:
    t: dict[str, tuple[str, float]] = {}

    def add(kind: str, value: float, *words: str) -> None:
        for w in words:
            t[clean(w)] = (kind, value)

    # English
    en = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
          "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
          "eighteen", "nineteen"]
    for i, w in enumerate(en):
        add(NUM, i, w)
    add(NUM, 0, "nil", "nought", "naught")
    for w, v in [("twenty", 20), ("thirty", 30), ("forty", 40), ("fourty", 40), ("fifty", 50),
                 ("sixty", 60), ("seventy", 70), ("eighty", 80), ("ninety", 90)]:
        add(NUM, v, w)
    add(MULT, 100, "hundred", "hundreds")
    add(MULT, 1000, "thousand", "thousands", "k", "grand")
    add(MULT, 1_000_000, "million", "millions")
    add(POINT, 0, "point", "dot", "decimal")
    add(FRAC, 0.5, "half")
    add(FRAC, 0.25, "quarter")
    add(AND, 0, "and")

    # Arabic (Gulf + MSA), already in normalized spelling (ة->ه, أ->ا, ى->ي)
    add(NUM, 0, "صفر")
    add(NUM, 1, "واحد", "واحده", "وحده", "احد")
    add(NUM, 2, "اثنين", "اثنان", "اثنتين", "اثنتان", "ثنين", "اتنين", "اثنا", "اثني")
    add(NUM, 3, "ثلاث", "ثلاثه", "تلات", "تلاته", "ثلث")
    add(NUM, 4, "اربع", "اربعه")
    add(NUM, 5, "خمس", "خمسه")
    add(NUM, 6, "ست", "سته", "سته")
    add(NUM, 7, "سبع", "سبعه")
    add(NUM, 8, "ثمان", "ثماني", "ثمانيه", "ثمنيه", "تمنيه", "تمانيه")
    add(NUM, 9, "تسع", "تسعه")
    add(NUM, 10, "عشر", "عشره")
    teens = {11: ["احدعش", "احدعشر", "حداش", "احداش", "حدعش"],
             12: ["اثنعش", "ثنعش", "اطنعش", "اتناشر", "اثنعشر"],
             13: ["ثلطعش", "ثلاثطعش", "تلطعش", "تلتاشر"], 14: ["اربعطعش", "اربعتاشر"],
             15: ["خمسطعش", "خمستاشر"], 16: ["ستطعش", "سطعش", "ستاشر"],
             17: ["سبعطعش", "سبعتاشر"], 18: ["ثمنطعش", "ثمانطعش", "تمنتاشر"],
             19: ["تسعطعش", "تسعتاشر"]}
    for v, ws in teens.items():
        add(NUM, v, *ws)
    for w, v in [("عشرين", 20), ("ثلاثين", 30), ("تلاتين", 30), ("اربعين", 40), ("خمسين", 50),
                 ("ستين", 60), ("سبعين", 70), ("ثمانين", 80), ("ثمنين", 80), ("تمانين", 80),
                 ("تسعين", 90)]:
        add(NUM, v, w)
    add(MULT, 100, "ميه", "مئه", "مايه", "ميت", "مئات", "ميات")
    add(NUM, 200, "ميتين", "مئتين", "مئتان", "ميتان", "متين")
    for v, stems in [(3, ["ثلاث", "ثلث", "تلت"]), (4, ["اربع"]), (5, ["خمس"]), (6, ["ست"]),
                     (7, ["سبع"]), (8, ["ثمان", "ثمن", "تمن"]), (9, ["تسع"])]:
        for s in stems:
            for h in ("ميه", "مئه", "مايه", "مية"):
                add(NUM, v * 100, s + h)
    add(MULT, 1000, "الف", "الاف", "لاف")
    add(NUM, 2000, "الفين", "الفان")
    add(MULT, 1_000_000, "مليون", "ملايين")
    add(POINT, 0, "فاصله", "فاصل", "نقطه", "كومه", "فاصلة")
    add(FRAC, 0.5, "نص", "نصف")
    add(FRAC, 0.25, "ربع")
    add(AND, 0, "و")

    # Arabizi (stored both raw and with digits mapped, as tokenize() does)
    from .normalize import arabizi_to_latin
    for w, v in [("sifr", 0), ("wa7ed", 1), ("wahed", 1), ("wa7da", 1), ("ithnain", 2),
                 ("ithnein", 2), ("etnein", 2), ("itnen", 2), ("thalatha", 3), ("talata", 3),
                 ("thalath", 3), ("arba3a", 4), ("arba3", 4), ("khamsa", 5), ("khams", 5),
                 ("sitta", 6), ("sab3a", 7), ("thamanya", 8), ("tis3a", 9), ("3ashara", 10),
                 ("3ashra", 10), ("3ishreen", 20), ("3eshreen", 20), ("thalatheen", 30),
                 ("khamseen", 50), ("khamsin", 50), ("mitain", 200), ("meteen", 200),
                 ("khamsmiya", 500), ("khamsmeya", 500), ("alfain", 2000), ("alfen", 2000)]:
        add(NUM, v, w, arabizi_to_latin(w))
    add(MULT, 100, "miya", "meya", "mia", "mya")
    add(MULT, 1000, "alf", "aalaf", "alaf")
    add(FRAC, 0.5, "nus", "nuss", "nos")
    add(POINT, 0, "fasla", "fas'la", "no9ta", arabizi_to_latin("no9ta"))

    # Hindi, Latin transliteration
    for w, v in [("ek", 1), ("teen", 3), ("tin", 3), ("char", 4), ("chaar", 4), ("paanch", 5),
                 ("panch", 5), ("paach", 5), ("pach", 5), ("chhe", 6), ("chhah", 6), ("che", 6),
                 ("chah", 6), ("chheh", 6), ("saat", 7), ("sat", 7), ("aath", 8), ("ath", 8),
                 ("nau", 9), ("nao", 9), ("das", 10), ("dus", 10), ("gyarah", 11), ("gyara", 11),
                 ("barah", 12), ("bara", 12), ("terah", 13), ("tera", 13), ("chaudah", 14),
                 ("chauda", 14), ("pandrah", 15), ("pandra", 15), ("solah", 16), ("sola", 16),
                 ("satrah", 17), ("satra", 17), ("atharah", 18), ("athara", 18), ("unnis", 19),
                 ("unees", 19), ("bees", 20), ("bis", 20), ("pachees", 25), ("pachchees", 25),
                 ("pachis", 25), ("tees", 30), ("tis", 30), ("chalis", 40), ("chaalis", 40),
                 ("pachas", 50), ("pachaas", 50), ("saath", 60), ("sattar", 70), ("assi", 80),
                 ("assee", 80), ("nabbe", 90), ("do", 2), ("dedh", 1.5), ("dhai", 2.5),
                 ("dhaai", 2.5), ("adhai", 2.5)]:
        add(NUM, v, w)
    add(MULT, 100, "sau", "so")
    add(MULT, 1000, "hazaar", "hazar", "hajar", "hajaar", "hazaar")
    add(MULT, 100_000, "lakh", "lac", "lakhs")
    add(MULT, 10_000_000, "crore", "karod")
    add(FRAC, 0.5, "aadha", "adha", "aadhaa")
    add(POINT, 0, "poin", "pt")
    add(AND, 0, "aur")

    # Hindi, Devanagari (normalized: nukta removed, candrabindu -> anusvara)
    for w, v in [("शून्य", 0), ("एक", 1), ("दो", 2), ("तीन", 3), ("चार", 4), ("पांच", 5),
                 ("पाँच", 5), ("छह", 6), ("छः", 6), ("छे", 6), ("सात", 7), ("आठ", 8), ("नौ", 9),
                 ("दस", 10), ("ग्यारह", 11), ("बारह", 12), ("पंद्रह", 15), ("बीस", 20),
                 ("पच्चीस", 25), ("तीस", 30), ("चालीस", 40), ("पचास", 50), ("साठ", 60),
                 ("सत्तर", 70), ("अस्सी", 80), ("नब्बे", 90), ("डेढ़", 1.5), ("ढाई", 2.5)]:
        add(NUM, v, w)
    add(MULT, 100, "सौ")
    add(MULT, 1000, "हज़ार", "हजार")
    add(MULT, 100_000, "लाख")
    add(MULT, 10_000_000, "करोड़")
    add(FRAC, 0.5, "आधा")
    add(POINT, 0, "पॉइंट", "प्वाइंट", "दशमलव")
    add(AND, 0, "और")
    return t


NUMBER_WORDS = _table()

# Number words that are also common non-number words. They only count when a
# neighbouring token is clearly numeric (unit, multiplier, another number).
AMBIGUOUS = {clean(w) for w in ["do", "दो", "saath", "sat", "tin", "bara", "tera", "so", "che",
                                "ست", "ثلث", "احد", "ath", "pach", "dot", "tis", "bis",
                                "sola", "k", "grand", "one", "و", "and", "aur", "और", "pt"]}

# --- Units -------------------------------------------------------------------

def _units() -> dict[str, str]:
    groups = {
        "ETH": ["eth", "ether", "ethers", "ethereum", "ethereums", "etherium", "etherum",
                "ethirium", "eath", "ايثيريوم", "ايثريوم", "ايثيروم", "اثيريوم", "اثريوم",
                "ايثير", "ايثر", "ايث", "اثير", "ايثيرم", "इथेरियम", "ईथर", "इथर", "ईथरियम"],
        "AED": ["aed", "dirham", "dirhams", "dh", "dhs", "درهم", "دراهم", "درهما", "दिरहम"],
        "SAR": ["sar", "riyal", "riyals", "rial", "rials", "ريال", "ريالات", "रियाल"],
        "QAR": ["qar"],
        "OMR": ["omr"],
        "BHD": ["bhd"],
        "KWD": ["kwd", "dinar", "dinars", "دينار", "دنانير"],
        "USD": ["usd", "dollar", "dollars", "bucks", "$", "دولار", "دولارات", "डॉलर", "डालर"],
        "INR": ["inr", "rupee", "rupees", "rupaye", "rupaiye", "rupiya", "rupay", "rs", "₹",
                "روبيه", "روبيات", "रुपये", "रुपए", "रुपया", "रुपय"],
        "EUR": ["eur", "euro", "euros", "€", "يورو"],
    }
    out = {}
    for unit, words in groups.items():
        for w in words:
            out[clean(w)] = unit
    return out


UNIT_WORDS = _units()


def unit_of(token: Token) -> str | None:
    """Canonical currency code for a token, or None."""
    for v in ar_variants(token.text) if token.script == "ar" else [token.text]:
        if v in UNIT_WORDS:
            return UNIT_WORDS[v]
    return None


# --- Extraction --------------------------------------------------------------

@dataclass
class NumberSpan:
    value: float
    start: int  # token index (inclusive)
    end: int  # token index (exclusive)
    kind: str  # "amount" or "phone"
    text: str
    unit: str | None = None


def _lookup(token: Token) -> tuple[str, float] | None:
    if token.script == "num":
        try:
            return (NUM, float(token.text))
        except ValueError:
            return None
    if token.script == "ar":
        for v in ar_variants(token.text):
            if v in NUMBER_WORDS:
                return NUMBER_WORDS[v]
        return None
    return NUMBER_WORDS.get(token.text)


_PHONE_DIGITS = re.compile(r"^\+?\d{7,15}$")


def _is_numberish(tokens: list[Token], i: int) -> bool:
    if i < 0 or i >= len(tokens):
        return False
    t = tokens[i]
    if unit_of(t):
        return True
    hit = _lookup(t)
    return bool(hit) and t.text not in AMBIGUOUS


def _accepts(tokens: list[Token], i: int, hit: tuple[str, float]) -> bool:
    t = tokens[i]
    if t.text not in AMBIGUOUS:
        return True
    if hit[0] == AND:
        return _is_numberish(tokens, i - 1) and _is_numberish(tokens, i + 1)
    return _is_numberish(tokens, i - 1) or _is_numberish(tokens, i + 1)


def _phone_spans(tokens: list[Token]) -> list[NumberSpan]:
    """Runs of digits (or single-digit words) long enough to be a phone number."""
    spans = []
    i = 0
    while i < len(tokens):
        j = i
        digits = ""
        while j < len(tokens):
            t = tokens[j]
            if t.script == "num" and re.fullmatch(r"\+?\d+", t.text):
                digits += t.text
            elif t.script != "num":
                hit = _lookup(t)
                if hit and hit[0] == NUM and hit[1] < 10 and float(hit[1]).is_integer():
                    digits += str(int(hit[1]))
                elif t.text in ("plus", "زائد", "زايد") and not digits:
                    digits += "+"
                else:
                    break
            else:
                break
            j += 1
        if _PHONE_DIGITS.match(digits) and (j - i > 1 or len(digits) >= 8):
            # A single long integer like 1000000 is an amount, not a phone:
            # require a phone-like prefix when it is one token.
            if j - i > 1 or digits.startswith(("0", "+", "9")):
                spans.append(NumberSpan(0, i, j, "phone", digits))
                i = j
                continue
        i = max(j, i + 1)
    return spans


def extract_numbers(tokens: list[Token]) -> list[NumberSpan]:
    """All amount and phone spans in the token list, in order."""
    phones = _phone_spans(tokens)
    taken = {k for s in phones for k in range(s.start, s.end)}
    spans: list[NumberSpan] = list(phones)

    i = 0
    while i < len(tokens):
        if i in taken:
            i += 1
            continue
        hit = _lookup(tokens[i])
        # "a hundred", "a half", "an eth"? only before MULT/FRAC
        if tokens[i].text in ("a", "an") and i + 1 < len(tokens):
            nxt = _lookup(tokens[i + 1])
            if nxt and nxt[0] in (MULT, FRAC):
                hit = (NUM, 1.0)
        if not hit or hit[0] == AND or not _accepts(tokens, i, hit):
            i += 1
            continue

        start = i
        total = 0.0
        cur: float | None = None
        frac = 0.0
        decimals = ""
        in_decimal = False
        last_ok = i - 1
        j = i
        while j < len(tokens) and j not in taken:
            t = tokens[j]
            h = _lookup(t)
            if t.text in ("a", "an") and j == start:
                h = (NUM, 1.0)
            if h is None or not _accepts(tokens, j, h):
                break
            kind, val = h
            if in_decimal:
                if kind == NUM and val < 100 and float(val).is_integer():
                    decimals += str(int(val))
                    last_ok = j
                    j += 1
                    continue
                break
            if kind == NUM:
                if t.script == "num" and cur is not None and last_ok == j - 1 and \
                        tokens[j - 1].script == "num":
                    break  # two separate digit numbers
                cur = (cur or 0) + val
            elif kind == MULT:
                if val == 100:
                    cur = (cur or 1) * 100
                else:
                    total += (cur if cur is not None else 1) * val
                    cur = None
            elif kind == POINT:
                if not (j + 1 < len(tokens) and (_lookup(tokens[j + 1]) or (None,))[0] == NUM):
                    break
                in_decimal = True
            elif kind == FRAC:
                frac += val
            elif kind == AND:
                nxt = _lookup(tokens[j + 1]) if j + 1 < len(tokens) else None
                if not nxt or nxt[0] == AND:
                    break
            last_ok = j
            j += 1

        if last_ok < start:
            i += 1
            continue
        value = total + (cur or 0)
        if decimals:
            value += float("0." + decimals)
        value += frac
        if frac and value == frac and cur is None and total == 0:
            value = frac  # "half" alone
        end = last_ok + 1
        # A trailing connector is not part of the number.
        while end > start and _lookup(tokens[end - 1]) and _lookup(tokens[end - 1])[0] == AND:
            end -= 1
        text = " ".join(t.raw for t in tokens[start:end])
        spans.append(NumberSpan(value, start, end, "amount", text))
        i = end if end > i else i + 1

    # Attach units: "5 eth", "eth 5", "$5", "0.1 test eth".
    for s in spans:
        if s.kind != "amount":
            continue
        for k in (s.end, s.end + 1, s.start - 1):
            if 0 <= k < len(tokens):
                u = unit_of(tokens[k])
                if u and (k != s.end + 1 or tokens[s.end].text in _UNIT_FILLERS):
                    s.unit = u
                    break
    spans.sort(key=lambda s: s.start)
    return spans


_UNIT_FILLERS = {"test", "an", "a", "of", "تست", "تجريبي", "من"}


def pick_amount(spans: list[NumberSpan]) -> NumberSpan | None:
    """The most likely transaction amount: prefer one with a unit."""
    amounts = [s for s in spans if s.kind == "amount"]
    if not amounts:
        return None
    with_unit = [s for s in amounts if s.unit]
    return (with_unit or amounts)[0]
