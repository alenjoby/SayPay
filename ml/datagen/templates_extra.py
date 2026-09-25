"""Paraphrase bank: broader vocabulary per intent (the "LLM expansion" step).

Written to widen lexical coverage by category: synonyms for spending,
requesting, remaining, cancelling, clearing, messaging (hard negatives) etc.
Keyed by intent -> variety, same format as the other template files.
"""

EXTRA = {
    "check_balance": {
        "en": """
how much do i have left
how much have i still got
what's my remaining balance
do i have any money left
what's available to spend
how much is left in the wallet
is there money in my wallet
how much crypto is in there
what am i holding
what does my wallet have
total balance
remaining funds
how much did i end up with
money left?
can you check how much i've got
""",
        "ar_gulf": """
كم الباقي عندي
كم المتبقي في المحفظة
كم تبقى لي
شكثر الموجود
كم صار عندي الحين
المحفظة فيها شي
عندي فلوس ولا خلصت
كم الفلوس اللي معي
كم يطلع الرصيد الحين
شيك على رصيدي
الرصيد المتوفر كم
""",
        "hi_latin": """
kitna paisa baaki hai
account mein kitna hai
wallet mein kya bacha hai
paise bache hai kya
total kitna hai mere paas
""",
        "hi_deva": """
कितना पैसा बाकी है
""",
    },
    "send": {
        "en": """
get {amt} {unit} to {name}
send over {amt} to {name}
top up {name} with {amt} {unit}
hand {name} {amt} {unit}
drop {amt} {unit} in {name}'s wallet
push {amt} {unit} to {name}
{name} gets {amt} from me
can {name} have {amt} {unit}
send {name} some money, {amt} {unit}
pay back {name} {amt}
send {amt} {unit} to the address i copied
send {amt} to the copied address
pay {amt} {unit} to the address in my clipboard
scan the qr code and send {amt} {unit}
send {amt} to this qr
send {amt} {unit} to {addr}
transfer {amt} to address {addr}
send {amt} {unit} to {phone}
pay {amt} to number {phone}
send {amt} {unit} to {ens}
""",
        "ar_gulf": """
أعطي {name} {amt} {unit}
ابي اعطي {name} {amt}
حوله ل{name} {amt}
ارسلها ل{name} {amt} {unit}
دفع ل{name} {amt}
ابي ارجع ل{name} {amt} {unit}
ابي {name} ياخذ مني {amt}
حول {amt} {unit} للعنوان اللي نسخته
ارسل {amt} على العنوان المنسوخ
امسح الباركود وحول {amt}
حول {amt} {unit} على الرقم {phone}
ارسل {amt} ل{phone}
حول {amt} على {addr}
ارسل {amt} {unit} ل{ens}
""",
        "hi_latin": """
{name} ko {amt} dedo
{name} ke wallet mein {amt} {unit} daalo
{name} ko {amt} {unit} pay kar do
{name} ko {amt} transfer kar dijiye
copy kiye address pe {amt} bhejo
{phone} pe {amt} {unit} bhejo
qr scan karke {amt} bhejo
""",
    },
    "history": {
        "en": """
what did i spend today
show me my spending
my recent activity
spending history
list my payments
what went out of my wallet
who have i paid this month
show everything i paid yesterday
how much did i spend last week
""",
        "ar_gulf": """
كم صرفت اليوم
وش دفعت هالشهر
كم صرفت هالاسبوع
وش المصاريف اللي صارت
لمين دفعت الاسبوع هذا
وش طلع من محفظتي
سجل المدفوعات
ابي اشوف مصاريفي
""",
        "hi_latin": """
aaj kitna kharcha kiya
maine kise paise diye
kharche dikhao
recent payments dikhao
""",
        "hi_deva": """
इस महीने कितना खर्च हुआ
मेरे खर्चे दिखाओ
""",
    },
    "tx_status": {
        "en": """
whats happening with the payment
has the payment cleared
did the transfer clear
is it still processing
did the money reach {name}
is the transfer to {name} complete
did my payment fail
check {hash}
what's the status of {hash}
did {hash} go through
is transaction {hash} confirmed
""",
        "ar_gulf": """
وش صار على الفلوس اللي حولتها
{name} يقول ما وصله شي
للحين ما وصل التحويل
التحويل ل{name} خلص ولا لا
فيه تحديث على التحويل
هل الفلوس انخصمت ووصلت
وش حالة {hash}
العملية {hash} وصلت
""",
        "hi_latin": """
paisa pahucha ya nahi
{name} ko mila ya nahi
transfer pura hua kya
payment ka kya hua
""",
        "hi_deva": """
ट्रांसफर पूरा हुआ क्या
पेमेंट का क्या हुआ
""",
    },
    "receive": {
        "en": """
request {amt} {unit} from {name}
ask {name} to pay me
collect {amt} from {name}
i need money from {name}
how can {name} send me money
share my payment link
send {name} a payment request
{name} wants to pay me, what do i give them
bill {name} {amt} {unit}
""",
        "ar_gulf": """
ابي اطلب من {name} {amt}
ابي {name} يحول لي {amt}
خل {name} يرسل لي فلوس
اطلب فلوس من {name}
ارسل ل{name} طلب دفع
{name} يبي يرسل لي وش اعطيه
""",
        "hi_latin": """
{name} se paise mangwa do
{name} ko bolo mujhe {amt} bheje
mujhe paise bhejne ke liye {name} ko kya du
{name} se payment request karo
""",
        "hi_deva": """
{name} से पैसे मांगो
{name} से {amt} मंगवाओ
""",
    },
    "add_contact": {
        "en": """
create a contact for {name}
create contact {name}
make {name} a contact
save this wallet under {name}
keep this address as {name}
add this person as {name}
store this one as {name}
""",
        "ar_gulf": """
اضيف هالشخص
ضيف هالرقم باسم {name}
خزن هالعنوان باسم {name}
سوي جهة اتصال جديدة ل{name}
اضافة {name} للقائمة
""",
        "hi_latin": """
isko {name} naam se rakh lo
{name} ko contacts mein daalo
naya contact {name}
""",
    },
    "recovery_help": {
        "en": """
i misplaced my phone
lost access to my wallet
my phone got smashed
i can't find my phone anywhere
switched phones, need my wallet back
""",
        "ar_gulf": """
كيف ارجع حسابي
تلفوني ضايع من امس
جوالي خربان وابي محفظتي
غيرت جوالي كيف ارجع فلوسي
""",
        "hi_latin": """
phone toot gaya
phone nahi mil raha
naya phone hai account wapas chahiye
""",
    },
    "cancel": {
        "en": """
skip it
scrap that
leave it
drop it
not now
no thanks
stop that transfer
""",
        "ar_gulf": """
طنش
خلها
انسى
مو لازم
لا تكمل
ما ابيها
""",
        "hi_latin": """
chhodo
jaane do
abhi nahi
mat karo
""",
    },
    "unknown": {
        "en": """
send an email to {name}
text {name}
whatsapp {name}
send {name} a voice note
send the document to {name}
what's the bitcoin price
turn on the lights
book an appointment
read my messages
""",
        "ar_gulf": """
ارسل واتساب ل{name}
ارسل ايميل ل{name}
دز ل{name} الملف
كم سعر البيتكوين
احجز لي موعد
وش الأخبار اليوم
""",
        "hi_latin": """
{name} ko sms bhejo
{name} ko whatsapp karo
{name} ko email bhejo
bitcoin ka rate kya hai
""",
        "hi_deva": """
{name} को मैसेज करो
{name} को ईमेल भेजो
""",
    },
}
