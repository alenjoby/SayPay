"""The sentence the app reads back before anything happens, in the user's language.

The frontend puts ``readback.text`` in its aria-live region (the screen reader
speaks it) or passes it to speechSynthesis with ``readback.lang``. Amounts are
spelled out in words, as the spec requires ("zero point one test ETH"), so a
misheard amount is audible before the fingerprint step.
"""

from __future__ import annotations

# --- numbers to words --------------------------------------------------------

_EN_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
            "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
            "eighteen", "nineteen"]
_EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]

_AR_ONES = ["صفر", "واحد", "اثنين", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة",
            "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر",
            "ثمانية عشر", "تسعة عشر"]
_AR_TENS = ["", "", "عشرين", "ثلاثين", "أربعين", "خمسين", "ستين", "سبعين", "ثمانين", "تسعين"]
_AR_HUNDREDS = ["", "مية", "ميتين", "ثلاثمية", "أربعمية", "خمسمية", "ستمية", "سبعمية", "ثمانمية",
                "تسعمية"]

_HI_0_99 = (
    "शून्य एक दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस "
    "बीस इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस "
    "चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस चालीस इकतालीस बयालीस तैंतालीस चवालीस पैंतालीस "
    "छियालीस सैंतालीस अड़तालीस उनचास पचास इक्यावन बावन तिरेपन चौवन पचपन छप्पन सत्तावन अट्ठावन "
    "उनसठ साठ इकसठ बासठ तिरेसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर "
    "तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उन्यासी अस्सी इक्यासी बयासी तिरासी चौरासी "
    "पचासी छियासी सत्तासी अट्ठासी नवासी नब्बे इक्यानवे बानवे तिरानवे चौरानवे पचानवे छियानवे "
    "सत्तानवे अट्ठानवे निन्यानवे"
).split()


def _en_int(n: int) -> str:
    if n < 20:
        return _EN_ONES[n]
    if n < 100:
        t, o = divmod(n, 10)
        return _EN_TENS[t] + ("-" + _EN_ONES[o] if o else "")
    if n < 1000:
        h, r = divmod(n, 100)
        return _EN_ONES[h] + " hundred" + (" and " + _en_int(r) if r else "")
    for size, name in ((1_000_000_000, "billion"), (1_000_000, "million"), (1000, "thousand")):
        if n >= size:
            q, r = divmod(n, size)
            return _en_int(q) + " " + name + ((" and " if r < 100 else " ") + _en_int(r) if r else "")
    return str(n)


def _ar_int(n: int) -> str:
    if n < 20:
        return _AR_ONES[n]
    if n < 100:
        t, o = divmod(n, 10)
        return (_AR_ONES[o] + " و" if o else "") + _AR_TENS[t]
    if n < 1000:
        h, r = divmod(n, 100)
        return _AR_HUNDREDS[h] + (" و" + _ar_int(r) if r else "")
    if n < 1_000_000:
        q, r = divmod(n, 1000)
        if q == 1:
            head = "ألف"
        elif q == 2:
            head = "ألفين"
        elif q <= 10:
            head = _ar_int(q) + " آلاف"
        else:
            head = _ar_int(q) + " ألف"
        return head + (" و" + _ar_int(r) if r else "")
    q, r = divmod(n, 1_000_000)
    head = "مليون" if q == 1 else _ar_int(q) + " مليون"
    return head + (" و" + _ar_int(r) if r else "")


def _hi_int(n: int) -> str:
    if n < 100:
        return _HI_0_99[n]
    for size, name in ((10_000_000, "करोड़"), (100_000, "लाख"), (1000, "हज़ार"), (100, "सौ")):
        if n >= size:
            q, r = divmod(n, size)
            return _hi_int(q) + " " + name + (" " + _hi_int(r) if r else "")
    return str(n)


_INT = {"en": _en_int, "ar": _ar_int, "hi": _hi_int}
_POINT = {"en": "point", "ar": "فاصلة", "hi": "दशमलव"}


def number_words(value: float, lang: str) -> str:
    """0.1 -> "zero point one" / "صفر فاصلة واحد" / "शून्य दशमलव एक"."""
    text = f"{value:.8f}".rstrip("0").rstrip(".")
    whole, _, frac = text.partition(".")
    to_int = _INT[lang]
    out = to_int(int(whole))
    if frac:
        out += f" {_POINT[lang]} " + " ".join(to_int(int(d)) for d in frac)
    return out


# --- units and templates ---------------------------------------------------------

