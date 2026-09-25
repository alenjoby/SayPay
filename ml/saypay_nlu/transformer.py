"""CPU runtime for the fine-tuned transformer (ONNX, int8 or fp32), and the v3 + transformer ensemble.

Only needs `onnxruntime` and `tokenizers` (no PyTorch). The model directory is
written by `scripts/finetune_transformer.py --export models/mmbert_int8`.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from .features import make_views


class OnnxIntentModel:
    def __init__(self, model_dir: Path):
        import onnxruntime as ort
        from tokenizers import Tokenizer

        model_dir = Path(model_dir)
        self.cfg = json.loads((model_dir / "saypay.json").read_text())
        self.labels: list[str] = self.cfg["labels"]
        self.tok = Tokenizer.from_file(str(model_dir / "tokenizer.json"))
        self.tok.enable_truncation(self.cfg["max_len"])
        self.tok.no_padding()
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = int(self.cfg.get("threads", 4))
        self.sess = ort.InferenceSession(str(model_dir / self.cfg.get("file", "model.int8.onnx")),
                                         opts, providers=["CPUExecutionProvider"])

    def predict_one(self, text: str, contacts: list[str] | None = None) -> dict[str, float]:
        field = make_views(text, contacts).norm if self.cfg["field"] == "masked" else text
        enc = self.tok.encode(field)
        ids = np.array([enc.ids], dtype=np.int64)
        mask = np.array([enc.attention_mask], dtype=np.int64)
        z = self.sess.run(None, {"input_ids": ids, "attention_mask": mask})[0][0]
        z = z / self.cfg["temperature"]
        p = np.exp(z - z.max())
        p /= p.sum()
        return {label: float(p[i]) for i, label in enumerate(self.labels)}

    @staticmethod
    def load(model_dir: Path) -> "OnnxIntentModel | None":
        d = Path(model_dir)
        if not (d / "saypay.json").exists():
            return None
        cfg = json.loads((d / "saypay.json").read_text())
        if not (d / cfg.get("file", "model.int8.onnx")).exists():
            return None
        return OnnxIntentModel(d)


class Ensemble:
    """Average of several models' intent probabilities."""

    def __init__(self, *members):
        self.members = members

    def predict_one(self, text: str, contacts: list[str] | None = None) -> dict[str, float]:
        ps = [m.predict_one(text, contacts) for m in self.members]
        return {k: sum(p[k] for p in ps) / len(ps) for k in ps[0]}
