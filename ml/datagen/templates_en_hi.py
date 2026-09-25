"""English and Hindi (Latin + Devanagari) command templates. Same format as templates_ar."""

EN = {
    "check_balance": """
what's my balance
how much money do i have
check my balance
how much is in my wallet
tell me my balance
what do i have left
balance please
how much eth do i have
how rich am i right now
am i broke
do i have enough money
what's in my account
show me my funds
read my balance
how much can i spend
what's my current balance
my balance
""",
    "send": """
send {amt} {unit} to {name}
send {name} {amt} {unit}
transfer {amt} {unit} to {name}
pay {name} {amt} {unit}
give {name} {amt} {unit}
can you send {amt} to {name}
i want to send {amt} {unit} to {name}
please transfer {amt} to {name}
send {amt} over to {name}
wire {amt} {unit} to {name}
i owe {name} {amt}, pay them
{name} needs {amt} {unit}, send it
i want {name} to have {amt} {unit}
move {amt} {unit} to {name}
shoot {amt} to {name}
let's pay {name} {amt}
could you pay {amt} {unit} to {name} for me
{amt} {unit} to {name} please
make a payment of {amt} to {name}
""",
    "history": """
show my transactions
what was my last transaction
transaction history
what did i spend recently
who did i pay last
show me my recent payments
list my transfers
what happened in my wallet this week
when did i last pay {name}
how much did i send {name}
where did my money go
show my statement
my past payments
""",
    "tx_status": """
did my transfer go through
did {name} get the money
is the payment done
has it arrived
what's the status of my transfer
is my transaction pending
was the last payment successful
did it work
is it confirmed yet
why hasn't {name} received it
check if my payment reached {name}
is my money stuck
""",
    "receive": """
what's my address
show my wallet address
i want to receive money
how can someone pay me
show my qr code
share my address with {name}
send my address to {name}
request {amt} from {name}
i need {name} to pay me
give me my receiving code
how do i get paid
""",
    "add_contact": """
add {name} to my contacts
save {name} as a contact
add a new contact called {name}
save this address as {name}
save the address i copied as {name}
save the person who just paid me as {name}
put {name} in my contacts
new contact {name}
remember this wallet as {name}
store {name}
add {name}
""",
    "recovery_help": """
i lost my phone
my phone was stolen
how do i recover my wallet
i got a new phone, how do i get my money back
i can't get into my wallet
my phone broke
someone stole my mobile what now
help me restore my account
i'm locked out
how do guardians help me recover
""",
    "cancel": """
cancel
no
stop
never mind
don't send it
forget it
no wait
abort
that's wrong, cancel
hold on, stop
nope
don't do that
go back
undo that
""",
    "unknown": """
hello
how are you
what's the weather today
play some music
send a message to {name}
send a photo to {name}
call {name}
set an alarm for 7
what time is it
tell me a joke
order me a pizza
what's the news
email {name} the report
show my call history
open the camera
who won the match
""",
}

HI_LATIN = {
    "check_balance": """
mera balance kitna hai
balance batao
mere paas kitne paise hai
kitna paisa bacha hai
wallet mein kitna hai
mera balance check karo
kitne paise hain mere account mein
paise kitne bache
balance kya hai
""",
    "send": """
{name} ko {amt} {unit} bhejo
{name} ko {amt} bhej do
{amt} {unit} {name} ko bhejo
{name} ko {amt} {unit} transfer karo
{name} ke account mein {amt} daal do
{name} ko {amt} de do
{amt} {unit} {name} ko pay karo
mujhe {name} ko {amt} bhejna hai
{name} ko jaldi se {amt} bhejo
{name} ko {amt} {unit} bhej dijiye
""",
    "history": """
mera transaction history dikhao
pichla transaction kya tha
last transaction dikhao
maine kisko paise bheje
pichle hafte ke transactions dikhao
{name} ko last kab bheja tha
mere saare payments dikhao
""",
    "tx_status": """
paise pahunch gaye kya
{name} ko paise mile kya
transfer ho gaya kya
payment successful hua kya
transaction pending hai kya
mera transfer atak gaya kya
""",
    "receive": """
mera address kya hai
mera qr code dikhao
mujhe paise lene hai
{name} se {amt} mangwao
mera wallet address bhejo {name} ko
paise kaise receive karu
""",
    "add_contact": """
{name} ko contact mein add karo
{name} ko save karo
naya contact banao {name} naam se
is address ko {name} naam se save karo
jisne abhi paise bheje usko {name} naam se save karo
{name} ka number save karo
""",
    "recovery_help": """
mera phone kho gaya
mera phone chori ho gaya
phone gum ho gaya ab kya karu
naya phone liya hai wallet kaise wapas laun
wallet recover kaise karu
account mein login nahi ho raha
""",
    "cancel": """
rehne do
nahi
mat bhejo
cancel karo
ruko
band karo
nahi chahiye
ek minute ruk ja
galat hai cancel karo
""",
    "unknown": """
kya haal hai
aaj mausam kaisa hai
gaana bajao
{name} ko message bhejo
{name} ko call karo
{name} ko photo bhejo
alarm laga do
kitne baje hai
ek joke sunao
""",
}

HI_DEVA = {
    "check_balance": """
मेरा बैलेंस कितना है
बैलेंस बताओ
मेरे पास कितने पैसे हैं
वॉलेट में कितना पैसा है
कितना पैसा बचा है
""",
    "send": """
{name} को {amt} {unit} भेजो
{name} को {amt} भेज दो
{amt} {unit} {name} को भेजो
{name} को {amt} ट्रांसफर करो
{name} को {amt} दे दो
""",
    "history": """
मेरी ट्रांजैक्शन हिस्ट्री दिखाओ
पिछला लेन देन क्या था
मैंने किसको पैसे भेजे
""",
    "tx_status": """
पैसे पहुंच गए क्या
{name} को पैसे मिले क्या
ट्रांसफर हो गया क्या
""",
    "receive": """
मेरा एड्रेस क्या है
मेरा क्यूआर कोड दिखाओ
मुझे पैसे लेने हैं
""",
    "add_contact": """
{name} को कॉन्टैक्ट में जोड़ो
{name} को सेव करो
""",
    "recovery_help": """
मेरा फोन खो गया
मेरा फोन चोरी हो गया
वॉलेट वापस कैसे लाऊं
""",
    "cancel": """
रहने दो
नहीं
मत भेजो
कैंसल करो
रुको
""",
    "unknown": """
क्या हाल है
आज मौसम कैसा है
गाना बजाओ
{name} को मैसेज भेजो
{name} को कॉल करो
""",
}

# English mixed into Hindi (beyond the Hinglish above, which already mixes).
MIX_HI_EN = {
    "check_balance": """
mera wallet balance check karo please
balance kitna hai bro
""",
    "send": """
please {name} ko {amt} {unit} send kar do
{name} ko {amt} eth transfer kar do
send {amt} to {name} jaldi
""",
    "tx_status": """
payment {name} tak pahuncha ki nahi
transfer confirm hua kya
""",
    "cancel": """
cancel kar do yaar
stop karo, mat bhejo
""",
}
