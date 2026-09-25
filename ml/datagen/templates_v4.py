"""v4 coverage, from error analysis on the v1 hand-written set (now a dev set).

Categories the ensemble got wrong: requesting money (vs sending it), saving the
last sender / Devanagari saves, "can't open my wallet", "X didn't get it",
"what happened in my account". Written after blind_v2.tsv was frozen and phrased
independently of it; train.py still drops any near-duplicate of a test row.
"""

V4 = {
    "receive": {
        "en": """
tell {name} to pay me {amt}
get {name} to send me {amt} {unit}
have {name} transfer me {amt}
i need {name} to send me money
can {name} pay me back {amt}
make a payment request to {name} for {amt} {unit}
request {amt} {unit} from {name} please
{name} owes me {amt}, ask for it
i'm owed {amt} by {name}, request it
bill {name} for {amt}
""",
        "ar_gulf": """
ابي {name} يرسل لي {amt}
خل {name} يدفع لي {amt} {unit}
اطلب لي من {name} {amt}
{name} عليه لي {amt} اطلبها منه
ارسل طلب ل{name} ب{amt}
ذكر {name} يحول لي فلوسي
ابي فلوسي من {name}
""",
        "ar_lev": """
بدي {name} يبعتلي {amt}
اطلب من {name} يحولي {amt}
""",
        "ar_egy": """
عايز {name} يحولي {amt}
اطلب من {name} فلوس
""",
        "hi_latin": """
{name} se {amt} maang lo
{name} se paise mango
{name} ko bolo mujhe {amt} bheje
{name} se {amt} {unit} mangwa lo
{name} ne mujhe {amt} dene hai, maang lo
""",
        "hi_deva": """
{name} से {amt} मांग लो
{name} से पैसे मंगवाओ
{name} को बोलो मुझे पैसे भेजे
""",
    },
    "add_contact": {
        "en": """
save the one who sent me money as {name}
whoever just paid me, save them as {name}
add the last sender as {name}
the person who paid me earlier, add them as {name}
store the sender of that payment as {name}
""",
        "ar_gulf": """
اللي ارسل لي فلوس احفظه باسم {name}
آخر واحد حول لي سجله {name}
احفظ اللي دفع لي باسم {name}
الشخص اللي حول لي اضيفه باسم {name}
""",
        "hi_latin": """
{name} ka number save kar lo
jisne paise bheje use {name} naam se save karo
{name} ko contact bana do
""",
        "hi_deva": """
{name} का नंबर सेव करो
{name} को सेव कर लो
{name} को कॉन्टैक्ट में जोड़ दो
इस पते को {name} नाम से सेव करो
जिसने पैसे भेजे उसे {name} नाम से सेव करो
""",
    },
    "recovery_help": {
        "en": """
i can't open my wallet anymore
the wallet won't open on my new phone
locked out of my wallet
i can't sign in to my wallet
how do i get back into my wallet
""",
        "ar_gulf": """
ما اقدر افتح المحفظة
المحفظة ما تفتح معي
ما عاد اقدر ادخل حسابي
كيف ادخل محفظتي من جوال ثاني
""",
        "hi_latin": """
wallet khul nahi raha
naye phone pe wallet kaise kholu
""",
    },
    "tx_status": {
        "en": """
any news on the payment to {name}
why didn't {name} get the money
{name} says the money never came
is there an update on my transfer
still waiting for {name} to receive it
""",
        "ar_gulf": """
ليش {name} ما استلم الفلوس
للحين {name} ما جاته الفلوس
فيه اي خبر عن التحويل
التحويل حق {name} وين وصل
""",
        "hi_latin": """
{name} ko abhi tak paise kyun nahi mile
transfer ka koi update hai
""",
    },
    "history": {
        "en": """
pull up my transactions
show my activity log
what happened in my wallet recently
what's been going on in my account
""",
        "ar_gulf": """
وش صار في حسابي هالفترة
وريني حركة الحساب
وش العمليات اللي صارت عندي
""",
        "hi_latin": """
mere account mein kya kya hua
recent activity dikhao
""",
    },
}
