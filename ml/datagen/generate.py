"""Build the synthetic training set from templates + slot pools + noise.

    python -m datagen.generate --out data/generated/synthetic.jsonl

Every row keeps its template id, so evaluation can hold out whole templates
(generalization to unseen phrasings, not memorized ones).
"""

from __future__ import annotations

import argparse
import json
import random
import re
from pathlib import Path

from saypay_nlu.normalize import tokenize
from saypay_nlu.numbers import unit_of

from .noise import arabic_to_arabizi, code_switch, spelling_noise, surface
from .pools import AMOUNTS, EXTRA_CONTACTS, NAMES, UNITS
from .templates_ar import AR, ARABIZI
from .templates_en_hi import EN, HI_DEVA, HI_LATIN, MIX_HI_EN
from .templates_extra import EXTRA
from .templates_v4 import V4

# Arabizi amounts (spoken form, gold)
AMOUNTS_ARABIZI = [
    ("0.1", 0.1), ("5", 5), ("100", 100), ("500", 500), ("wa7ed", 1), ("ithnain", 2),
    ("thalatha", 3), ("khamsa", 5), ("3ashara", 10), ("3ishreen", 20), ("miya", 100),
    ("mitain", 200), ("khamsmiya", 500), ("alf", 1000), ("nus", 0.5),
]

VARIETY_LANG = {  # variety -> (pool language, script tag, noise lang)
    "ar_gulf": ("ar", "ar", "ar"), "ar_msa": ("ar", "ar", "ar"), "ar_lev": ("ar", "ar", "ar"),
    "ar_egy": ("ar", "ar", "ar"), "mix_ar_en": ("ar", "ar+en", "ar"),
    "arabizi": ("arabizi", "arabizi", "arabizi"), "en": ("en", "en", "en"),
    "hi_latin": ("hi", "hi_latin", "hi"), "hi_deva": ("hi", "hi_deva", "deva"),
    "mix_hi_en": ("hi", "hi_latin+en", "hi"),
}


def _lines(block: str) -> list[str]:
    return [ln.strip() for ln in block.strip().splitlines() if ln.strip()]


def load_templates() -> list[dict]:
    rows = []

    def add(intent: str, variety: str, block: str) -> None:
        for i, t in enumerate(_lines(block)):
            rows.append({"intent": intent, "variety": variety, "template": t,
                         "template_id": f"{intent}/{variety}/{i}"})

    for intent, by_var in AR.items():
        for variety, block in by_var.items():
            add(intent, variety, block)
    for intent, block in ARABIZI.items():
        add(intent, "arabizi", block)
    for tag, bank in (("x", EXTRA), ("v4_", V4)):
        for intent, by_var in bank.items():
            for variety, block in by_var.items():
                for i, t in enumerate(_lines(block)):
                    rows.append({"intent": intent, "variety": variety, "template": t,
                                 "template_id": f"{intent}/{variety}/{tag}{i}"})
    for src, variety in ((EN, "en"), (HI_LATIN, "hi_latin"), (HI_DEVA, "hi_deva"),
                         (MIX_HI_EN, "mix_hi_en")):
        for intent, block in src.items():
            add(intent, variety, block)
    return rows


def _pick_name(lang: str, script: str, rng: random.Random) -> tuple[str, str]:
    display, forms = rng.choice(NAMES)
    key = {"arabizi": "en"}.get(lang, lang)
    options = forms.get(key) or forms["en"]
    if lang == "hi":
        # Latin Hindi carries Latin names; Devanagari Hindi mostly Devanagari ones.
        latin = [f for f in options if f.isascii()] or forms["en"]
        deva = [f for f in options if not f.isascii()]
        options = deva if script == "hi_deva" and deva and rng.random() < 0.8 else latin
    return display, rng.choice(options)


def _contacts_for(display: str, rng: random.Random) -> list[str]:
    others = [n for n, _ in NAMES if n != display]
    pool = rng.sample(others, 3) + rng.sample(EXTRA_CONTACTS, 2)
    # The saved name may be in Arabic script even if the command is Latin.
    saved = display
    forms = dict(NAMES)[display]
    if rng.random() < 0.25 and forms.get("ar"):
        saved = forms["ar"][0]
    pool.append(saved)
    rng.shuffle(pool)
    return pool, saved


def _script_filter(pool: list, script: str, rng: random.Random) -> list:
    """Latin-script Hindi gets Latin fillers; Devanagari Hindi mostly Devanagari."""
    if script.startswith("hi_latin"):
        return [p for p in pool if p[0].isascii()]
    if script == "hi_deva" and rng.random() < 0.7:
        deva = [p for p in pool if p[0] and not p[0].isascii()]
        return deva or pool
    return pool


