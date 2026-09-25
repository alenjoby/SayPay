"""Export a fine-tuned checkpoint to ONNX for the CPU API.

    python scripts/export_onnx.py --model preds/mmbert/hf --out models/mmbert_int8          # ~300 MB
    python scripts/export_onnx.py --model preds/mmbert/hf --out models/mmbert_fp32 --fp32   # ~1.2 GB, exact

finetune_transformer.py --export calls this after saving the weights, so if
the export fails it can be re-run on its own (about a minute, no re-training).
The temperature is read from preds/<run>/meta.json next to the checkpoint.
"""

from __future__ import annotations

import argparse
import inspect
import json
from pathlib import Path

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

ROOT = Path(__file__).resolve().parents[1]
LABELS = ["check_balance", "send", "history", "tx_status", "receive", "add_contact",
          "recovery_help", "cancel", "unknown"]


class _Logits(torch.nn.Module):
    def __init__(self, m):
        super().__init__()
        self.m = m

    def forward(self, input_ids, attention_mask):
        return self.m(input_ids=input_ids, attention_mask=attention_mask).logits


def export(model_dir: Path, out: Path, temperature: float, field: str = "masked",
           max_len: int = 64, per_channel: bool = True, fp32: bool = False) -> None:
    import onnxruntime as ort
    from onnxruntime.quantization import QuantType, quantize_dynamic

    out.mkdir(parents=True, exist_ok=True)
    tok = AutoTokenizer.from_pretrained(model_dir)
    # Plain ("eager") attention exports cleanly; flash / sdpa kernels may not.
    model = AutoModelForSequenceClassification.from_pretrained(
        model_dir, attn_implementation="eager").float().eval()
    sample = tok(["حول 0.1 لأمي", "send <num> <unit> to <name> please"], padding=True,
                 return_tensors="pt")
    fp32_path = out / ("model.onnx" if fp32 else "model.fp32.onnx")
    kwargs = dict(input_names=["input_ids", "attention_mask"], output_names=["logits"],
                  dynamic_axes={"input_ids": {0: "b", 1: "t"}, "attention_mask": {0: "b", 1: "t"},
                                "logits": {0: "b"}}, opset_version=17)
    # Newer PyTorch defaults to the dynamo exporter (needs onnxscript); the
    # classic TorchScript exporter works everywhere for an encoder like this.
    if "dynamo" in inspect.signature(torch.onnx.export).parameters:
        kwargs["dynamo"] = False
    with torch.no_grad():
        torch.onnx.export(_Logits(model), (sample["input_ids"], sample["attention_mask"]),
                          str(fp32_path), **kwargs)
    if fp32:
        # Full precision (~1.2 GB): no accuracy loss, for a machine with RAM to spare.
        model_file = "model.onnx"
    else:
        # Per-channel scales (one per output row) keep int8 much closer to fp32 than
        # a single scale per matrix, at the same file size (~300 MB).
        model_file = "model.int8.onnx"
        quantize_dynamic(str(fp32_path), str(out / model_file), weight_type=QuantType.QInt8,
                         per_channel=per_channel)
        fp32_path.unlink()
    tok.save_pretrained(out)

    # Agreement check: int8 ONNX vs fp32 PyTorch on the dev split.
    dev_path = ROOT / "data" / "splits" / "dev.jsonl"
    rows = [json.loads(line) for line in open(dev_path, encoding="utf-8")][:300] \
        if dev_path.exists() else []
    sess = ort.InferenceSession(str(out / model_file), providers=["CPUExecutionProvider"])
    same = 0
    with torch.no_grad():
        for r in rows:
            enc = tok([r[field]], truncation=True, max_length=max_len, return_tensors="pt")
            a = model(**enc).logits.argmax(-1).item()
            b = sess.run(None, {"input_ids": enc["input_ids"].numpy(),
                                "attention_mask": enc["attention_mask"].numpy()})[0].argmax(-1)[0]
            same += int(a == b)
    cfg = {"labels": LABELS, "temperature": temperature, "field": field, "max_len": max_len,
           "source_model": str(model_dir), "file": model_file,
           "precision": "fp32" if fp32 else "int8", "per_channel": per_channel,
           "int8_agreement_with_fp32": same / len(rows) if rows else None}
    (out / "saypay.json").write_text(json.dumps(cfg, indent=1))
    size = (out / model_file).stat().st_size / 1e6
    print(f"exported {out}/{model_file} ({size:.0f} MB), agreement with fp32 PyTorch on dev: "
          f"{same}/{len(rows)}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True, help="checkpoint dir, e.g. preds/mmbert/hf")
    ap.add_argument("--out", required=True, help="e.g. models/mmbert_int8")
    ap.add_argument("--per-tensor", action="store_true", help="one scale per matrix (older, less accurate)")
    ap.add_argument("--fp32", action="store_true", help="no quantization (~1.2 GB, exact)")
    args = ap.parse_args()
    model_dir = Path(args.model)
    meta = json.loads((model_dir.parent / "meta.json").read_text())
    export(model_dir, Path(args.out), temperature=meta["temperature"], field=meta["field"],
           max_len=meta["max_len"], per_channel=not args.per_tensor, fp32=args.fp32)


if __name__ == "__main__":
    main()
