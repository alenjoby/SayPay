"""SayPay NLU: code-mixed Arabic / English / Hindi voice commands -> actions."""

from .pipeline import CONFIDENCE_THRESHOLD, INTENTS, ParseResult, parse

__version__ = "0.1.0"
ENGINE = "rules-v1"

__all__ = ["parse", "ParseResult", "INTENTS", "CONFIDENCE_THRESHOLD", "ENGINE", "__version__"]
