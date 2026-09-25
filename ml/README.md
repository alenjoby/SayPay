# SayPay: intent API (AI/ML)

Turns a spoken or typed command in **Arabic, English or Hindi**, including mixes of them
and Arabizi, into **one proposed action** with a confidence score. The API never
moves money: the app reads the action back and the user approves with a fingerprint.

```
"حوّل 0.1 إيثيريوم لأمي"  ->  send 0.1 ETH to Amma  (0.99)
"Rahul ko 500 bhejo"      ->  send 500 to Rahul     (0.99)
"did my last transfer go through?" -> tx_status {ordinal: last}
```

Engine: **v3 + mmBERT ensemble** when `models/mmbert_int8/` is present, else **tfidf-v3**.
The intent is decided by averaging a TF-IDF model (three text views + rule
features, calibrated) and a fine-tuned mmBERT (int8 ONNX on CPU). See
[`reports/compare.md`](reports/compare.md) for why (v3+mmBERT is significantly
better than either alone on unseen dialects). Amounts, units, recipients
and safety checks stay rule-based. `SAYPAY_ENGINE=rules` falls back to the v1
keyword rules; `SAYPAY_ENGINE=v3` skips the transformer. Results: [`reports/eval.md`](reports/eval.md).

## Train and evaluate

```bash
python -m datagen.generate          # synthetic commands from templates + noise
python scripts/fetch_external.py    # Banking77, ArBanking77, MASSIVE (real speakers)
python scripts/train.py             # -> models/intent_v3.joblib (+ English-only baseline)
python scripts/evaluate.py          # -> reports/eval.md
```

### Transformer comparison (XLM-R, mmBERT/Laya) on a free GPU