_UNITS = {
    "ETH": {"en": "test ETH", "ar": "إيثيريوم تجريبي", "hi": "टेस्ट ईथर"},
    "AED": {"en": "dirhams", "ar": "درهم", "hi": "दिरहम"},
    "SAR": {"en": "riyals", "ar": "ريال", "hi": "रियाल"},
    "QAR": {"en": "Qatari riyals", "ar": "ريال قطري", "hi": "क़तरी रियाल"},
    "OMR": {"en": "Omani rials", "ar": "ريال عماني", "hi": "ओमानी रियाल"},
    "KWD": {"en": "dinars", "ar": "دينار", "hi": "दीनार"},
    "BHD": {"en": "Bahraini dinars", "ar": "دينار بحريني", "hi": "बहरीनी दीनार"},
    "USD": {"en": "dollars", "ar": "دولار", "hi": "डॉलर"},
    "INR": {"en": "rupees", "ar": "روبية", "hi": "रुपये"},
    "EUR": {"en": "euros", "ar": "يورو", "hi": "यूरो"},
}

_INTENT_NAMES = {
    "check_balance": {"en": "check your balance", "ar": "معرفة الرصيد", "hi": "बैलेंस देखना"},
    "send": {"en": "send money", "ar": "إرسال فلوس", "hi": "पैसे भेजना"},
    "history": {"en": "see your history", "ar": "عرض العمليات", "hi": "लेन-देन देखना"},
    "tx_status": {"en": "check a transfer", "ar": "حالة التحويل", "hi": "ट्रांसफर की स्थिति"},
    "receive": {"en": "receive or request money", "ar": "استلام أو طلب فلوس", "hi": "पैसे मंगवाना"},
    "add_contact": {"en": "save a contact", "ar": "حفظ جهة اتصال", "hi": "कॉन्टैक्ट सेव करना"},
    "recovery_help": {"en": "recover your wallet", "ar": "استرجاع المحفظة", "hi": "वॉलेट वापस पाना"},
    "cancel": {"en": "cancel", "ar": "الإلغاء", "hi": "रद्द करना"},
}

_T = {
    "en": {
        "amount": "{amount} {unit}",
        "send": "Send {amount} to {who}. Confirm with your fingerprint.",
        "receive_from": "Request {amount} from {who}.",
        "receive": "Showing your receiving code.",
        "check_balance": "Checking your balance.",
        "history": "Reading your recent transactions.",
        "tx_status": "Checking your transfer{to}.",
        "add_contact": "Save {name} as a contact?",
        "add_contact_noname": "Who should I save? Say their name.",
        "recovery_help": "Starting wallet recovery. Your guardians will be asked to approve.",
        "cancel": "Cancelled. Nothing was sent.",
        "unknown": "Sorry, I didn't understand. Please say it again.",
        "choose": "Did you want to {a}, or {b}?",
        "missing_amount": "How much should I send{to}?",
        "missing_recipient": "Who should I send {amount} to? Say a name or a phone number.",
        "missing_unit": "{amount} what? Say dirhams, dollars, rupees or ETH.",
        "self": "That is your own wallet. Nothing was sent.",
        "new_address": "a new address you have never paid",
        "clipboard": "the address you copied",
        "qr": "the scanned code",
        "phone": "phone number {digits}",
        "to": " to {who}",
    },
    "ar": {
        "amount": "{amount} {unit}",
        "send": "حوّل {amount} إلى {who}. أكّد ببصمتك.",
        "receive_from": "طلب {amount} من {who}.",
        "receive": "هذا رمز الاستلام حقك.",
        "check_balance": "جاري التحقق من رصيدك.",
        "history": "هذه آخر عملياتك.",
        "tx_status": "جاري التحقق من التحويل{to}.",
        "add_contact": "أحفظ {name} في جهات الاتصال؟",
        "add_contact_noname": "باسم مين أحفظه؟ قل الاسم.",
        "recovery_help": "بدأنا استرجاع المحفظة. سيطلب من الأوصياء الموافقة.",
        "cancel": "تم الإلغاء. ما انرسل شي.",
        "unknown": "آسف، ما فهمت. ممكن تعيد؟",
        "choose": "تقصد {a} أو {b}؟",
        "missing_amount": "كم المبلغ اللي تبي ترسله{to}؟",
        "missing_recipient": "لمين أرسل {amount}؟ قل الاسم أو رقم الجوال.",
        "missing_unit": "{amount} إيش؟ درهم، ريال، دولار ولا إيثيريوم؟",
        "self": "هذي محفظتك نفسها. ما انرسل شي.",
        "new_address": "عنوان جديد ما حولت له قبل",
        "clipboard": "العنوان اللي نسخته",
        "qr": "الرمز اللي مسحته",
        "phone": "الرقم {digits}",
        "to": " إلى {who}",
    },
    "hi": {
        "amount": "{amount} {unit}",
        "send": "{who} को {amount} भेजें। फिंगरप्रिंट से पुष्टि करें।",
        "receive_from": "{who} से {amount} मांगें।",
        "receive": "यह आपका रिसीविंग कोड है।",
        "check_balance": "आपका बैलेंस देख रहे हैं।",
        "history": "आपके हाल के लेन-देन।",
        "tx_status": "{to}ट्रांसफर की स्थिति देख रहे हैं।",
        "add_contact": "{name} को कॉन्टैक्ट में सेव करें?",
        "add_contact_noname": "किस नाम से सेव करूँ? नाम बोलिए।",
        "recovery_help": "वॉलेट रिकवरी शुरू हो रही है। आपके गार्डियन से मंज़ूरी ली जाएगी।",
        "cancel": "रद्द कर दिया। कुछ नहीं भेजा गया।",
        "unknown": "माफ़ कीजिए, समझ नहीं आया। फिर से बोलिए।",
        "choose": "क्या आप {a} चाहते हैं या {b}?",
        "missing_amount": "{to}कितने पैसे भेजूँ?",
        "missing_recipient": "{amount} किसे भेजूँ? नाम या फ़ोन नंबर बोलिए।",
        "missing_unit": "{amount} क्या? रुपये, दिरहम, डॉलर या ईथर बोलिए।",
        "self": "यह आपका अपना वॉलेट है। कुछ नहीं भेजा गया।",
        "new_address": "एक नया पता जिस पर आपने पहले पैसे नहीं भेजे",
        "clipboard": "कॉपी किया हुआ पता",
        "qr": "स्कैन किया हुआ कोड",
        "phone": "फ़ोन नंबर {digits}",
        "to": "{who} को ",
    },
}


