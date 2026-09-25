import pytest

from saypay_nlu.normalize import tokenize
from saypay_nlu.numbers import extract_numbers, pick_amount


@pytest.mark.parametrize("text,value,unit", [
    # English
    ("send 0.1 eth to amma", 0.1, "ETH"),
    ("zero point zero five eth", 0.05, "ETH"),
    ("one and a half eth", 1.5, "ETH"),
    ("two hundred and fifty", 250, None),
    ("give me 1,000.50 dollars", 1000.5, "USD"),
    ("send half an eth", 0.5, "ETH"),
    ("5k aed", 5000, "AED"),
    ("send 5eth", 5, "ETH"),
    # Arabic
    ("حوّل ٠٫١ إيثيريوم لأمي", 0.1, "ETH"),
    ("ارسل خمسمية درهم لأحمد", 500, "AED"),
    ("خمسه وعشرين دولار", 25, "USD"),
    ("الفين وخمسميه", 2500, None),
    ("صفر فاصلة واحد ايث", 0.1, "ETH"),
    ("نص ايثيريوم", 0.5, "ETH"),
    ("ثلاث آلاف ريال", 3000, "SAR"),
    ("حول 7 الاف", 7000, None),
    ("١٠٠ درهم", 100, "AED"),
    ("حول ميه", 100, None),
    # Hindi
    ("Rahul ko 500 bhejo", 500, None),
    ("paanch sau rupaye", 500, "INR"),
    ("Rahul ko do ETH bhejo", 2, "ETH"),
    ("dedh hazaar", 1500, None),
    ("ek sau pachas", 150, None),
    ("नौ सौ रुपये", 900, "INR"),
    ("पाँच हज़ार", 5000, None),
    ("राहुल को डेढ़ ईथर भेजो", 1.5, "ETH"),
])
def test_amounts(text, value, unit):
    span = pick_amount(extract_numbers(tokenize(text)))
    assert span is not None
    assert span.value == pytest.approx(value)
    assert span.unit == unit


@pytest.mark.parametrize("text", ["rehne do", "send it to ahmed.eth", "what is my balance"])
def test_no_amount(text):
    assert pick_amount(extract_numbers(tokenize(text))) is None


@pytest.mark.parametrize("text,phone", [
    ("send 5eth to 0501234567", "0501234567"),
    ("zero five zero one two three four five six seven", "0501234567"),
    ("send 2 eth to +971 50 123 4567", "+971501234567"),
])
def test_phone(text, phone):
    spans = [s for s in extract_numbers(tokenize(text)) if s.kind == "phone"]
    assert spans and spans[0].text == phone
