import pytest

from saypay_nlu.normalize import tokenize
from saypay_nlu.phonetic import phonetic_key
from saypay_nlu.recipients import ContactIndex

CONTACTS = ["Amma", "Ahmed", "Rahul", "Mohammed Ali", "Mahmoud", "Fatima", "Sara", "أبو خالد"]


@pytest.mark.parametrize("a,b", [
    ("Ahmed", "أحمد"), ("Ahmad", "अहमद"), ("Mohammed", "محمد"), ("Khalid", "خالد"),
    ("Fatimah", "فاطمة"), ("Rahul", "राहुल"), ("Yousef", "يوسف"), ("Walid", "وليد"),
])
def test_phonetic_key_cross_script(a, b):
    assert phonetic_key(a) == phonetic_key(b)


@pytest.mark.parametrize("text,expected", [
    ("send 0.1 to amma", "Amma"),
    ("حول لأمي", "Amma"),          # family alias, Arabic
    ("send to mom", "Amma"),       # family alias, English
    ("ارسل لماما", "Amma"),
    ("ارسل خمسمية لأحمد", "Ahmed"),
    ("send to ahmad", "Ahmed"),
    ("راهول", "Rahul"),
    ("राहुल को भेजो", "Rahul"),
    ("حول لمحمد علي", "Mohammed Ali"),
    ("send to mohamed ali", "Mohammed Ali"),
    ("حول لمحمود", "Mahmoud"),
    ("send 5 to fatma", "Fatima"),
    ("اعطي سارة", "Sara"),
    ("حول لابو خالد", "أبو خالد"),
])
def test_contact_match(text, expected):
    r = ContactIndex(CONTACTS).match(tokenize(text), set())
    assert r is not None and r.contact == expected


def test_keyword_is_not_a_contact():
    assert ContactIndex(["Bala"]).match(tokenize("balance"), {0}) is None


def test_similar_names():
    assert ContactIndex(CONTACTS).similar("احمد")[0][0] == "Ahmed"
