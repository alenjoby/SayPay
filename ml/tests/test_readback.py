import pytest

from saypay_nlu import parse
from saypay_nlu.readback import number_words

C = ["Amma", "Ahmed", "Rahul", "Sara"]


@pytest.mark.parametrize("value,lang,words", [
    (0.1, "en", "zero point one"),
    (2500, "en", "two thousand five hundred"),
    (0.1, "ar", "صفر فاصلة واحد"),
    (25, "ar", "خمسة وعشرين"),
    (2500, "ar", "ألفين وخمسمية"),
    (3000, "ar", "ثلاثة آلاف"),
    (500, "hi", "पाँच सौ"),
    (1.5, "hi", "एक दशमलव पाँच"),
    (99, "hi", "निन्यानवे"),
])
def test_number_words(value, lang, words):
    assert number_words(value, lang) == words


def test_send_readback_in_spoken_language():
    rb = parse("حوّل 0.1 إيثيريوم لأمي", C).readback
    assert rb["lang"] == "ar"
    assert "صفر فاصلة واحد" in rb["text"] and "Amma" in rb["text"]


def test_reply_lang_override():
    rb = parse("Rahul ko 500 bhejo", C, reply_lang="en").readback
    assert rb == {"text": "Send five hundred to Rahul. Confirm with your fingerprint.", "lang": "en"}


def test_phone_read_digit_by_digit():
    rb = parse("send 5 eth to 0501234567", C).readback
    assert "zero five zero one two three four five six seven" in rb["text"]


@pytest.mark.parametrize("text,expected", [
    ("send to ahmed", "How much should I send to Ahmed?"),
    ("send 5 eth to myself", "That is your own wallet. Nothing was sent."),
    ("hello", "Sorry, I didn't understand. Please say it again."),
])
def test_clarifications(text, expected):
    assert parse(text, C).readback["text"] == expected
