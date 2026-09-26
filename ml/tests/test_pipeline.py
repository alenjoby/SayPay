import pytest

from saypay_nlu import parse

C = ["Amma", "Ahmed", "Rahul", "Mohammed Ali", "Sara"]


@pytest.mark.parametrize("text,intent", [
    # check_balance
    ("كم رصيدي؟", "check_balance"),
    ("كم الـbalance حقي", "check_balance"),
    ("شو رصيدي", "check_balance"),
    ("kam 3indi", "check_balance"),
    ("what is my balance", "check_balance"),
    ("mera balance kitna hai", "check_balance"),
    ("मेरा बैलेंस कितना है", "check_balance"),
    # send
    ("حوّل 0.1 إيثيريوم لأمي", "send"),
    ("ارسل خمسمية درهم لأحمد", "send"),
    ("send 0.1 eth to amma", "send"),
    ("Rahul ko 500 bhejo", "send"),
    ("7awel 5 l ahmed", "send"),
    # history
    ("شو آخر عملية؟", "history"),
    ("show my last transactions", "history"),
    ("pichla transaction dikhao", "history"),
    # tx_status
    ("did my last transfer go through?", "tx_status"),
    ("وصلت الفلوس لأحمد؟", "tx_status"),
    ("Rahul ko paise pahunch gaye kya", "tx_status"),
    # receive
    ("what is my address", "receive"),
    ("عطني عنواني", "receive"),
    ("mera address kya hai", "receive"),
    # add_contact
    ("ضيف خالد في الـcontacts", "add_contact"),
    ("save him as Khalid", "add_contact"),
    ("سجله باسم خالد", "add_contact"),
    ("Priya ko contact mein add karo", "add_contact"),
    ("add the address I copied as Omar", "add_contact"),
    # recovery_help
    ("I lost my phone", "recovery_help"),
    ("ضاع تلفوني، شو أسوي؟", "recovery_help"),
    ("mera phone kho gaya", "recovery_help"),
    # cancel
    ("cancel", "cancel"),
    ("لا خلاص", "cancel"),
    ("rehne do", "cancel"),
    ("don't send it", "cancel"),
    ("لا ترسل", "cancel"),
])
def test_intent(text, intent):
    r = parse(text, C, default_unit="AED")
    assert r.intent == intent, (r.intent, r.scores)
    assert r.confidence >= 0.8
    assert not r.needs_clarification


def test_unit_missing_asks_unless_wallet_currency_given():
    r = parse("send 10 to amma", C)
    assert r.needs_clarification and r.clarification == {"type": "missing", "slots": ["unit"]}
    assert r.readback["text"].startswith("Ten what?")
    r = parse("send 10 to amma", C, default_unit="AED")
    assert not r.needs_clarification and (r.unit, r.unit_assumed) == ("AED", True)
    assert "ten dirhams" in r.readback["text"]


@pytest.mark.parametrize("text,intent", [
    ("نسيت كلمة السر", "recovery_help"),
    ("I forgot my PIN", "recovery_help"),
    ("मैं पासवर्ड भूल गया", "recovery_help"),
])
def test_forgot_secret_is_recovery(text, intent):
    r = parse(text, C)
    assert r.intent == intent
    assert r.recipient is None  # "السر" is not the contact Sara


def test_pay_scanned_qr_is_send_and_asks_amount():
    r = parse("Pay the QR code", C)
    assert r.intent == "send" and r.recipient["type"] == "qr"
    assert r.clarification == {"type": "missing", "slots": ["amount"]}


def test_my_qr_is_receive_without_recipient():
    r = parse("Show my QR code so someone can pay me", C)
    assert r.intent == "receive" and r.recipient is None
    assert "scanned" not in r.readback["text"]


@pytest.mark.parametrize("text,lang", [
    ("kam rasidi", "ar"), ("pichhle transactions dikhao", "hi"), ("cancel karo", "hi"),
    ("What's my balance", "en"),
])
def test_readback_language(text, lang):
    assert parse(text, C).readback["lang"] == lang


def test_send_full_slots():
    r = parse("حوّل 0.1 إيثيريوم لأمي", C)
    assert (r.amount, r.unit, r.contact) == (0.1, "ETH", "Amma")
    assert r.recipient["type"] == "contact"
    assert r.lang_mix == ["ar"]


@pytest.mark.parametrize("text,rtype,value", [
    ("send 5 eth to 0501234567", "phone", "0501234567"),
    ("send 2 eth to ahmed.eth", "ens", "ahmed.eth"),
    ("send 2 eth to ahmed dot eth", "ens", "ahmed.eth"),
    ("send 1 eth to 0x52908400098527886E0F7030069857D2E4169EE7", "address",
     "0x52908400098527886e0f7030069857d2e4169ee7"),
    ("send 1 eth to the address i copied", "clipboard", None),
    ("scan the qr and send 1 eth", "qr", None),
    ("send 5 eth to myself", "self", None),
])
def test_non_contact_recipients(text, rtype, value):
    r = parse(text, C)
    assert r.intent == "send"
    assert r.recipient["type"] == rtype
    assert r.recipient["value"] == value


def test_missing_recipient_asks():
    r = parse("can you just send 5 ethereum to this user", C)
    assert r.intent == "send" and r.needs_clarification
    assert r.clarification == {"type": "missing", "slots": ["recipient"]}


def test_missing_amount_asks():
    r = parse("send to ahmed", C)
    assert r.needs_clarification and r.clarification["slots"] == ["amount"]


def test_unknown():
    r = parse("hello how are you", C)
    assert r.intent == "unknown" and r.needs_clarification


def test_tx_hash_is_status():
    r = parse("check 0x" + "a" * 64, C)
    assert r.intent == "tx_status" and r.tx_ref["hash"] == "0x" + "a" * 64


def test_tx_ref_by_description():
    r = parse("did my last transfer to Ahmed go through?", C)
    assert r.tx_ref["ordinal"] == "last" and r.tx_ref["contact"] == "Ahmed"


def test_add_contact_name_and_source():
    r = parse("add the address I copied as Omar", C)
    assert r.name == "Omar" and r.source == "clipboard"


def test_add_contact_duplicate_warning():
    r = parse("save Ahmad as contact", C)
    assert r.intent == "add_contact"
    assert "Ahmed" in r.similar_contacts
