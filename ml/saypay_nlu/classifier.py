"""Trained intent model: TF-IDF over three text views + rule features -> LogReg.

Temperature-scaled so that "confidence >= 0.8" means what it says on held-out
data. Load with ``IntentModel.load()``; train with ``scripts/train.py``.
"""

from __future__ import annotations

import os
from pathlib import Path

import joblib
import numpy as np
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

from .features import LABELS, Views, make_views

DEFAULT_PATH = Path(os.getenv("SAYPAY_MODEL", Path(__file__).resolve().parents[1] / "models" / "intent_v3.joblib"))


def _vectorizers() -> dict[str, TfidfVectorizer]:
    return {
        "word": TfidfVectorizer(analyzer="word", token_pattern=r"\S+", ngram_range=(1, 2),
                                sublinear_tf=True, min_df=1),
        "char": TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), sublinear_tf=True,
                                min_df=2, max_features=200_000),
        "latin": TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), sublinear_tf=True,
                                 min_df=2, max_features=100_000),
        "phon": TfidfVectorizer(analyzer="char_wb", ngram_range=(1, 4), sublinear_tf=True,
                                min_df=2, max_features=50_000),
    }


class IntentModel:
    def __init__(self, C: float = 4.0, dense_weight: float = 1.0, temperature: float = 1.0):
        self.C = C
        self.dense_weight = dense_weight
        self.temperature = temperature
        self.vecs = _vectorizers()
        self.clf = LogisticRegression(C=C, max_iter=3000, class_weight="balanced")
        self.labels = LABELS
        self.meta: dict = {}

    # -- features -------------------------------------------------------------
    @staticmethod
    def views(texts: list[str], contacts: list[list[str]] | None = None) -> list[Views]:
        contacts = contacts or [[] for _ in texts]
        return [make_views(t, c) for t, c in zip(texts, contacts)]

    def _matrix(self, views: list[Views], fit: bool = False):
        cols = {"word": [v.norm for v in views], "char": [v.norm for v in views],
                "latin": [v.latin for v in views], "phon": [v.phon for v in views]}
        mats = []
        for name, vec in self.vecs.items():
            mats.append(vec.fit_transform(cols[name]) if fit else vec.transform(cols[name]))
        dense = np.vstack([v.dense for v in views]) * self.dense_weight
        mats.append(sparse.csr_matrix(dense))
        return sparse.hstack(mats).tocsr()

    # -- training / inference ---------------------------------------------------
    def fit(self, views: list[Views], y: list[str], sample_weight=None) -> "IntentModel":
        X = self._matrix(views, fit=True)
        self.clf.fit(X, [self.labels.index(i) for i in y], sample_weight=sample_weight)
        return self

    def logits(self, views: list[Views]) -> np.ndarray:
        X = self._matrix(views)
        out = np.full((len(views), len(self.labels)), -1e9)
        out[:, self.clf.classes_] = self.clf.decision_function(X)
        return out

    def predict_proba(self, views: list[Views]) -> np.ndarray:
        z = self.logits(views) / self.temperature
        z -= z.max(axis=1, keepdims=True)
        p = np.exp(z)
        return p / p.sum(axis=1, keepdims=True)

    def fit_temperature(self, views: list[Views], y: list[str]) -> float:
        """Pick T minimizing negative log-likelihood on held-out data."""
        z = self.logits(views)
        idx = np.array([self.labels.index(i) for i in y])
        best_t, best_nll = 1.0, float("inf")
        for t in np.concatenate([np.linspace(0.3, 3.0, 55), np.linspace(3.2, 8, 13)]):
            zz = z / t
            zz = zz - zz.max(axis=1, keepdims=True)
            logp = zz - np.log(np.exp(zz).sum(axis=1, keepdims=True))
            nll = -logp[np.arange(len(idx)), idx].mean()
            if nll < best_nll:
                best_t, best_nll = float(t), nll
        self.temperature = best_t
        return best_t

    def predict_one(self, text: str, contacts: list[str] | None = None) -> dict[str, float]:
        p = self.predict_proba([make_views(text, contacts)])[0]
        return {label: float(p[i]) for i, label in enumerate(self.labels)}

    # -- persistence ------------------------------------------------------------
    def save(self, path: Path = DEFAULT_PATH) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, path, compress=3)

    @staticmethod
    def load(path: Path = DEFAULT_PATH) -> "IntentModel | None":
        path = Path(path)
        if not path.exists():
            return None
        return joblib.load(path)
