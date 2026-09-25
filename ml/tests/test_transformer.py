from saypay_nlu.transformer import Ensemble, OnnxIntentModel


class _Fixed:
    def __init__(self, probs):
        self.probs = probs

    def predict_one(self, text, contacts=None):
        return self.probs


def test_ensemble_averages():
    e = Ensemble(_Fixed({"send": 0.9, "cancel": 0.1}), _Fixed({"send": 0.5, "cancel": 0.5}))
    assert e.predict_one("x") == {"send": 0.7, "cancel": 0.3}


def test_missing_onnx_model_is_none(tmp_path):
    assert OnnxIntentModel.load(tmp_path) is None
