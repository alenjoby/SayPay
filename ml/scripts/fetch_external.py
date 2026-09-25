"""Download real-speaker datasets and map them onto SayPay intents.

    python scripts/fetch_external.py        # writes data/external/*.jsonl

Sources (all used under their licenses, not redistributed in this repo):
- Banking77 (PolyAI, CC BY 4.0): English banking questions.
- ArBanking77 (SinaLab, CC BY-SA 4.0): Arabic Banking77 in MSA and Palestinian
  (train), with separate test sets in MSA, Palestinian, Saudi, Moroccan, Tunisian.
- MASSIVE 1.1 (Amazon, CC BY 4.0): assistant commands in ar-SA, hi-IN, en-US.
  None are wallet commands, so they are "unknown" (out-of-scope) examples.

Only Banking77 intents with a clear SayPay equivalent are mapped. Card / ATM /
identity questions become "unknown". Ambiguous ones (top-ups, fees, balance
not updated, refunds...) are dropped rather than guessed.
"""

from __future__ import annotations

import csv
import io
import json
import random
import subprocess
import tarfile
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "external"
CACHE = ROOT / "data" / "cache"

BANKING77 = "https://raw.githubusercontent.com/PolyAI-LDN/task-specific-datasets/master/banking_data/{}.csv"
ARBANKING77_GIT = "https://github.com/SinaLab/ArBanking77"
MASSIVE = "https://amazon-massive-nlu-dataset.s3.amazonaws.com/amazon-massive-dataset-1.1.tar.gz"

MAP = {
    "lost_or_stolen_phone": "recovery_help",
    "pending_transfer": "tx_status",
    "transfer_not_received_by_recipient": "tx_status",
    "failed_transfer": "tx_status",
    "cancel_transfer": "cancel",
    "receiving_money": "receive",
}
OUT_OF_SCOPE = {
    "card_arrival", "card_linking", "card_delivery_estimate", "card_not_working",
    "lost_or_stolen_card", "age_limit", "pin_blocked", "contactless_not_working",
    "getting_virtual_card", "card_acceptance", "edit_personal_details", "why_verify_identity",
    "unable_to_verify_identity", "get_physical_card", "visa_or_mastercard",
    "disposable_card_limits", "compromised_card", "atm_support", "card_swallowed", "change_pin",
    "getting_spare_card", "order_physical_card", "virtual_card_not_working",
    "get_disposable_virtual_card", "activate_my_card", "card_about_to_expire",
    "apple_pay_or_google_pay", "verify_my_identity", "country_support",
    "declined_cash_withdrawal", "cash_withdrawal_charge", "pending_cash_withdrawal",
    "wrong_exchange_rate_for_cash_withdrawal", "cash_withdrawal_not_recognised",
    "card_payment_fee_charged", "declined_card_payment", "pending_card_payment",
    "card_payment_not_recognised", "card_payment_wrong_exchange_rate",
    "reverted_card_payment?", "wrong_amount_of_cash_received",
}
# Keep "unknown" from dominating: at most this many per source split.
UNKNOWN_CAP = {"train": 700, "test": 400}


def _map(label: str) -> str | None:
    key = label.strip().lower().replace(" ", "_")
    if key in MAP:
        return MAP[key]
    if key in OUT_OF_SCOPE:
        return "unknown"
    return None


def _fetch(url: str, dest: Path) -> Path:
    if not dest.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        print(f"downloading {url}")
        urllib.request.urlretrieve(url, dest)
    return dest


def _cap_unknown(rows: list[dict], split: str, rng: random.Random) -> list[dict]:
    known = [r for r in rows if r["intent"] != "unknown"]
    unk = [r for r in rows if r["intent"] == "unknown"]
    rng.shuffle(unk)
    return known + unk[: UNKNOWN_CAP[split]]


def banking77(rng: random.Random) -> dict[str, list[dict]]:
    out = {}
    for split in ("train", "test"):
        path = _fetch(BANKING77.format(split), CACHE / f"banking77_{split}.csv")
        rows = []
        with open(path, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                intent = _map(r["category"])
                if intent:
                    rows.append({"text": r["text"], "intent": intent, "lang": "en",
                                 "source": f"banking77_{split}", "orig_label": r["category"]})
        out[f"banking77_{split}"] = _cap_unknown(rows, split, rng)
    return out


def arbanking77(rng: random.Random) -> dict[str, list[dict]]:
    repo = CACHE / "ArBanking77"
    if not repo.exists():
        subprocess.run(["git", "clone", "--depth", "1", ARBANKING77_GIT, str(repo)], check=True)
    data = repo / "data"
    ar_to_en = {}
    with open(data / "Banking77_intents.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            ar_to_en[r["label_ar"].strip()] = r["label_en"].strip()
    files = {
        "arbanking77_train": ("Banking77_Arabized_MSA_PAL_train.csv", "train", "ar_msa_pal"),
        "arbanking77_msa_test": ("Banking77_Arabized_MSA_test.csv", "test", "ar_msa"),
        "arbanking77_pal_test": ("Banking77_Arabized_PAL_test.csv", "test", "ar_lev"),
        "arbanking77_saudi_test": ("Banking77_Arabized_Saudi_test.csv", "test", "ar_gulf"),
        "arbanking77_moroccan_test": ("Banking77_Arabized_Moroccan_test.csv", "test", "ar_mor"),
        "arbanking77_tunisian_test": ("Banking77_Arabized_Tunisian_test.csv", "test", "ar_tun"),
    }
    out = {}
    for name, (fn, split, variety) in files.items():
        rows = []
        with open(data / fn, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                en = ar_to_en.get(r["label"].strip())
                intent = _map(en) if en else None
                if intent and r["text"].strip():
                    rows.append({"text": r["text"].strip(), "intent": intent, "lang": "ar",
                                 "variety": variety, "source": name, "orig_label": en})
        out[name] = _cap_unknown(rows, split, rng)
    return out


def massive(rng: random.Random) -> dict[str, list[dict]]:
    path = _fetch(MASSIVE, CACHE / "massive-1.1.tar.gz")
    out = {}
    with tarfile.open(path) as tar:
        for locale, lang in (("ar-SA", "ar"), ("hi-IN", "hi"), ("en-US", "en")):
            member = tar.getmember(f"1.1/data/{locale}.jsonl")
            lines = io.TextIOWrapper(tar.extractfile(member), encoding="utf-8").read().splitlines()
            by_part: dict[str, list[dict]] = {"train": [], "test": []}
            for ln in lines:
                r = json.loads(ln)
                if r["partition"] in by_part:
                    by_part[r["partition"]].append({
                        "text": r["utt"], "intent": "unknown", "lang": lang,
                        "source": f"massive_{lang}_{r['partition']}", "orig_label": r["intent"]})
            for part, rows in by_part.items():
                rng.shuffle(rows)
                out[f"massive_{lang}_{part}"] = rows[: UNKNOWN_CAP[part]]
    return out


def main() -> None:
    rng = random.Random(13)
    OUT.mkdir(parents=True, exist_ok=True)
    all_sets = {**banking77(rng), **arbanking77(rng), **massive(rng)}
    for name, rows in all_sets.items():
        with open(OUT / f"{name}.jsonl", "w", encoding="utf-8") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(f"{name:28} {len(rows):5}  {dict(Counter(r['intent'] for r in rows))}")


if __name__ == "__main__":
    main()
