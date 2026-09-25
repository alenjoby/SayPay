"""Evaluate SayPay NLU against baselines on held-out and real-speaker data.

    python scripts/evaluate.py            # writes reports/eval.md and reports/eval.json

Systems compared (same pipeline, only the intent scorer differs):
  english_only  same model trained on English data only (the spec's baseline)
  rules_v1      keyword rules
  v3            TF-IDF (3 text views) + rule features, calibrated

Metrics per test set:
  accuracy, macro-F1
  auto_rate     share of commands the app would act on (confidence >= 0.8)
  auto_acc      accuracy on those: how often an action proposed without asking is right
  unsafe_send   confident "send" when the user did not ask to send (% of non-send rows)
  ECE           calibration error of the confidence score
Slot accuracy (hand-written set): amount, unit, contact.
"""

from __future__ import annotations

import argparse
import json
import statistics
import time
from pathlib import Path
from collections import Counter, defaultdict

import numpy as np
from sklearn.metrics import f1_score

from common import EXTERNAL_TEST, MODELS, REPORTS, load_external, load_unseen
from saypay_nlu.classifier import IntentModel
from saypay_nlu.pipeline import CONFIDENCE_THRESHOLD, parse

TEST_LABELS = {
    "unseen": "Hand-written, never-seen phrasings (all 3 languages)",
    "arbanking77_saudi_test": "ArBanking77 Saudi dialect (real speakers)",
    "arbanking77_msa_test": "ArBanking77 MSA (real)",
    "arbanking77_pal_test": "ArBanking77 Levantine (real)",
    "arbanking77_moroccan_test": "ArBanking77 Moroccan (real, unseen dialect)",
    "arbanking77_tunisian_test": "ArBanking77 Tunisian (real, unseen dialect)",
    "banking77_test": "Banking77 English (real)",
    "clinc150_test": "CLINC150 English (real, incl. out-of-scope)",
    "massive_ar_test": "MASSIVE Arabic, out-of-scope (must say unknown)",
    "massive_hi_test": "MASSIVE Hindi, out-of-scope (must say unknown)",
    "massive_en_test": "MASSIVE English, out-of-scope (must say unknown)",
}


class Precomputed:
    """Intent probabilities produced elsewhere (e.g. a fine-tuned transformer on Colab)."""

    def __init__(self, pred_dir: Path):
        self.probs: dict[str, dict[str, float]] = {}
        for f in Path(pred_dir).glob("test_*.jsonl"):
            for line in open(f, encoding="utf-8"):
                r = json.loads(line)
                self.probs[r["text"]] = r["probs"]
        meta = Path(pred_dir) / "meta.json"
        self.meta = json.loads(meta.read_text()) if meta.exists() else {}

    def predict_one(self, text, contacts=None):
        return self.probs[text]


class Ensemble:
    """Average of two systems' probabilities."""

    def __init__(self, *members):
        self.members = members

    def predict_one(self, text, contacts=None):
        ps = [m.predict_one(text, contacts) for m in self.members]
        return {k: sum(p[k] for p in ps) / len(ps) for k in ps[0]}


def ece(conf: np.ndarray, correct: np.ndarray, bins: int = 10) -> float:
    edges = np.linspace(0, 1, bins + 1)
    total = 0.0
    for lo, hi in zip(edges[:-1], edges[1:]):
        m = (conf > lo) & (conf <= hi)
        if m.any():
            total += m.mean() * abs(conf[m].mean() - correct[m].mean())
    return float(total)


