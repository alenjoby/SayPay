# v4 ensemble results (Colab T4, 2026-09-25)

mmBERT-base fine-tuned on the v4 data (best dev macro-F1 0.920, temperature 3.2),
exported to fp32 ONNX (300/300 agreement with PyTorch on dev). Copied from the
Colab log; the full report was lost when the runtime disconnected.

| test set | english_only | rules_v1 | v3 | mmBERT fp32 | **v3 + mmBERT** |
|---|---|---|---|---|---|
| blind_v2 (frozen before v4) | 69.2% | 65.0% | 96.7% | 95.8% | **97.5%** |
| hand-written v1 (dev) | 57.8% | 53.4% | 91.9% | 93.8% | **95.7%** |
| ArBanking77 Saudi | 61.9% | 53.3% | 94.3% | 97.1% | **97.3%** |
| ArBanking77 Moroccan (unseen dialect) | 60.0% | 50.1% | 90.0% | 89.5% | **92.5%** |
| ArBanking77 Tunisian (unseen dialect) | 78.1% | 66.2% | 87.0% | 83.9% | **94.0%** |

## Safety on blind_v2 (second identical run, same seed and numbers)

| system | acted without asking | right when it acted | confident wrong send | macro-F1 | ECE |
|---|---|---|---|---|---|
| english_only | 60.8% | 89.0% | 0.0% | 0.694 | 0.120 |
| rules_v1 | 45.0% | 83.3% | 9.0% | 0.674 | 0.101 |
| v3 | 90.8% | 100.0% | 0.0% | 0.965 | 0.034 |
| mmBERT fp32 | 94.2% | 96.5% | 0.0% | 0.954 | 0.024 |
| **v3 + mmBERT** | 90.0% | **100.0%** | **0.0%** | **0.972** | 0.038 |

**Decision:** demo on v3 + mmBERT fp32 (local PC). Low-RAM servers run v3 alone:
the per-tensor int8 export reached only 280/300 dev agreement and was rejected.
The int8 per-channel export from this run was broken (37/300 agreement) and was
not used; export_onnx.py now rejects any export below 95% agreement.
