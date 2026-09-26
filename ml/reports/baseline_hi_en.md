# SayPay NLU evaluation

Generated 2026-09-26 07:00. Test sets are never used for training or tuning; training rows that are near-duplicates of any test row are removed.

## Intent accuracy

| test set | n | english_only | rules_v1 | v3 |
|---|---|---|---|---|
| **BLIND hand-written v2** (frozen before v4 changes) | 120 | 69.2% | 65.0% | 96.7% |
| blind_hi | 79 | 70.9% | 77.2% | 87.3% |
| blind_en | 69 | 94.2% | 72.5% | 94.2% |

## Safety on the blind hand-written set

| system | acted without asking | right when it acted | confident wrong **send** | macro-F1 | ECE |
|---|---|---|---|---|---|
| english_only | 60.8% | 89.0% | 0.0% | 0.694 | 0.120 |
| rules_v1 | 45.0% | 83.3% | 9.0% | 0.674 | 0.101 |
| v3 | 90.8% | 100.0% | 0.0% | 0.965 | 0.034 |

Below 0.8 confidence the app asks a clarifying question instead of acting; every send is still read back and approved with a fingerprint.

## Slots on the blind hand-written set (rules, identical for all systems)

- amount: 100.0% of 26
- unit: 100.0% of 13
- contact: 100.0% of 44

## Accuracy by script / language (blind hand-written set)

| script | n | english_only | rules_v1 | v3 |
|---|---|---|---|---|
| ar | 46 | 54.3% | 71.7% | 95.7% |
| ar+en | 5 | 80.0% | 60.0% | 100.0% |
| arabizi | 10 | 40.0% | 30.0% | 100.0% |
| en | 36 | 94.4% | 66.7% | 97.2% |
| hi_deva | 9 | 55.6% | 55.6% | 100.0% |
| hi_latin | 14 | 78.6% | 71.4% | 92.9% |

## Real-speaker sets: calibration and safety (v3)

| test set | acted without asking | right when it acted | confident wrong send |
|---|---|---|---|
| blind_hi | 84.8% | 95.5% | 0.0% |
| blind_en | 91.3% | 96.8% | 0.0% |

## v3 errors on the blind hand-written set

| text | gold | predicted | conf |
|---|---|---|---|
| قديش صار معي هلق | check_balance | add_contact | 0.32 |
| بطل | cancel | unknown | 0.59 |
| changed my mind | cancel | unknown | 0.73 |
| Rahul ko video bhejo | unknown | send | 0.73 |

Latency, v3 (full pipeline, CPU): p50 6.9 ms, p95 16.3 ms.

