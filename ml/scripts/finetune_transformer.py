"""Fine-tune a multilingual encoder for SayPay intents and write test predictions.

    python scripts/finetune_transformer.py --model xlm-roberta-base --run xlmr
    python scripts/finetune_transformer.py --model jhu-clsp/mmBERT-base --run mmbert

Runs on a free Colab / Kaggle T4 in ~10-20 min per model. Uses the splits from
export_splits.py (same data, same dev, same tests as the TF-IDF model):
- class-balanced, per-row weighted cross-entropy
- best epoch chosen on dev macro-F1; temperature fitted on dev
- writes preds/<run>/<split>.jsonl  ({"text", "probs": {label: p}})
Then locally: python scripts/evaluate.py --preds preds/<run>
"""

from __future__ import annotations

import argparse
import json
import math
import random
import time
from collections import Counter
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import f1_score
from transformers import AutoModelForSequenceClassification, AutoTokenizer, get_linear_schedule_with_warmup

ROOT = Path(__file__).resolve().parents[1]
SPLITS = ROOT / "data" / "splits"
LABELS = ["check_balance", "send", "history", "tx_status", "receive", "add_contact",
          "recovery_help", "cancel", "unknown"]


def load(name: str) -> list[dict]:
    with open(SPLITS / f"{name}.jsonl", encoding="utf-8") as f:
        return [json.loads(line) for line in f]


def batches(rows, tok, field, bs, max_len, shuffle, rng):
    idx = list(range(len(rows)))
    if shuffle:
        rng.shuffle(idx)
    for i in range(0, len(idx), bs):
        chunk = [rows[j] for j in idx[i:i + bs]]
        enc = tok([r[field] for r in chunk], padding=True, truncation=True, max_length=max_len,
                  return_tensors="pt")
        y = torch.tensor([LABELS.index(r["label"]) for r in chunk])
        w = torch.tensor([r.get("weight", 1.0) for r in chunk], dtype=torch.float)
        yield enc, y, w


@torch.no_grad()
def logits_of(model, tok, rows, field, bs, max_len, device):
    model.eval()
    out = []
    for enc, _, _ in batches(rows, tok, field, bs, max_len, False, None):
        enc = {k: v.to(device) for k, v in enc.items()}
        out.append(model(**enc).logits.float().cpu())
    return torch.cat(out).numpy()


def fit_temperature(z: np.ndarray, y: np.ndarray) -> float:
    best_t, best = 1.0, float("inf")
    for t in np.concatenate([np.linspace(0.3, 3.0, 55), np.linspace(3.2, 8, 13)]):
        zz = z / t
        zz = zz - zz.max(1, keepdims=True)
        nll = -(zz - np.log(np.exp(zz).sum(1, keepdims=True)))[np.arange(len(y)), y].mean()
        if nll < best:
            best_t, best = float(t), nll
    return best_t