def run(system, rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        res = parse(r["text"], r.get("contacts") or [], model=system)
        out.append({"pred": res.intent, "conf": res.confidence, "amount": res.amount,
                    "unit": res.unit, "contact": res.contact})
    return out


def metrics(rows: list[dict], preds: list[dict]) -> dict:
    y = [r["intent"] for r in rows]
    p = [x["pred"] for x in preds]
    conf = np.array([x["conf"] for x in preds])
    correct = np.array([a == b for a, b in zip(y, p)])
    auto = conf >= CONFIDENCE_THRESHOLD
    non_send = np.array([a != "send" for a in y])
    unsafe = auto & non_send & np.array([b == "send" for b in p])
    labels = sorted(set(y))
    return {
        "n": len(rows),
        "accuracy": float(correct.mean()),
        "macro_f1": float(f1_score(y, p, labels=labels, average="macro", zero_division=0)),
        "auto_rate": float(auto.mean()),
        "auto_acc": float(correct[auto].mean()) if auto.any() else None,
        "unsafe_send": float(unsafe.sum() / max(1, non_send.sum())),
        "ece": ece(conf, correct.astype(float)),
    }


def slot_metrics(rows: list[dict], preds: list[dict]) -> dict:
    amt = [(r, p) for r, p in zip(rows, preds) if r.get("amount") is not None]
    unit = [(r, p) for r, p in zip(rows, preds) if r.get("unit") is not None]
    con = [(r, p) for r, p in zip(rows, preds) if r.get("contact") is not None]
    return {
        "amount_acc": sum(p["amount"] is not None and abs(p["amount"] - r["amount"]) < 1e-9
                          for r, p in amt) / max(1, len(amt)),
        "unit_acc": sum(p["unit"] == r["unit"] for r, p in unit) / max(1, len(unit)),
        "contact_acc": sum(p["contact"] == r["contact"] for r, p in con) / max(1, len(con)),
        "n_amount": len(amt), "n_unit": len(unit), "n_contact": len(con),
    }


def by_script(rows, preds) -> dict:
    groups = defaultdict(list)
    for r, p in zip(rows, preds):
        groups[r["script"]].append(r["intent"] == p["pred"])
    return {k: (sum(v) / len(v), len(v)) for k, v in sorted(groups.items())}


def pct(x) -> str:
    return "–" if x is None else f"{100 * x:.1f}%"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--preds", nargs="*", default=[],
                    help="prediction dirs from finetune_transformer.py / laya_zeroshot.py")
    ap.add_argument("--out", default="eval")
    args = ap.parse_args()
    systems = {
        "english_only": IntentModel.load(MODELS / "baseline_english_only.joblib"),
        "rules_v1": None,
        "v3": IntentModel.load(MODELS / "intent_v3.joblib"),
    }
    extra_meta = {}
    for d in args.preds:
        name = Path(d).name
        systems[name] = Precomputed(Path(d))
        extra_meta[name] = systems[name].meta
        if systems[name].meta.get("kind") != "zeroshot":
            systems[f"v3+{name}"] = Ensemble(systems["v3"], systems[name])
    tests = {"unseen": load_unseen(), **{n: load_external(n) for n in EXTERNAL_TEST}}
    report: dict = {"generated": time.strftime("%Y-%m-%d %H:%M"), "sets": {},
                    "models": extra_meta}
    unseen_preds = {}
    for tname, rows in tests.items():
        report["sets"][tname] = {}
        for sname, sys_ in systems.items():
            preds = run(sys_, rows)
            report["sets"][tname][sname] = metrics(rows, preds)
            if tname == "unseen":
                unseen_preds[sname] = preds
                report["sets"][tname][sname]["slots"] = slot_metrics(rows, preds)
                report["sets"][tname][sname]["by_script"] = by_script(rows, preds)
        print(f"{tname:28}", "  ".join(
            f"{s}={report['sets'][tname][s]['accuracy']:.3f}" for s in systems))

    # Confusions of v3 on the hand-written set
    rows = tests["unseen"]
    conf = Counter((r["intent"], p["pred"]) for r, p in zip(rows, unseen_preds["v3"])
                   if r["intent"] != p["pred"])
    errors = [(r["text"], r["intent"], p["pred"], p["conf"])
              for r, p in zip(rows, unseen_preds["v3"]) if r["intent"] != p["pred"]]
    report["v3_unseen_confusions"] = [[a, b, n] for (a, b), n in conf.most_common()]
    report["v3_unseen_errors"] = errors

    # Latency of the full pipeline with the v3 model
    lat = []
    for r in rows[:100]:
        t = time.perf_counter()
        parse(r["text"], r["contacts"], model=systems["v3"])
        lat.append((time.perf_counter() - t) * 1000)
    lat.sort()
    report["latency_ms"] = {"p50": statistics.median(lat), "p95": lat[int(0.95 * len(lat)) - 1]}

    REPORTS.mkdir(exist_ok=True)
    (REPORTS / f"{args.out}.json").write_text(json.dumps(report, ensure_ascii=False, indent=1))
    (REPORTS / f"{args.out}.md").write_text(render(report, systems.keys()))
    print(f"latency p50={report['latency_ms']['p50']:.1f}ms p95={report['latency_ms']['p95']:.1f}ms")
    print(f"wrote reports/{args.out}.md")


