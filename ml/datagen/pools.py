"""Slot fillers for synthetic commands, with gold values for evaluation."""

from __future__ import annotations

# (display name, spoken forms by variety). Contacts are saved in any script;
# the spoken form is what speech-to-text returns.
NAMES = [
    ("Ahmed", {"ar": ["أحمد", "احمد"], "en": ["Ahmed", "Ahmad"], "hi": ["Ahmed", "अहमद"]}),
    ("Mohammed", {"ar": ["محمد"], "en": ["Mohammed", "Muhammad", "Mohamed"], "hi": ["Mohammed", "मोहम्मद"]}),
    ("Khalid", {"ar": ["خالد"], "en": ["Khalid", "Khaled"], "hi": ["Khalid", "खालिद"]}),
    ("Fatima", {"ar": ["فاطمة", "فاطمه"], "en": ["Fatima", "Fatma"], "hi": ["Fatima", "फातिमा"]}),
    ("Sara", {"ar": ["سارة", "ساره"], "en": ["Sara", "Sarah"], "hi": ["Sara", "सारा"]}),
    ("Omar", {"ar": ["عمر"], "en": ["Omar", "Umar"], "hi": ["Omar", "उमर"]}),
    ("Aisha", {"ar": ["عائشة", "عايشة"], "en": ["Aisha", "Ayesha"], "hi": ["Ayesha", "आयशा"]}),
    ("Yousef", {"ar": ["يوسف"], "en": ["Yousef", "Yusuf"], "hi": ["Yusuf", "यूसुफ"]}),
    ("Noura", {"ar": ["نورة", "نوره"], "en": ["Noura", "Nora"], "hi": ["Noura"]}),
    ("Abdullah", {"ar": ["عبدالله", "عبد الله"], "en": ["Abdullah", "Abdallah"], "hi": ["Abdullah"]}),
    ("Hamad", {"ar": ["حمد"], "en": ["Hamad"], "hi": ["Hamad"]}),
    ("Maryam", {"ar": ["مريم"], "en": ["Maryam", "Mariam"], "hi": ["Maryam", "मरियम"]}),
    ("Salem", {"ar": ["سالم"], "en": ["Salem", "Salim"], "hi": ["Salim"]}),
    ("Rahul", {"ar": ["راهول"], "en": ["Rahul"], "hi": ["Rahul", "राहुल"]}),
    ("Priya", {"ar": ["بريا"], "en": ["Priya"], "hi": ["Priya", "प्रिया"]}),
    ("Arjun", {"ar": ["أرجون"], "en": ["Arjun"], "hi": ["Arjun", "अर्जुन"]}),
    ("Ravi", {"ar": ["رافي"], "en": ["Ravi"], "hi": ["Ravi", "रवि"]}),
    ("Anjali", {"ar": ["أنجلي"], "en": ["Anjali"], "hi": ["Anjali", "अंजलि"]}),
    ("Vikram", {"ar": ["فيكرام"], "en": ["Vikram"], "hi": ["Vikram", "विक्रम"]}),
    ("Deepak", {"ar": ["ديباك"], "en": ["Deepak"], "hi": ["Deepak", "दीपक"]}),
    ("John", {"ar": ["جون"], "en": ["John"], "hi": ["John", "जॉन"]}),
    ("Maria", {"ar": ["ماريا"], "en": ["Maria"], "hi": ["Maria"]}),
    ("David", {"ar": ["ديفيد"], "en": ["David"], "hi": ["David"]}),
    ("Amma", {"ar": ["أمي", "ماما", "يمه"], "en": ["mom", "mum", "my mother", "amma"],
              "hi": ["mummy", "maa", "ammi", "मम्मी", "माँ"]}),
    ("Dad", {"ar": ["أبوي", "بابا", "الوالد"], "en": ["dad", "my father", "papa"],
             "hi": ["papa", "abbu", "पापा"]}),
    ("Brother", {"ar": ["أخوي", "اخوي"], "en": ["my brother", "bro"], "hi": ["bhai", "bhaiya", "भाई"]}),
    ("Sister", {"ar": ["أختي", "اختي"], "en": ["my sister", "sis"], "hi": ["didi", "behen", "दीदी"]}),
]
# Distractor contact list entries so matching is not trivial.
EXTRA_CONTACTS = ["Layla", "Hassan", "Zaid", "Neha", "Sunil", "Emma", "Bilal", "Reem"]

