"""v5 coverage: Hindi the way speech-to-text writes it, plus five known gaps.

Chrome's hi-IN recogniser writes Devanagari with English loanwords spelled in
Devanagari ("बैलेंस चेक करो", "सेंड करो"), digits and the rupee sign. The v3
model had seen mostly native Hindi verbs, so loanword commands were weak.
Also: "forgot my password/PIN" (recovery), paying a scanned QR (send) vs
showing my own QR (receive), and out-of-scope Hindi requests.

Written after blind_hi.tsv was frozen, without looking at its errors; train.py
still drops any near-duplicate of a test row.
"""

V5 = {
    "check_balance": {
        "hi_deva": """
बैलेंस चेक कर दो
मेरा करंट बैलेंस क्या है
वॉलेट का बैलेंस बताइए
मेरे अकाउंट का बैलेंस दिखाओ
कितना बैलेंस बचा है
मेरे वॉलेट में टोटल कितना है
मेरे पास अभी कितने रुपए हैं
ज़रा बैलेंस देख लो
बैलेंस कितना है बताना
अकाउंट में पैसे कितने बचे
मेरे वॉलेट में कितने ईथर हैं
""",
        "hi_latin": """
mera current balance batao
wallet ka balance kitna hai
account me kitna paisa bacha hai
zara balance dekh lo
total kitna hai mere paas
""",
        "en": """
check my balance please
tell me my wallet balance
how much money is there in my account
what is the balance in my wallet
kindly tell me my balance
what's my available balance
""",
    },
    "send": {
        "hi_deva": """
{name} को {amt} {unit} सेंड कर दो
{name} को {amt} {unit} ट्रांसफर करो
{name} को ₹{amt} भेज दो
{name} के अकाउंट में {amt} {unit} डाल दो
{name} के वॉलेट में {amt} {unit} ट्रांसफर कर दीजिए
{amt} {unit} {name} को भेजिए
{name} को {amt} {unit} पे करो
{name} को {amt} {unit} का पेमेंट कर दो
मुझे {name} को {amt} {unit} भेजने हैं
{name} को {amt} {unit} भेजना है प्लीज़
ज़रा {name} को {amt} {unit} भेज देना
{name} को अभी {amt} {unit} सेंड करो
{name} के लिए {amt} {unit} ट्रांसफर करना है
{amt} रुपए {name} को सेंड करो
{name} को {amt} डॉलर भेज दो
{name} को {amt} दिरहम पे कर दीजिए
""",
        "hi_latin": """
{name} ko {amt} {unit} send kar do
{name} ke account me {amt} {unit} daal do
{name} ko {amt} rs transfer kar dijiye
{name} ko {amt} {unit} ka payment karo
mujhe {name} ko {amt} {unit} bhejne hai
{amt} {unit} {name} ko pay kar do
""",
        "en": """
kindly send {amt} {unit} to {name}
please transfer {amt} {unit} to {name}'s account
do one thing, send {amt} {unit} to {name}
pay {amt} rupees to {name}
send {name} rupees {amt}
i want to transfer {amt} {unit} to {name}
""",
    },
    "receive": {
        "hi_deva": """
मेरा क्यूआर दिखाओ
मेरा वॉलेट एड्रेस दिखाइए
पेमेंट लेने के लिए क्यूआर कोड खोलो
मुझे पैसे मंगवाने हैं
{name} से {amt} {unit} की रिक्वेस्ट भेजो
{name} को पेमेंट रिक्वेस्ट भेजो
{name} से {amt} {unit} मांग लीजिए
मेरा एड्रेस शेयर कर दो
पैसे रिसीव करने का कोड दिखाओ
""",
        "hi_latin": """
mera wallet address share karo
{name} ko payment request bhejo
{name} se {amt} {unit} request karo
paise receive karne hai
""",
        "en": """
show my qr so i can get paid
show my qr code, someone wants to pay me
display my receiving code
share my wallet address with {name}
""",
        "ar_gulf": """
طلع الباركود حقي عشان يحولون لي
ورني الكيو ار حقي
""",
    },
    "history": {
        "hi_deva": """
मेरी ट्रांजैक्शन हिस्ट्री दिखाओ
पिछले पेमेंट दिखाइए
लास्ट पांच ट्रांजैक्शन दिखाओ
इस महीने के सारे लेनदेन बताओ
मैंने किस किस को पैसे भेजे हैं
मेरी स्टेटमेंट दिखाओ
हाल के पेमेंट्स बताओ
कल क्या क्या ट्रांजैक्शन हुए
""",
        "hi_latin": """
meri transaction history dikhao
recent payments batao
maine kis kis ko paise bheje
""",
        "en": """
show my last five transactions
give me my statement
list all my payments this month
""",
    },
    "tx_status": {
        "hi_deva": """
{name} वाला ट्रांसफर पूरा हुआ क्या
मेरा पेमेंट सक्सेस हुआ या फेल
{name} को भेजा हुआ पैसा पहुंच गया क्या
ट्रांजैक्शन का स्टेटस बताओ
पेमेंट अभी तक पेंडिंग है क्या
{name} के पैसे क्रेडिट हुए क्या
मेरा लास्ट पेमेंट कंफर्म हुआ क्या
""",
        "hi_latin": """
transfer ka status kya hai
{name} ko paise pahunch gaye kya
last payment success hua kya
""",
        "en": """
has my payment to {name} gone through
is my last transfer successful
""",
    },
    "add_contact": {
        "hi_deva": """
{name} को नया कॉन्टैक्ट बना दो
यह एड्रेस {name} नाम से सेव कर दो
{name} का नंबर कॉन्टैक्ट में ऐड करो
कॉन्टैक्ट लिस्ट में {name} को जोड़िए
इस नंबर को {name} के नाम से सेव कर लो
""",
        "hi_latin": """
{name} ko contact list me add karo
ye number {name} naam se save kar do
""",
    },
    "recovery_help": {
        "hi_deva": """
मैं अपना पिन भूल गया
पासवर्ड भूल गई हूं
मेरा फोन गुम हो गया है
फोन चोरी हो गया वॉलेट बचाओ
वॉलेट ओपन नहीं हो रहा
वॉलेट रिकवर करना है
नया फोन लिया है वॉलेट वापस चाहिए
मेरा अकाउंट लॉक हो गया
सीड फ्रेज़ भूल गया
""",
        "hi_latin": """
mera password bhool gaya
pin yaad nahi hai
phone chori ho gaya wallet kaise bachau
wallet open nahi ho raha
""",
        "en": """
i forgot my password
i forgot my pin
i can't remember my passcode
forgot my wallet password, help
i lost my recovery phrase
""",
        "ar_gulf": """
نسيت كلمة السر
نسيت الرقم السري
نسيت الباسورد حق المحفظة
ما اتذكر الرمز السري
""",
    },
    "cancel": {
        "hi_deva": """
रुक जाओ
नहीं भेजना है
कैंसल कर दीजिए
मत करो
छोड़ दो
पेमेंट रोक दो
""",
        "hi_latin": """
ruko mat bhejo
cancel kar dijiye
chhod do
""",
    },
    "unknown": {
        "hi_deva": """
आज का मौसम बताओ
कोई गाना बजाओ
मेरे लिए ऑटो बुक करो
क्रिकेट का स्कोर क्या है
आज की खबरें सुनाओ
मुझे एक कहानी सुनाओ
अलार्म लगा दो
चाय कैसे बनाते हैं
""",
        "hi_latin": """
aaj ka mausam kaisa hai
koi gaana bajao
cricket score batao
alarm laga do
""",
        "en": """
what's the weather like today
play some music
book an uber for me
what's the cricket score
""",
    },
}