Open `notebooks/compare_models.ipynb` in Colab (T4). It rebuilds the same data, exports the
same splits (`scripts/export_splits.py`), fine-tunes `xlm-roberta-base` and
`jhu-clsp/mmBERT-base` (Laya-multilingual's encoder) with `scripts/finetune_transformer.py`,
runs Laya zero-shot (`scripts/laya_zeroshot.py`), and scores everything with the same
evaluation, including v3 + transformer ensembles:

```bash
python scripts/evaluate.py --preds preds/xlmr preds/mmbert preds/laya_zeroshot --out compare
```

Test sets are never used for training or tuning:
`data/test/unseen.tsv` (hand-written, frozen), the external `*_test` splits, and
ArBanking77's Saudi/Moroccan/Tunisian sets (dialects absent from training).
Tuning uses held-out templates plus `data/test/dev_handwritten.tsv`. Training
rows that are near-duplicates of any test row are removed.

## Run

```bash
cd ml
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000     # API docs at http://localhost:8000/docs
python -m saypay_nlu "حول 0.1 لأمي" --contacts Amma,Ahmed   # try from the shell
pytest -q
```

On a 2 GB VPS run a single worker (the Dockerfile does) and add swap as a safety net
(`fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`).
The mmBERT model (~300 MB) is too large for git: export it with the last cell of
`notebooks/compare_models.ipynb` and unzip it to `models/mmbert_int8/` on the server.

Docker (VPS): `docker build -t saypay-nlu . && docker run -p 8000:8000 saypay-nlu`.
The browser mic only works on HTTPS, so put the API behind a TLS reverse proxy
(e.g. Caddy) and set `SAYPAY_CORS_ORIGINS=https://your-frontend-domain`.

## Demo on a local PC (recommended: full-precision model)

On a machine with 8 GB+ RAM, use the **fp32** mmBERT export: no quantization loss
(the numbers in `reports/compare.md` for v3+mmbert). Export it on Colab with
`python scripts/export_onnx.py --model preds/mmbert/hf --out models/mmbert_fp32 --fp32`
and unzip it to `ml/models/mmbert_fp32/`. The API prefers `mmbert_fp32`, then `mmbert_int8`.

```bash
cd ml
python -m venv .venv && .venv\Scripts\activate      # Windows (Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt
python scripts/check_deploy.py                       # engine, RAM, latency
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000/` for a small test page: speak (Chrome/Edge speech
recognition in Arabic, Hindi or English) or type a command and see what the model
understood, with the full JSON. The browser microphone works on `http://localhost`
without HTTPS. To demo from a
phone (mic + fingerprint need HTTPS), expose the frontend and API through a tunnel
such as `cloudflared tunnel --url http://localhost:8000`.

## API

### `POST /intent`

```json
{ "text": "ارسل خمسمية درهم لأحمد", "contacts": ["Amma", "Ahmed", "Rahul"] }
```

`contacts` are the names saved on the device. Optional `reply_lang` (`ar`, `en`, `hi`)
sets the language of `readback`; by default it is the language the user spoke. Addresses never leave the phone.

```json
{
  "intent": "send",
  "confidence": 0.991,
  "needs_clarification": false,
  "clarification": null,
  "alternatives": [{"intent": "check_balance", "score": 0.001}, ...],
  "amount": 500.0,
  "unit": "AED",
  "recipient": {"type": "contact", "value": "Ahmed", "contact": "Ahmed", "score": 0.97},
  "contact": "Ahmed",
  "phone": null,
  "name": null,
  "source": null,
  "similar_contacts": [],
  "tx_ref": null,
  "lang_mix": ["ar"],
  "normalized_text": "ارسل خمسميه درهم لاحمد",
  "readback": {"text": "حوّل خمسمية درهم إلى Ahmed. أكّد ببصمتك.", "lang": "ar"},
  "engine": "rules-v1",
  "scores": null
}
```

Add `?debug=true` to get the raw per-intent `scores`.

### Intents

| intent | example |
|---|---|
| `check_balance` | كم رصيدي؟ · what's my balance · mera balance kitna hai |
| `send` | حوّل 0.1 لأمي · send 5 eth to 0501234567 · Rahul ko 500 bhejo |
| `history` | شو آخر عملية؟ · show my transactions · pichla transaction dikhao |
| `tx_status` | وصلت الفلوس لأحمد؟ · did it go through? · pahuncha kya |
| `receive` | عطني عنواني · what's my address · mera address kya hai |
| `add_contact` | سجله باسم خالد · add the address I copied as Omar |
| `recovery_help` | ضاع تلفوني · I lost my phone · mera phone kho gaya |
| `cancel` | لا خلاص · cancel / don't send · rehne do |
| `unknown` | nothing matched: ask the user to repeat |

### How the app should use the response

- **`readback`**: the sentence to announce before anything happens. Put `readback.text`
  in the aria-live region with `lang` set to `readback.lang` (the screen reader switches
  voice), or pass it to `speechSynthesis` when no screen reader is running. Amounts are in
  words ("zero point one test ETH"), phone numbers digit by digit, and clarifications are
  phrased as questions ("How much should I send to Ahmed?").

- **`needs_clarification: true` → ask, never act.** `clarification` says what to ask:
  - `{"type": "choose_intent", "options": ["send", "receive"]}`: "Did you mean send or receive?"
  - `{"type": "missing", "slots": ["recipient"]}`: "Who should I send it to? Say a name or phone number, or scan a code."
  - `{"type": "unknown"}`: "Sorry, please say that again."
- **`recipient.type`**: the user never speaks or hears an address.

  | type | app does |
  |---|---|
  | `contact` | look up the address in the on-device address book |
  | `phone` | look up the SayPay user registered with that number |
  | `ens` / `handle` | resolve the name |
  | `address` | pasted 0x address: read its voice code back and warn it's new |
  | `clipboard` | read the clipboard and read its voice code back |
  | `qr` | open the scanner with audio guidance |
  | `self` | block: "That's your own wallet" |
- **`unit`**: `null` means the user didn't say one. Use the default currency in the read-back.
- **`tx_ref`**: the user describes a transaction (`ordinal`, `when`, `direction`,
  `contact`, `amount`, or a pasted `hash`). Match it against the local transaction list.
- **`add_contact`**: `name` is the name to save. `source` is where the address comes from
  (`clipboard`, `qr`, `phone`, `last_sender`, or `null` to open the contact picker).
  `similar_contacts` lists existing names that sound the same, so the app can ask
  "You already have Ahmed. Is this a different person?"

## What the rules handle

- **Scripts**: Arabic (diacritics, alef/ya/ta-marbuta variants, Arabic-Indic digits,
  clitics like `لـ`/`و`/`ال`), Arabizi (`7awel`, `3indi`), Devanagari, and Latin, plus
  English words glued to Arabic (`الـbalance`).
- **Amounts** (rules only, never the model): digits, `٠٫١`, `1,000`, `5k`, and number words
  in English, Gulf/MSA Arabic (`خمسمية`, `الفين وخمسمية`, `صفر فاصلة واحد`, `نص`) and Hindi
  (`paanch sau`, `dedh hazaar`, `नौ सौ`).
- **Units**: ETH, AED, SAR, KWD, USD, INR, EUR, … in all three languages.
- **Contacts across scripts**: `Ahmed` = `Ahmad` = `أحمد` = `अहमद` (phonetic key + fuzzy
  match), with family words (`أمي`, `mom`, `mummy`, `ماما`, `मम्मी` all match "Amma").
- **Negation**: `don't send`, `لا ترسل`, `mat bhejo` → `cancel`.

## Layout

```
saypay_nlu/
  normalize.py   scripts, digits, Arabizi, tokens
  phonetic.py    Arabic/Devanagari -> Latin, phonetic keys
  numbers.py     amounts, units, phone numbers
  recipients.py  contacts, address, ENS, phone, clipboard, QR, self
  intents.py     keyword lexicon + scoring
  txref.py       "my last transfer to Ahmed"
  pipeline.py    puts it together -> ParseResult
app/             FastAPI service
tests/
```

## Roadmap

- **v2 data**: seed commands per intent (Arabic → English → Hindi) plus LLM expansion for
  training. The test set comes from real speakers (ArBanking77, MASSIVE, and native
  speakers recorded at the event), never from the LLM.
- **v3**: TF-IDF char n-gram + LogisticRegression intent model.
- **v4**: fine-tuned `xlm-roberta-base` (covers ar/en/hi; MuRIL has no Arabic), combined
  with v3 + rules.
- **v5**: evaluation (intent / amount / contact accuracy per language) against an
  English-only baseline.
