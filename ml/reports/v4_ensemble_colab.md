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

Pending: safety table (confident wrong sends) for the ensemble on blind_v2.
The int8 per-channel export from this run was broken (37/300 agreement) and was
not used; export_onnx.py now rejects any export below 95% agreement.
