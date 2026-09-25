# SayPay NLU evaluation

Generated 2026-09-25 11:43. Test sets are never used for training or tuning; training rows that are near-duplicates of any test row are removed.

## Intent accuracy

| test set | n | english_only | rules_v1 | v3 |
|---|---|---|---|---|
| Hand-written, never-seen phrasings (all 3 languages) | 161 | 54.0% | 53.4% | 88.8% |
| Banking77 English (real) | 640 | 95.6% | 55.0% | 96.2% |
| ArBanking77 MSA (real) | 678 | 63.6% | 45.7% | 95.4% |
| ArBanking77 Levantine (real) | 677 | 63.8% | 48.6% | 93.2% |
| ArBanking77 Saudi dialect (real speakers) | 679 | 64.2% | 52.4% | 91.2% |
| ArBanking77 Moroccan (real, unseen dialect) | 678 | 59.7% | 44.5% | 88.3% |
| ArBanking77 Tunisian (real, unseen dialect) | 485 | 80.8% | 67.2% | 83.5% |
| MASSIVE Arabic, out-of-scope (must say unknown) | 400 | 93.8% | 66.2% | 96.5% |
| MASSIVE Hindi, out-of-scope (must say unknown) | 400 | 94.5% | 67.5% | 99.2% |
| MASSIVE English, out-of-scope (must say unknown) | 400 | 98.0% | 66.0% | 98.2% |

## Safety on the hand-written set

| system | acted without asking | right when it acted | confident wrong **send** | macro-F1 | ECE |
|---|---|---|---|---|---|
| english_only | 66.5% | 65.4% | 2.3% | 0.546 | 0.284 |
| rules_v1 | 29.2% | 87.2% | 4.5% | 0.528 | 0.087 |
| v3 | 77.0% | 98.4% | 0.0% | 0.877 | 0.033 |

Below 0.8 confidence the app asks a clarifying question instead of acting; every send is still read back and approved with a fingerprint.

## Slots on the hand-written set (rules, identical for all systems)

- amount: 96.8% of 31
- unit: 100.0% of 17
- contact: 100.0% of 50

## Accuracy by script / language (hand-written set)

| script | n | english_only | rules_v1 | v3 |
|---|---|---|---|---|
| ar | 58 | 34.5% | 50.0% | 91.4% |
| ar+en | 10 | 90.0% | 100.0% | 100.0% |
| arabizi | 16 | 25.0% | 25.0% | 93.8% |
| en | 44 | 79.5% | 52.3% | 81.8% |
| hi_deva | 11 | 45.5% | 54.5% | 72.7% |
| hi_latin | 22 | 63.6% | 63.6% | 95.5% |

## Real-speaker sets: calibration and safety (v3)

| test set | acted without asking | right when it acted | confident wrong send |
|---|---|---|---|
| Banking77 English (real) | 89.5% | 99.0% | 0.0% |
| ArBanking77 MSA (real) | 86.9% | 99.2% | 0.0% |
| ArBanking77 Levantine (real) | 83.8% | 97.2% | 0.0% |
| ArBanking77 Saudi dialect (real speakers) | 82.8% | 96.1% | 0.0% |
| ArBanking77 Moroccan (real, unseen dialect) | 74.8% | 95.1% | 0.0% |
| ArBanking77 Tunisian (real, unseen dialect) | 56.9% | 91.3% | 0.2% |
| MASSIVE Arabic, out-of-scope (must say unknown) | 81.5% | 99.1% | 0.0% |
| MASSIVE Hindi, out-of-scope (must say unknown) | 96.8% | 99.5% | 0.0% |
| MASSIVE English, out-of-scope (must say unknown) | 89.2% | 99.2% | 0.0% |

## v3 errors on the hand-written set

| text | gold | predicted | conf |
|---|---|---|---|
| मेरे खाते में कितना बचा है | check_balance | unknown | 0.66 |
| شنو صار في حسابي الاسبوع اللي طاف | history | unknown | 0.68 |
| what have i spent money on lately | history | check_balance | 0.54 |
| who got money from me yesterday | history | receive | 0.29 |
| pull up my payment log | history | unknown | 0.47 |
| any update on the payment to dad | tx_status | unknown | 0.89 |
| पैसे पहुंचे या नहीं | tx_status | cancel | 0.64 |
| ask rahul for 50 | receive | send | 0.49 |
| Priya se 100 maango | receive | send | 0.67 |
| حطه عندي في الارقام | add_contact | check_balance | 0.84 |
| خزن رقم يوسف | add_contact | unknown | 0.51 |
| اللي أرسل لي قبل شوي سجله باسم عمر | add_contact | unknown | 0.74 |
| sajlah b esm salem | add_contact | unknown | 0.75 |
| remember this person as omar | add_contact | unknown | 0.53 |
| put the copied address under maryam | add_contact | receive | 0.39 |
| ما عاد أقدر أفتح المحفظة | recovery_help | unknown | 0.54 |
| मोबाइल गुम हो गया अब क्या करूं | recovery_help | unknown | 0.73 |
| actually don't | cancel | unknown | 0.53 |

Latency (full pipeline, CPU): p50 7.1 ms, p95 12.9 ms.
