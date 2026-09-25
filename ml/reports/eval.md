# SayPay NLU evaluation

Generated 2026-09-25 14:47. Test sets are never used for training or tuning; training rows that are near-duplicates of any test row are removed.

## Intent accuracy

| test set | n | english_only | rules_v1 | v3 |
|---|---|---|---|---|
| **BLIND hand-written v2** (frozen before v4 changes) | 120 | 68.3% | 65.0% | 96.7% |
| Hand-written v1 (errors studied: now a dev set) | 161 | 58.4% | 53.4% | 91.9% |
| Banking77 English (real) | 640 | 96.6% | 61.6% | 97.0% |
| CLINC150 English (real, incl. out-of-scope) | 610 | 95.9% | 71.5% | 96.2% |
| ArBanking77 MSA (real) | 678 | 61.1% | 46.0% | 96.9% |
| ArBanking77 Levantine (real) | 677 | 62.6% | 51.7% | 93.6% |
| ArBanking77 Saudi dialect (real speakers) | 679 | 61.9% | 53.3% | 94.3% |
| ArBanking77 Moroccan (real, unseen dialect) | 678 | 60.0% | 50.1% | 90.0% |
| ArBanking77 Tunisian (real, unseen dialect) | 485 | 78.1% | 66.2% | 87.0% |
| MASSIVE Arabic, out-of-scope (must say unknown) | 400 | 93.0% | 70.2% | 98.0% |
| MASSIVE Hindi, out-of-scope (must say unknown) | 400 | 94.5% | 74.8% | 99.8% |
| MASSIVE English, out-of-scope (must say unknown) | 400 | 97.2% | 64.5% | 97.8% |

## Safety on the blind hand-written set

| system | acted without asking | right when it acted | confident wrong **send** | macro-F1 | ECE |
|---|---|---|---|---|---|
| english_only | 60.0% | 88.9% | 0.0% | 0.684 | 0.126 |
| rules_v1 | 45.0% | 83.3% | 9.0% | 0.674 | 0.104 |
| v3 | 90.0% | 100.0% | 0.0% | 0.965 | 0.037 |

Below 0.8 confidence the app asks a clarifying question instead of acting; every send is still read back and approved with a fingerprint.

## Slots on the blind hand-written set (rules, identical for all systems)

- amount: 100.0% of 26
- unit: 100.0% of 13
- contact: 93.2% of 44

## Accuracy by script / language (blind hand-written set)

| script | n | english_only | rules_v1 | v3 |
|---|---|---|---|---|
| ar | 46 | 52.2% | 71.7% | 95.7% |
| ar+en | 5 | 80.0% | 60.0% | 100.0% |
| arabizi | 10 | 40.0% | 30.0% | 100.0% |
| en | 36 | 94.4% | 66.7% | 97.2% |
| hi_deva | 9 | 55.6% | 55.6% | 100.0% |
| hi_latin | 14 | 78.6% | 71.4% | 92.9% |

## Real-speaker sets: calibration and safety (v3)

| test set | acted without asking | right when it acted | confident wrong send |
|---|---|---|---|
| Banking77 English (real) | 92.7% | 99.0% | 0.0% |
| CLINC150 English (real, incl. out-of-scope) | 90.5% | 98.2% | 0.0% |
| ArBanking77 MSA (real) | 91.7% | 99.0% | 0.0% |
| ArBanking77 Levantine (real) | 89.7% | 98.2% | 0.0% |
| ArBanking77 Saudi dialect (real speakers) | 90.3% | 97.7% | 0.0% |
| ArBanking77 Moroccan (real, unseen dialect) | 78.2% | 97.0% | 0.0% |
| ArBanking77 Tunisian (real, unseen dialect) | 67.4% | 96.3% | 0.0% |
| MASSIVE Arabic, out-of-scope (must say unknown) | 90.0% | 99.4% | 0.0% |
| MASSIVE Hindi, out-of-scope (must say unknown) | 99.2% | 100.0% | 0.0% |
| MASSIVE English, out-of-scope (must say unknown) | 92.8% | 98.4% | 0.0% |

## v3 errors on the blind hand-written set

| text | gold | predicted | conf |
|---|---|---|---|
| قديش صار معي هلق | check_balance | add_contact | 0.32 |
| بطل | cancel | unknown | 0.59 |
| changed my mind | cancel | unknown | 0.73 |
| Rahul ko video bhejo | unknown | send | 0.73 |

Latency, v3 (full pipeline, CPU): p50 5.9 ms, p95 13.9 ms.