def softmax(z: np.ndarray) -> np.ndarray:
    z = z - z.max(1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(1, keepdims=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True, help="HF model id or local path")
    ap.add_argument("--run", required=True, help="name for preds/<run>")
    ap.add_argument("--field", default="masked", choices=["masked", "text"])
    ap.add_argument("--epochs", type=int, default=4)
    ap.add_argument("--lr", type=float, default=3e-5)
    ap.add_argument("--bs", type=int, default=32)
    ap.add_argument("--max-len", type=int, default=64)
    ap.add_argument("--seed", type=int, default=13)
    ap.add_argument("--limit", type=int, default=0, help="debug: use only N training rows")
    ap.add_argument("--export", default="", help="dir to write a deployable int8 ONNX model "
                    "(e.g. models/mmbert_int8); needs `pip install onnx onnxruntime`")
    args = ap.parse_args()

    rng = random.Random(args.seed)
    torch.manual_seed(args.seed)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    train, dev = load("train"), load("dev")
    if args.limit:
        train = rng.sample(train, min(args.limit, len(train)))
    tests = {p.stem: load(p.stem) for p in sorted(SPLITS.glob("test_*.jsonl"))}

    tok = AutoTokenizer.from_pretrained(args.model)
    model = AutoModelForSequenceClassification.from_pretrained(
        args.model, num_labels=len(LABELS), id2label=dict(enumerate(LABELS)),
        label2id={l: i for i, l in enumerate(LABELS)}, ignore_mismatched_sizes=True).to(device)

    counts = Counter(r["label"] for r in train)
    class_w = torch.tensor([len(train) / (len(LABELS) * max(1, counts[l])) for l in LABELS],
                           dtype=torch.float, device=device)
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=0.01)
    steps = args.epochs * math.ceil(len(train) / args.bs)
    sched = get_linear_schedule_with_warmup(opt, int(0.06 * steps), steps)
    use_amp = device == "cuda"
    scaler = torch.cuda.amp.GradScaler(enabled=use_amp)

    y_dev = np.array([LABELS.index(r["label"]) for r in dev])
    best_f1, best_state, history = -1.0, None, []
    t0 = time.time()
    for epoch in range(args.epochs):
        model.train()
        total = 0.0
        for enc, y, w in batches(train, tok, args.field, args.bs, args.max_len, True, rng):
            enc = {k: v.to(device) for k, v in enc.items()}
            y, w = y.to(device), w.to(device)
            with torch.autocast(device_type="cuda", dtype=torch.float16, enabled=use_amp):
                logits = model(**enc).logits
            loss = torch.nn.functional.cross_entropy(logits.float(), y, weight=class_w, reduction="none")
            loss = (loss * w).sum() / w.sum()
            opt.zero_grad()
            scaler.scale(loss).backward()
            scaler.unscale_(opt)
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            scaler.step(opt)
            scaler.update()
            sched.step()
            total += loss.item()
        z = logits_of(model, tok, dev, args.field, 128, args.max_len, device)
        pred = z.argmax(1)
        f1 = f1_score(y_dev, pred, average="macro")
        acc = float((pred == y_dev).mean())
        history.append({"epoch": epoch + 1, "loss": total, "dev_acc": acc, "dev_macro_f1": f1})
        print(f"epoch {epoch + 1}: loss={total:.1f} dev_acc={acc:.3f} dev_macroF1={f1:.3f} "
              f"({time.time() - t0:.0f}s)")
        if f1 > best_f1:
            best_f1 = f1
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}

    model.load_state_dict(best_state)
    T = fit_temperature(logits_of(model, tok, dev, args.field, 128, args.max_len, device), y_dev)
    print(f"best dev macro-F1 {best_f1:.3f}, temperature {T:.2f}")

    out_dir = ROOT / "preds" / args.run
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, rows in tests.items():
        p = softmax(logits_of(model, tok, rows, args.field, 128, args.max_len, device) / T)
        with open(out_dir / f"{name}.jsonl", "w", encoding="utf-8") as f:
            for r, pr in zip(rows, p):
                f.write(json.dumps({"text": r["text"], "probs": {l: round(float(x), 5)
                                    for l, x in zip(LABELS, pr)}}, ensure_ascii=False) + "\n")

    # Single-request latency on this device, for the report.
    model.eval()
    lat = []
    with torch.no_grad():
        for r in tests["test_unseen"][:50]:
            enc = {k: v.to(device) for k, v in tok([r[args.field]], return_tensors="pt").items()}
            t = time.perf_counter()
            model(**enc)
            if device == "cuda":
                torch.cuda.synchronize()
            lat.append((time.perf_counter() - t) * 1000)
    meta = {"model": args.model, "field": args.field, "epochs": args.epochs, "lr": args.lr,
            "bs": args.bs, "max_len": args.max_len, "seed": args.seed, "best_dev_macro_f1": best_f1,
            "temperature": T, "history": history, "device": device,
            "n_params": sum(p.numel() for p in model.parameters()),
            "latency_ms_p50": float(np.median(lat)), "train_seconds": time.time() - t0}
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=1))
    print(f"wrote {out_dir}")
    if args.export:
        export_onnx(model, tok, Path(args.export), meta, dev, args)


def export_onnx(model, tok, out: Path, meta: dict, dev: list[dict], args) -> None:
    """Export to ONNX, quantize to int8, and check it agrees with the PyTorch model."""
    import onnxruntime as ort
    from onnxruntime.quantization import QuantType, quantize_dynamic

    out.mkdir(parents=True, exist_ok=True)
    model = model.float().cpu().eval()
    if hasattr(model.config, "_attn_implementation"):
        model.config._attn_implementation = "eager"  # plain attention exports cleanly
    sample = tok(["حول 0.1 لأمي", "send <num> <unit> to <name> please"], padding=True,
                 return_tensors="pt")
    fp32 = out / "model.fp32.onnx"

    class Wrap(torch.nn.Module):
        def __init__(self, m):
            super().__init__()
            self.m = m

        def forward(self, input_ids, attention_mask):
            return self.m(input_ids=input_ids, attention_mask=attention_mask).logits

    torch.onnx.export(Wrap(model), (sample["input_ids"], sample["attention_mask"]), str(fp32),
                      input_names=["input_ids", "attention_mask"], output_names=["logits"],
                      dynamic_axes={"input_ids": {0: "b", 1: "t"}, "attention_mask": {0: "b", 1: "t"},
                                    "logits": {0: "b"}}, opset_version=17)
    quantize_dynamic(str(fp32), str(out / "model.int8.onnx"), weight_type=QuantType.QInt8)
    fp32.unlink()
    tok.save_pretrained(out)

    # Agreement check on dev: int8 ONNX vs PyTorch fp32 argmax.
    sess = ort.InferenceSession(str(out / "model.int8.onnx"), providers=["CPUExecutionProvider"])
    same = 0
    rows = dev[:300]
    with torch.no_grad():
        for r in rows:
            enc = tok([r[args.field]], truncation=True, max_length=args.max_len, return_tensors="pt")
            a = model(**enc).logits.argmax(-1).item()
            b = sess.run(None, {"input_ids": enc["input_ids"].numpy(),
                                "attention_mask": enc["attention_mask"].numpy()})[0].argmax(-1)[0]
            same += int(a == b)
    cfg = {"labels": LABELS, "temperature": meta["temperature"], "field": args.field,
           "max_len": args.max_len, "source_model": args.model,
           "int8_agreement_with_fp32": same / len(rows)}
    (out / "saypay.json").write_text(json.dumps(cfg, indent=1))
    size = (out / "model.int8.onnx").stat().st_size / 1e6
    print(f"exported {out} ({size:.0f} MB int8), agreement with fp32 on dev: {same}/{len(rows)}")


if __name__ == "__main__":
    main()
