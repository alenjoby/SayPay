# SayPay NLU evaluation

Generated 2026-09-25 12:15. Test sets are never used for training or tuning; training rows that are near-duplicates of any test row are removed.

## Intent accuracy

| test set | n | english_only | rules_v1 | v3 |
|---|---|---|---|---|
| Hand-written, never-seen phrasings (all 3 languages) | 161 | 56.5% | 53.4% | 88.8% |
| Banking77 English (real) | 640 | 94.4% | 55.0% | 95.6% |
| CLINC150 English (real, incl. out-of-scope) | 610 | 95.7% | 68.5% | 96.1% |
| ArBanking77 MSA (real) | 678 | 61.9% | 45.7% | 95.9% |
| ArBanking77 Levantine (real) | 677 | 63.1% | 48.6% | 92.9% |
| ArBanking77 Saudi dialect (real speakers) | 679 | 62.2% | 52.4% | 91.9% |
| ArBanking77 Moroccan (real, unseen dialect) | 678 | 60.0% | 44.5% | 87.3% |
| ArBanking77 Tunisian (real, unseen dialect) | 485 | 78.8% | 67.2% | 84.5% |
| MASSIVE Arabic, out-of-scope (must say unknown) | 400 | 96.8% | 69.0% | 95.8% |
| MASSIVE Hindi, out-of-scope (must say unknown) | 400 | 97.5% | 70.8% | 99.2% |
| MASSIVE English, out-of-scope (must say unknown) | 400 | 96.8% | 68.0% | 96.8% |

## Safety on the hand-written set

| system | acted without asking | right when it acted | confident wrong **send** | macro-F1 | ECE |
|---|---|---|---|---|---|
| english_only | 60.9% | 72.4% | 0.8% | 0.571 | 0.229 |
| rules_v1 | 29.2% | 87.2% | 4.5% | 0.528 | 0.087 |
| v3 | 78.3% | 99.2% | 0.0% | 0.874 | 0.039 |

Below 0.8 confidence the app asks a clarifying question instead of acting; every send is still read back and approved with a fingerprint.

## Slots on the hand-written set (rules, identical for all systems)

- amount: 96.8% of 31
- unit: 100.0% of 17
- contact: 100.0% of 50

## Accuracy by script / language (hand-written set)

| script | n | english_only | rules_v1 | v3 |
|---|---|---|---|---|
| ar | 58 | 36.2% | 50.0% | 91.4% |
| ar+en | 10 | 90.0% | 100.0% | 100.0% |
| arabizi | 16 | 25.0% | 25.0% | 93.8% |
| en | 44 | 86.4% | 52.3% | 84.1% |
| hi_deva | 11 | 54.5% | 54.5% | 63.6% |
| hi_latin | 22 | 59.1% | 63.6% | 95.5% |

## Real-speaker sets: calibration and safety (v3)

| test set | acted without asking | right when it acted | confident wrong send |
|---|---|---|---|
| Banking77 English (real) | 91.1% | 98.8% | 0.0% |
| CLINC150 English (real, incl. out-of-scope) | 90.7% | 99.1% | 0.0% |
| ArBanking77 MSA (real) | 89.5% | 99.3% | 0.0% |
| ArBanking77 Levantine (real) | 86.0% | 96.9% | 0.0% |
| ArBanking77 Saudi dialect (real speakers) | 85.3% | 96.2% | 0.0% |
| ArBanking77 Moroccan (real, unseen dialect) | 77.0% | 94.4% | 0.1% |
| ArBanking77 Tunisian (real, unseen dialect) | 64.7% | 92.4% | 0.2% |
| MASSIVE Arabic, out-of-scope (must say unknown) | 87.5% | 97.7% | 0.2% |
| MASSIVE Hindi, out-of-scope (must say unknown) | 98.5% | 99.7% | 0.2% |
| MASSIVE English, out-of-scope (must say unknown) | 91.5% | 98.4% | 0.0% |

## v3 errors on the hand-written set

| text | gold | predicted | conf |
|---|---|---|---|
| मेरे खाते में कितना बचा है | check_balance | unknown | 0.74 |
| شنو صار في حسابي الاسبوع اللي طاف | history | unknown | 0.64 |
| pull up my payment log | history | unknown | 0.64 |
| any update on the payment to dad | tx_status | unknown | 0.94 |
| पैसे पहुंचे या नहीं | tx_status | cancel | 0.65 |
| how do people send me stuff | receive | unknown | 0.57 |
| ask rahul for 50 | receive | send | 0.42 |
| Priya se 100 maango | receive | send | 0.67 |
| حطه عندي في الارقام | add_contact | check_balance | 0.69 |
| خزن رقم يوسف | add_contact | unknown | 0.53 |
| اللي أرسل لي قبل شوي سجله باسم عمر | add_contact | unknown | 0.54 |
| sajlah b esm salem | add_contact | unknown | 0.57 |
| put the copied address under maryam | add_contact | receive | 0.32 |
| i want to save noura | add_contact | unknown | 0.65 |
| दीपक का नंबर सेव कर लो | add_contact | unknown | 0.72 |
| ما عاد أقدر أفتح المحفظة | recovery_help | unknown | 0.40 |
| got a brand new handset, need my wallet back | recovery_help | check_balance | 0.64 |
| मोबाइल गुम हो गया अब क्या करूं | recovery_help | unknown | 0.78 |

Latency, v3 (full pipeline, CPU): p50 6.5 ms, p95 11.4 ms.

