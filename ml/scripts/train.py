"""Train the v3 intent model (and the English-only baseline).

    python -m datagen.generate && python scripts/fetch_external.py
    python scripts/train.py

Protocol:
1. Training rows that are near-duplicates of any test row are removed.
2. Dev split holds out whole synthetic templates (20%) plus 15% of external
   training rows, so hyperparameters are chosen on unseen phrasings.
3. Grid search C x dense_weight on dev macro-F1; fit temperature on dev.
4. Refit on train+dev with the chosen settings; keep the temperature.
Test sets (unseen.tsv, external *_test) are never touched here.
"""

from __future__ import annotations

import json
import random
import time

import numpy as np
from sklearn.metrics import accuracy_score, f1_score

from common import (EXTERNAL_TEST, EXTERNAL_TRAIN, MODELS, lang_of, load_external,
                    load_synthetic, load_handwritten_tests, load_unseen, near_duplicates)
from saypay_nlu.classifier import IntentModel


def split(rows: list[dict], seed: int = 0) -> tuple[list[dict], list[dict]]:
    rng = random.Random(seed)
    templates = sorted({r["template_id"] for r in rows if r.get("template_id")})
    rng.shuffle(templates)
    dev_t = set(templates[: len(templates) // 5])
    train, dev = [], []
    for r in rows:
        if r.get("template_id"):
            (dev if r["template_id"] in dev_t else train).append(r)
        else:
            (dev if rng.random() < 0.15 else train).append(r)
    return train, dev


def _views(model_cls, rows, cache):
    out = []
    for r in rows:
        key = (r["text"], tuple(r.get("contacts") or ()))
        if key not in cache:
            cache[key] = model_cls.views([r["text"]], [r.get("contacts") or []])[0]
        out.append(cache[key])
    return out


def _weights(rows: list[dict], w_unknown: float) -> np.ndarray:
    """Down-weight out-of-scope rows from external corpora (they outnumber ours)."""
    return np.array([w_unknown if r["intent"] == "unknown" and r.get("source") != "synthetic"
                     and r.get("source") != "dev_handwritten" else 1.0 for r in rows])


def train_one(rows: list[dict], name: str, cache: dict, grid=True,
              hand_dev: list[dict] | None = None) -> tuple[IntentModel, dict]:
    tr, dev = split(rows)
    hand_dev = hand_dev or []
    Vtr, Vdev = _views(IntentModel, tr, cache), _views(IntentModel, dev, cache)
    Vhd = _views(IntentModel, hand_dev, cache)
    ytr, ydev = [r["intent"] for r in tr], [r["intent"] for r in dev]
    yhd = [r["intent"] for r in hand_dev]
    results = []
    Cs = [4.0, 16.0] if grid else [4.0]
    dws = [1.0, 2.0] if grid else [1.0]
    wus = [0.3, 1.0] if grid else [1.0]
    for C in Cs:
        for dw in dws:
            for wu in wus:
                m = IntentModel(C=C, dense_weight=dw).fit(Vtr, ytr, _weights(tr, wu))
                pred = [m.labels[i] for i in m.logits(Vdev).argmax(1)]
                res = {"C": C, "dense_weight": dw, "w_unknown": wu,
                       "dev_acc": accuracy_score(ydev, pred),
                       "dev_macro_f1": f1_score(ydev, pred, average="macro")}
                if hand_dev:
                    hp = [m.labels[i] for i in m.logits(Vhd).argmax(1)]
                    res["hand_dev_acc"] = accuracy_score(yhd, hp)
                # Select on held-out templates and the hand-written dev set equally.
                res["score"] = (res["dev_macro_f1"] + res.get("hand_dev_acc", res["dev_macro_f1"])) / 2
                results.append(res)
                print(f"  [{name}] C={C:<5} dense={dw:<4} w_unk={wu:<4} "
                      f"templF1={res['dev_macro_f1']:.3f} handAcc={res.get('hand_dev_acc', 0):.3f}")
    best = max(results, key=lambda r: r["score"])
    m = IntentModel(C=best["C"], dense_weight=best["dense_weight"]).fit(
        Vtr, ytr, _weights(tr, best["w_unknown"]))
    T = m.fit_temperature(Vdev + Vhd, ydev + yhd)
    final = IntentModel(C=best["C"], dense_weight=best["dense_weight"], temperature=T)
    all_rows = tr + dev + hand_dev
    final.fit(Vtr + Vdev + Vhd, ytr + ydev + yhd, _weights(all_rows, best["w_unknown"]))
    final.meta = {"name": name, "best": best, "grid": results, "temperature": T,
                  "n_train": len(tr), "n_dev": len(dev), "trained_at": time.strftime("%Y-%m-%d %H:%M")}
    return final, final.meta


def main() -> None:
    t0 = time.time()
    rows = load_synthetic()
    for name in EXTERNAL_TRAIN:
        rows += load_external(name)
    tests = [r for rs in load_handwritten_tests().values() for r in rs]
    for name in EXTERNAL_TEST:
        tests += load_external(name)
    hand_dev = load_unseen("dev_handwritten.tsv")
    drop = near_duplicates(rows + hand_dev, tests)
    drop_hd = {i - len(rows) for i in drop if i >= len(rows)}
    hand_dev = [r for i, r in enumerate(hand_dev) if i not in drop_hd]
    drop = {i for i in drop if i < len(rows)}
    print(f"{len(rows)} training rows; dropping {len(drop)} near-duplicates of test rows")
    rows = [r for i, r in enumerate(rows) if i not in drop]

    cache: dict = {}
    model, meta = train_one(rows, "v3", cache, hand_dev=hand_dev)
    model.meta["dropped_near_duplicates"] = len(drop)
    model.save(MODELS / "intent_v3.joblib")

    en_rows = [r for r in rows if lang_of(r) == "en" and "+" not in r.get("script", "")]
    base, _ = train_one(en_rows, "english_only", cache, grid=False)
    base.save(MODELS / "baseline_english_only.joblib")

    print(json.dumps({k: v for k, v in meta.items() if k != "grid"}, indent=1))
    print(f"done in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
