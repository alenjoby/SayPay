"""Laya zero-shot: ask Laya's Router the intent as a typed "choice" question.

    pip install laya
    python scripts/laya_zeroshot.py --run laya_zeroshot           # Router picks the checkpoint
    python scripts/laya_zeroshot.py --run laya_ml --model multilingual

No training on our data: this measures Laya as shipped. Writes
preds/<run>/<split>.jsonl in the same format as finetune_transformer.py.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPLITS = ROOT / "data" / "splits"

QUESTION = {
    "intent": {
        "type": "choice",
        "instructions": "A user of a voice crypto wallet said this. What do they want the wallet to do?",
        "criteria": {
            "check_balance": "know how much money is in their wallet (balance)",
            "send": "send, transfer or pay money to someone",
            "history": "see past transactions, payments or spending",
            "tx_status": "check whether a transfer went through, arrived or is pending",
            "receive": "receive money, request money or get their own wallet address or QR code",
            "add_contact": "save or add a person or address as a contact",
            "recovery_help": "get help after losing their phone, a stolen phone or losing access",
            "cancel": "cancel, stop or say no to the current action",
            "unknown": "something else that is not a wallet action",
        },
    }
}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", default="laya_zeroshot")
    ap.add_argument("--model", default=None, help="force a checkpoint, e.g. multilingual")
    ap.add_argument("--batch-size", type=int, default=32)
    args = ap.parse_args()

    from laya import Router

    router = Router(preload=False)
    out_dir = ROOT / "preds" / args.run
    out_dir.mkdir(parents=True, exist_ok=True)
    labels = list(QUESTION["intent"]["criteria"])
    t0 = time.time()
    for path in sorted(SPLITS.glob("test_*.jsonl")):
        rows = [json.loads(line) for line in open(path, encoding="utf-8")]
        reqs = [{"state": r["text"], "questions": QUESTION} for r in rows]
        if args.model:
            for q in reqs:
                q["model"] = args.model
        results = router.predict_batch(reqs, batch_size=args.batch_size)
        with open(out_dir / path.name, "w", encoding="utf-8") as f:
            for r, res in zip(rows, results):
                p = res["answers"]["intent"]["probabilities"]
                z = sum(p.get(l, 0.0) for l in labels) or 1.0
                f.write(json.dumps({"text": r["text"], "probs": {l: p.get(l, 0.0) / z for l in labels}},
                                   ensure_ascii=False) + "\n")
        print(f"{path.stem}: {len(rows)} rows ({time.time() - t0:.0f}s)")
    (out_dir / "meta.json").write_text(json.dumps(
        {"model": f"laya Router ({args.model or 'auto-routed'}), zero-shot", "kind": "zeroshot"}, indent=1))


if __name__ == "__main__":
    main()
