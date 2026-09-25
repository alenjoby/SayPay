"""Dataset loading shared by train.py and evaluate.py."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from saypay_nlu.normalize import clean  # noqa: E402

DATA = ROOT / "data"
MODELS = ROOT / "models"
REPORTS = ROOT / "reports"

# Contacts saved on the device for every row of the hand-written test set.
UNSEEN_CONTACTS = ["Amma", "Ahmed", "Rahul", "Mohammed Ali", "Sara", "Khalid", "Priya",
                   "Fatima", "Dad", "أبو خالد"]

EXTERNAL_TRAIN = ["banking77_train", "arbanking77_train", "massive_ar_train", "massive_hi_train",
                  "massive_en_train"]
EXTERNAL_TEST = ["banking77_test", "arbanking77_msa_test", "arbanking77_pal_test",
                 "arbanking77_saudi_test", "arbanking77_moroccan_test",
                 "arbanking77_tunisian_test", "massive_ar_test", "massive_hi_test",
                 "massive_en_test"]


def read_jsonl(path: Path) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def load_synthetic() -> list[dict]:
    return read_jsonl(DATA / "generated" / "synthetic.jsonl")


def load_external(name: str) -> list[dict]:
    rows = read_jsonl(DATA / "external" / f"{name}.jsonl")
    for r in rows:
        r.setdefault("contacts", [])
        r.setdefault("script", "ar" if r["lang"] == "ar" else
                     "hi_deva" if r["lang"] == "hi" else "en")
    return rows


def load_unseen(name: str = "unseen.tsv") -> list[dict]:
    rows = []
    for line in open(DATA / "test" / name, encoding="utf-8"):
        if not line.strip() or line.startswith("#"):
            continue
        intent, script, text, amount, unit, contact = line.rstrip("\n").split("\t")
        rows.append({
            "text": text, "intent": intent, "script": script,
            "amount": None if amount == "-" else float(amount),
            "unit": None if unit == "-" else unit,
            "contact": None if contact == "-" else contact,
            "contacts": UNSEEN_CONTACTS, "source": name.split(".")[0],
        })
    return rows


def lang_of(row: dict) -> str:
    s = row.get("script", "")
    if s.startswith(("ar", "arabizi")):
        return "ar"
    if s.startswith("hi"):
        return "hi"
    return "en"


def _grams(text: str, n: int = 3) -> set[str]:
    t = re.sub(r"\s+", " ", clean(text)).strip()
    return {t[i:i + n] for i in range(max(1, len(t) - n + 1))}


def near_duplicates(train: list[dict], tests: list[dict], threshold: float = 0.75) -> set[int]:
    """Indices of training rows whose char-3gram Jaccard with any test row >= threshold."""
    test_grams = [_grams(r["text"]) for r in tests]
    index: dict[str, list[int]] = {}
    for j, g in enumerate(test_grams):
        for x in g:
            index.setdefault(x, []).append(j)
    drop = set()
    for i, r in enumerate(train):
        g = _grams(r["text"])
        cand: dict[int, int] = {}
        for x in g:
            for j in index.get(x, ()):
                cand[j] = cand.get(j, 0) + 1
        for j, inter in cand.items():
            union = len(g) + len(test_grams[j]) - inter
            if union and inter / union >= threshold:
                drop.add(i)
                break
    return drop