# (spoken form, gold value)
AMOUNTS = {
    "ar": [
        ("0.1", 0.1), ("٠٫١", 0.1), ("0.5", 0.5), ("٥", 5), ("5", 5), ("2", 2), ("10", 10),
        ("100", 100), ("500", 500), ("1000", 1000), ("250", 250), ("0.05", 0.05),
        ("واحد", 1), ("اثنين", 2), ("ثلاثة", 3), ("خمسة", 5), ("عشرة", 10), ("عشرين", 20),
        ("خمسين", 50), ("ميه", 100), ("مية", 100), ("ميتين", 200), ("خمسمية", 500),
        ("ألف", 1000), ("ألفين", 2000), ("نص", 0.5), ("ربع", 0.25),
        ("صفر فاصلة واحد", 0.1), ("صفر فاصلة خمسة", 0.5), ("خمسة وعشرين", 25),
        ("ثلاث آلاف", 3000), ("ألفين وخمسمية", 2500), ("واحد ونص", 1.5), ("مية وخمسين", 150),
    ],
    "en": [
        ("0.1", 0.1), ("0.5", 0.5), ("5", 5), ("2", 2), ("10", 10), ("100", 100), ("500", 500),
        ("1,000", 1000), ("250", 250), ("0.05", 0.05), (".2", 0.2), ("one", 1), ("two", 2),
        ("three", 3), ("five", 5), ("ten", 10), ("twenty", 20), ("fifty", 50),
        ("a hundred", 100), ("two hundred", 200), ("five hundred", 500), ("a thousand", 1000),
        ("half", 0.5), ("zero point one", 0.1), ("point five", 0.5), ("twenty five", 25),
        ("one and a half", 1.5), ("two hundred and fifty", 250), ("5k", 5000),
        ("three thousand", 3000),
    ],
    "hi": [
        ("0.1", 0.1), ("0.5", 0.5), ("5", 5), ("2", 2), ("10", 10), ("100", 100), ("500", 500),
        ("1000", 1000), ("ek", 1), ("teen", 3), ("paanch", 5), ("das", 10), ("bees", 20),
        ("pachas", 50), ("sau", 100), ("ek sau", 100), ("do sau", 200), ("paanch sau", 500),
        ("ek hazaar", 1000), ("do hazaar", 2000), ("dedh", 1.5), ("dhai", 2.5), ("aadha", 0.5),
        ("zero point ek", 0.1), ("पांच", 5), ("सौ", 100), ("पांच सौ", 500), ("एक हजार", 1000),
        ("डेढ़", 1.5), ("हज़ार", 1000), ("दो हज़ार", 2000), ("ढाई सौ", 250), ("दो सौ", 200),
        ("पचास", 50), ("बीस", 20), ("दस", 10), ("तीन सौ", 300), ("साढ़े तीन सौ", 350),
        ("सवा सौ", 125), ("200", 200), ("50", 50), ("20", 20), ("1500", 1500), ("2000", 2000),
        ("0.05", 0.05), ("saadhe teen sau", 350), ("hazaar", 1000),
    ],
}

# (spoken form, gold unit). Empty string = no unit said.
UNITS = {
    "ar": [("", None)] * 4 + [("إيثيريوم", "ETH"), ("ايثريوم", "ETH"), ("eth", "ETH"),
                              ("ايث", "ETH"), ("درهم", "AED"), ("ريال", "SAR"), ("دولار", "USD")],
    "en": [("", None)] * 4 + [("eth", "ETH"), ("ethereum", "ETH"), ("ether", "ETH"),
                              ("ETH", "ETH"), ("dirhams", "AED"), ("riyals", "SAR"),
                              ("dollars", "USD")],
    "hi": [("", None)] * 4 + [("eth", "ETH"), ("ethereum", "ETH"), ("rupaye", "INR"),
                              ("rupees", "INR"), ("dirham", "AED"), ("dollar", "USD"),
                              ("ईथर", "ETH"), ("रुपए", "INR"), ("रुपये", "INR"), ("दिरहम", "AED"),
                              ("डॉलर", "USD"), ("रियाल", "SAR"), ("rs", "INR"), ("ईथ", "ETH")],
}
