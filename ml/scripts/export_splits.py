"""Export the exact train/dev/test splits used by train.py, for transformer fine-tuning.

    python scripts/export_splits.py        # -> data/splits/*.jsonl

Each row: text, masked (normalized text with slots masked, as the TF-IDF model
sees it), label, weight, contacts. Using the same splits and the same
near-duplicate filtering keeps the comparison between models fair.
"""

from __future__ import annotations

import json

from common import (DATA, EXTERNAL_TEST, EXTERNAL_TRAIN, MODELS, load_external, load_synthetic,
                    load_unseen, near_duplicates)
from saypay_nlu.classifier import IntentModel
from saypay_nlu.features import make_views
from train import _weights, split

# Same down-weighting of external out-of-scope rows as the chosen v3 model.
W_UNKNOWN = IntentModel.load(MODELS / "intent_v3.joblib").meta["best"]["w_unknown"]


def row(r: dict, weight: float = 1.0) -> dict:
    return {"text": r["text"], "masked": make_views(r["text"], r.get("contacts") or []).norm,
            "label": r["intent"], "weight": float(weight), "contacts": r.get("contacts") or [],
            "source": r.get("source", ""), "script": r.get("script", "")}


def write(name: str, rows: list[dict]) -> None:
    out = DATA / "splits" / f"{name}.jsonl"
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"{name:28} {len(rows):6}")


def main() -> None:
    rows = load_synthetic()
    for name in EXTERNAL_TRAIN:
        rows += load_external(name)
    tests = {"unseen": load_unseen(), **{n: load_external(n) for n in EXTERNAL_TEST}}
    hand_dev = load_unseen("dev_handwritten.tsv")
    all_tests = [r for rs in tests.values() for r in rs]
    drop = near_duplicates(rows + hand_dev, all_tests)
    hand_dev = [r for i, r in enumerate(hand_dev) if i + len(rows) not in drop]
    rows = [r for i, r in enumerate(rows) if i not in drop]

    tr, dev = split(rows)
    write("train", [row(r, w) for r, w in zip(tr, _weights(tr, W_UNKNOWN))])
    write("dev", [row(r, w) for r, w in zip(dev + hand_dev, _weights(dev + hand_dev, W_UNKNOWN))])
    for name, rs in tests.items():
        write(f"test_{name}", [row(r) for r in rs])


if __name__ == "__main__":
    main()