def reply_language(lang_mix: list[str], preferred: str | None = None) -> str:
    """Reply in the app's preferred language if given, else the command's main language."""
    if preferred in _T:
        return preferred
    for lang in lang_mix:
        if lang in _T:
            return lang
    return "en"


def _amount(value: float | None, unit: str | None, lang: str) -> str | None:
    if value is None:
        return None
    words = number_words(value, lang)
    return f"{words} {_UNITS[unit][lang]}" if unit in _UNITS else words


def _who(recipient: dict | None, lang: str) -> str | None:
    if not recipient:
        return None
    t = _T[lang]
    kind = recipient.get("type")
    if kind == "contact":
        return recipient.get("contact")
    if kind == "phone":
        digits = " ".join(_INT[lang](int(d)) if d.isdigit() else d
                          for d in (recipient.get("value") or ""))
        return t["phone"].format(digits=digits)
    if kind in ("ens", "handle"):
        return recipient.get("value")
    if kind == "address":
        return t["new_address"]
    if kind in ("clipboard", "qr"):
        return t[kind]
    return None


def build_readback(result, preferred_lang: str | None = None) -> dict:
    """``result`` is a ParseResult (or anything with the same attributes)."""
    lang = reply_language(result.lang_mix, preferred_lang)
    t = _T[lang]
    names = {k: v[lang] for k, v in _INTENT_NAMES.items()}
    amount = _amount(result.amount, result.unit, lang)
    recipient = result.recipient or {}
    who = _who(result.recipient, lang)
    to = t["to"].format(who=who) if who else ""
    c = result.clarification or {}

    if result.intent == "unknown":
        text = t["unknown"]
    elif result.intent == "send" and recipient.get("type") == "self":
        text = t["self"]
    elif c.get("type") == "missing" and "amount" in c.get("slots", []):
        text = t["missing_amount"].format(to=to)
    elif c.get("type") == "missing" and "unit" in c.get("slots", []):
        text = t["missing_unit"].format(amount=amount or "")
        text = text[0].upper() + text[1:]
    elif c.get("type") == "missing" and "recipient" in c.get("slots", []):
        text = t["missing_recipient"].format(amount=amount or "")
    elif c.get("type") == "choose_intent":
        a, b = (c.get("options") or ["send", "cancel"])[:2]
        text = t["choose"].format(a=names.get(a, a), b=names.get(b, b))
    elif result.intent == "send":
        text = t["send"].format(amount=amount or "?", who=who or "?")
    elif result.intent == "receive":
        text = t["receive_from"].format(amount=amount or "", who=who) if who else t["receive"]
        text = " ".join(text.split())
    elif result.intent == "tx_status":
        text = t["tx_status"].format(to=to)
    elif result.intent == "add_contact":
        text = t["add_contact"].format(name=result.name) if result.name else t["add_contact_noname"]
    else:
        text = t[result.intent]
    return {"text": " ".join(text.split()), "lang": lang}