# Paying OUT to a scanned code or a copied address is a send.
V5_SEND_QR = {
    "en": """
pay this qr code
scan the qr and pay {amt} {unit}
scan and pay
pay the merchant qr {amt} {unit}
send {amt} {unit} to the scanned code
""",
    "hi_deva": """
यह क्यूआर स्कैन करके पेमेंट करो
स्कैन करके {amt} {unit} पे करो
क्यूआर कोड पर {amt} {unit} भेजो
""",
    "hi_latin": """
qr scan karke pay karo
scan karke {amt} {unit} bhej do
""",
    "ar_gulf": """
امسح الباركود وادفع
امسح الكود وحول {amt} {unit}
ادفع للكيو ار {amt} {unit}
""",
}
for _var, _block in V5_SEND_QR.items():
    V5["send"][_var] = V5["send"].get(_var, "") + _block

# Spoken English: fillers, indirect requests, "$20", "bucks", polite and casual.
V5_EN = {
    "check_balance": """
uh how much money do i have
okay what's my balance
can you check how much is in my wallet
i want to know my balance
am i out of money
do i have any money left
what's my account balance looking like
how much crypto do i have
read my balance out loud
tell me what i have in the wallet
""",
    "send": """
um send {amt} {unit} to {name}
okay so send {name} {amt} {unit}
i'd like to pay {name} {amt} {unit}
could you send {name} {amt} {unit} please
send ${amt} to {name}
give {name} ${amt}
pay {name} {amt} bucks
send {name} {amt} bucks
i owe {name} {amt} {unit}, pay them
go ahead and transfer {amt} {unit} to {name}
let's pay {name} {amt} {unit}
please move {amt} {unit} over to {name}
shoot {name} {amt} {unit}
can i send {amt} {unit} to {name}
""",
    "receive": """
i want {name} to send me {amt} {unit}
get {name} to pay me back
someone wants to pay me, show my code
how do people send me money
what address do i give to get paid
can you ask {name} for the {amt} {unit} they owe me
send a payment request to {name}
""",
    "history": """
what have i spent recently
read out my last payments
who did i pay this week
what money came in lately
walk me through my recent transactions
what did i do with my money yesterday
""",
    "tx_status": """
did the money reach {name}
is the transfer to {name} done yet
has {name} received it
why is my payment taking so long
did that last payment go through okay
is my transaction confirmed
""",
    "add_contact": """
make a new contact named {name}
add {name} to my contacts
store this address under {name}
save the number i just copied as {name}
""",
    "recovery_help": """
someone stole my phone
my phone is broken, how do i get my wallet back
i got a new phone, move my wallet
i'm locked out, help
i can't log in to my wallet
""",
    "cancel": """
wait wait stop
no don't
hold on cancel that
nope not that
undo that
never mind forget it
""",
    "unknown": """
what time is it
call my mom
open youtube
how's the traffic today
what's the news
thank you
good morning
what's the price of gold
""",
}
for _intent, _block in V5_EN.items():
    V5.setdefault(_intent, {})
    V5[_intent]["en"] = V5[_intent].get("en", "") + _block