def fill(template: str, lang: str, rng: random.Random, script: str = "") -> dict:
    out = {"amount": None, "unit": None, "contact": None, "contacts": []}
    text = template
    if "{name}" in text:
        display, spoken = _pick_name(lang, script, rng)
        contacts, saved = _contacts_for(display, rng)
        out["contacts"] = contacts
        out["contact"] = saved
        text = text.replace("{name}", spoken)
    else:
        out["contacts"] = rng.sample([n for n, _ in NAMES], 4)
    if "{amt}" in text:
        pool = AMOUNTS_ARABIZI if lang == "arabizi" else _script_filter(AMOUNTS[lang], script, rng)
        spoken, value = rng.choice(pool)
        out["amount"] = value
        text = text.replace("{amt}", spoken, 1)
    if "{unit}" in text:
        upool = UNITS["en"] if lang == "arabizi" else _script_filter(UNITS[lang], script, rng)
        spoken_u, unit = rng.choice(upool)
        if out["amount"] is not None:
            out["unit"] = unit
        text = text.replace("{unit}", spoken_u)
    if "{addr}" in text:
        text = text.replace("{addr}", "0x" + "".join(rng.choice("0123456789abcdefABCDEF") for _ in range(40)))
    if "{hash}" in text:
        text = text.replace("{hash}", "0x" + "".join(rng.choice("0123456789abcdef") for _ in range(64)))
    if "{phone}" in text:
        text = text.replace("{phone}", rng.choice(["05", "+9715", "+9665", "9665", "+91 9", "01"]) +
                            "".join(rng.choice("0123456789") for _ in range(8)))
    if "{ens}" in text:
        text = text.replace("{ens}", rng.choice(["ahmed", "sara", "khalid", "rahul", "noura", "omar99"]) + ".eth")
    text = re.sub(r"\s+", " ", text).strip()
    if out["amount"] is not None and out["unit"] is None:
        # A unit written into the template itself ("ارسل {amt} ethereum ...").
        for tok in tokenize(template):
            if unit_of(tok):
                out["unit"] = unit_of(tok)
                break
    out["text"] = text
    return out


def generate(per_template: int = 14, seed: int = 7) -> list[dict]:
    rng = random.Random(seed)
    rows = []
    for t in load_templates():
        pool_lang, script, noise_lang = VARIETY_LANG[t["variety"]]
        n = per_template if "{" in t["template"] else max(6, per_template // 2)
        seen = set()
        for k in range(n * 2):
            if len(seen) >= n:
                break
            to_arabizi = pool_lang == "ar" and t["variety"] != "ar_msa" and rng.random() < 0.25
            lang = "arabizi" if to_arabizi else pool_lang
            base = arabic_to_arabizi(t["template"].replace("{name}", "\x00N").replace(
                "{amt}", "\x00A").replace("{unit}", "\x00U"), rng) if to_arabizi else t["template"]
            if to_arabizi:
                base = base.replace("\x00N", "{name}").replace("\x00A", "{amt}").replace("\x00U", "{unit}")
            row = fill(base, lang, rng, script)
            text = row["text"]
            n_noise = 0
            r = rng.random()
            if r < 0.35:
                n_noise = min(rng.choice([1, 1, 2, 3]), max(1, len(row["text"].split()) // 2))
                text = spelling_noise(text, "ar" if lang == "ar" else noise_lang if noise_lang != "arabizi" else "en", rng, n_noise)
            if lang == "ar" or pool_lang == "hi":
                if rng.random() < 0.2:
                    text = code_switch(text, rng)
            text = surface(text, "ar" if lang == "ar" else lang, rng)
            if text in seen:
                continue
            seen.add(text)
            rows.append({
                "text": text, "intent": t["intent"], "variety": t["variety"],
                "script": "arabizi" if to_arabizi else script, "template_id": t["template_id"],
                "noise": n_noise, "amount": row["amount"], "unit": row["unit"],
                "contact": row["contact"], "contacts": row["contacts"], "source": "synthetic",
            })
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/generated/synthetic.jsonl")
    ap.add_argument("--per-template", type=int, default=14)
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()
    rows = generate(args.per_template, args.seed)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    from collections import Counter
    print(f"{len(rows)} rows, {len({r['template_id'] for r in rows})} templates -> {args.out}")
    print(Counter(r["intent"] for r in rows))
    print(Counter(r["script"] for r in rows))


if __name__ == "__main__":
    main()