def render(report: dict, systems) -> str:
    systems = list(systems)
    L = ["# SayPay NLU evaluation", "", f"Generated {report['generated']}. "
         "Test sets are never used for training or tuning; training rows that are "
         "near-duplicates of any test row are removed.", ""]
    L += ["## Intent accuracy", "", "| test set | n | " + " | ".join(systems) + " |",
          "|---|---|" + "---|" * len(systems)]
    for t, res in report["sets"].items():
        L.append(f"| {TEST_LABELS.get(t, t)} | {res[systems[0]]['n']} | " +
                 " | ".join(pct(res[s]["accuracy"]) for s in systems) + " |")
    L += ["", "## Safety on the hand-written set", "",
          "| system | acted without asking | right when it acted | confident wrong **send** | macro-F1 | ECE |",
          "|---|---|---|---|---|---|"]
    for s in systems:
        m = report["sets"]["unseen"][s]
        L.append(f"| {s} | {pct(m['auto_rate'])} | {pct(m['auto_acc'])} | {pct(m['unsafe_send'])} "
                 f"| {m['macro_f1']:.3f} | {m['ece']:.3f} |")
    L += ["", "Below 0.8 confidence the app asks a clarifying question instead of acting; "
          "every send is still read back and approved with a fingerprint.", "",
          "## Slots on the hand-written set (rules, identical for all systems)", ""]
    sl = report["sets"]["unseen"]["v3"]["slots"]
    L += [f"- amount: {pct(sl['amount_acc'])} of {sl['n_amount']}",
          f"- unit: {pct(sl['unit_acc'])} of {sl['n_unit']}",
          f"- contact: {pct(sl['contact_acc'])} of {sl['n_contact']}", "",
          "## Accuracy by script / language (hand-written set)", "",
          "| script | n | " + " | ".join(systems) + " |", "|---|---|" + "---|" * len(systems)]
    scripts = report["sets"]["unseen"]["v3"]["by_script"]
    for sc, (_, n) in scripts.items():
        L.append(f"| {sc} | {n} | " + " | ".join(
            pct(report["sets"]["unseen"][s]["by_script"][sc][0]) for s in systems) + " |")
    L += ["", "## Real-speaker sets: calibration and safety (v3)", "",
          "| test set | acted without asking | right when it acted | confident wrong send |",
          "|---|---|---|---|"]
    for t, res in report["sets"].items():
        if t == "unseen":
            continue
        m = res["v3"]
        L.append(f"| {TEST_LABELS.get(t, t)} | {pct(m['auto_rate'])} | {pct(m['auto_acc'])} | "
                 f"{pct(m['unsafe_send'])} |")
    L += ["", "## v3 errors on the hand-written set", "", "| text | gold | predicted | conf |",
          "|---|---|---|---|"]
    for text, gold, pred, c in report["v3_unseen_errors"]:
        L.append(f"| {text} | {gold} | {pred} | {c:.2f} |")
    lat = report["latency_ms"]
    L += ["", f"Latency, v3 (full pipeline, CPU): p50 {lat['p50']:.1f} ms, p95 {lat['p95']:.1f} ms.", ""]
    for name, meta in report.get("models", {}).items():
        if meta and meta.get("kind") == "zeroshot":
            L.append(f"- **{name}**: {meta.get('model')} (no training on our data)")
        elif meta:
            L.append(f"- **{name}**: `{meta.get('model')}`, {meta.get('n_params', 0) / 1e6:.0f}M params, "
                     f"dev macro-F1 {meta.get('best_dev_macro_f1', 0):.3f}, "
                     f"latency p50 {meta.get('latency_ms_p50', 0):.1f} ms on {meta.get('device')}")
    L.append("")
    return "\n".join(L)


if __name__ == "__main__":
    main()
