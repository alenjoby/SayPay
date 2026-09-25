"""Arabic command templates: Gulf, MSA, Levantine, Egyptian, and Arabic-English mixes.

One template per line. Slots: {name} {amt} {unit}. Lines are grouped by
intent and variety; the generator assigns each line a template id so the dev
split can hold out whole templates (tests generalization, not memorization).
"""

AR = {
    "check_balance": {
        "ar_gulf": """
كم رصيدي
كم رصيدي الحين
شكثر رصيدي
شكثر عندي فلوس
كم عندي في المحفظة
كم باقي عندي
وش رصيدي
ابي اعرف رصيدي
ابغى اشوف رصيدي
قول لي كم عندي
كم فلوسي
شلون رصيدي
شوف لي الرصيد
كم معي الحين
كم صار رصيدي
عطني الرصيد
رصيدي كم
كم المبلغ اللي عندي
كم باقي في حسابي
طمني على رصيدي
""",
        "ar_msa": """
ما هو رصيدي
كم رصيدي الحالي
أريد معرفة رصيدي
اعرض رصيدي
ما الرصيد المتاح
كم المبلغ المتوفر في محفظتي
أخبرني برصيدي
ما قيمة الأموال في حسابي
هل لدي رصيد كاف
استعلام عن الرصيد
""",
        "ar_lev": """
قديش رصيدي
قديش معي مصاري
شو رصيدي
بدي اعرف رصيدي
قديش ضايل معي
فرجيني الرصيد
كم معي بالمحفظة
""",
        "ar_egy": """
رصيدي كام
معايا كام
عايز اعرف رصيدي
فلوسي كام
باقي معايا كام
وريني الرصيد
الرصيد بتاعي كام
""",
        "mix_ar_en": """
كم الbalance حقي
شو الbalance
ابي اشوف الbalance
check الرصيد
كم الbalance في الwallet
وش الbalance الحين
balance حقي كم
قديش الbalance
""",
    },
    "send": {
        "ar_gulf": """
حول {amt} {unit} ل{name}
حول ل{name} {amt} {unit}
ابي احول {amt} {unit} ل{name}
ابغى ارسل {amt} {unit} ل{name}
ارسل {amt} {unit} ل{name}
ارسل ل{name} {amt}
دز {amt} {unit} ل{name}
دز ل{name} {amt} {unit}
ابعث {amt} {unit} ل{name}
ابعث ل{name} {amt}
عط {name} {amt} {unit}
عطي {name} {amt}
حول {amt} على {name}
ودي احول {amt} {unit} ل{name}
لو سمحت حول {amt} ل{name}
بسرعة حول {amt} {unit} ل{name}
ابي ادفع ل{name} {amt}
ادفع {amt} {unit} ل{name}
{name} ابيه ياخذ {amt}
خل {name} يستلم {amt} {unit} مني
ارسل {amt} {unit} حق {name}
حط ل{name} {amt}
سوي تحويل {amt} ل{name}
ابي اسوي تحويل ل{name} ب{amt} {unit}
""",
        "ar_msa": """
حول {amt} {unit} إلى {name}
أرسل {amt} {unit} إلى {name}
أريد تحويل {amt} {unit} إلى {name}
قم بتحويل {amt} إلى {name}
ادفع {amt} {unit} إلى {name}
أرسل مبلغ {amt} {unit} إلى {name}
أرغب في إرسال {amt} إلى {name}
حول مبلغ {amt} لحساب {name}
""",
        "ar_lev": """
بدي حول {amt} {unit} ل{name}
بعات {amt} ل{name}
ابعت ل{name} {amt} {unit}
حوللي {amt} ل{name}
بدي ابعت {amt} {unit} ل{name}
ابعتلو ل{name} {amt}
""",
        "ar_egy": """
عايز احول {amt} {unit} ل{name}
ابعت {amt} ل{name}
حول ل{name} {amt} {unit}
عايز ابعت ل{name} {amt}
ادي {name} {amt} {unit}
""",
        "mix_ar_en": """
send {amt} {unit} ل{name}
ابي اsend {amt} ل{name}
transfer {amt} {unit} ل{name}
حول {amt} eth ل{name}
سوي transfer ل{name} {amt}
ابي اسوي payment ل{name} {amt} {unit}
pay ل{name} {amt}
ارسل {amt} ethereum ل{name}
""",
    },
    "history": {
        "ar_gulf": """
شو آخر عملية
وش آخر العمليات
ابي اشوف العمليات
ورني التحويلات اللي سويتها
شنو العمليات الأخيرة
ابي سجل التحويلات
شو حولت هالاسبوع
وين راحت فلوسي
شوف لي آخر التحويلات
ابي كشف حساب
العمليات اللي صارت امس
لمين حولت آخر مرة
كم حولت ل{name}
شو آخر شي دفعته
""",
        "ar_msa": """
اعرض سجل المعاملات
ما هي آخر معاملاتي
أريد رؤية العمليات السابقة
اعرض كشف الحساب
ما آخر عملية قمت بها
سجل التحويلات من فضلك
""",
        "ar_lev": """
شو آخر شي حولته
فرجيني آخر العمليات
بدي شوف التحويلات
لمين بعتت مبارح
""",
        "ar_egy": """
وريني آخر العمليات
عايز اشوف التحويلات
اخر حاجة دفعتها ايه
بعتت لمين امبارح
""",
        "mix_ar_en": """
شو آخر transaction
ابي اشوف الhistory
ورني الtransactions
الhistory حقي
last transactions لو سمحت
""",
    },
    "tx_status": {
        "ar_gulf": """
وصلت الفلوس ل{name}
التحويل وصل ولا لا
{name} استلم الفلوس
هل وصل التحويل
شو صار على التحويل
التحويل الأخير تم
الفلوس راحت ولا لا
ليش التحويل ما وصل
التحويل معلق
وين وصل التحويل حق {name}
تأكد لي ان التحويل وصل
خلص التحويل
""",
        "ar_msa": """
هل اكتمل التحويل
ما حالة التحويل
هل تم استلام المبلغ من قبل {name}
هل نجحت العملية الأخيرة
التحويل قيد الانتظار
""",
        "ar_lev": """
وصلو المصاري ل{name}
شو صار بالتحويل
التحويل مشي ولا لأ
""",
        "ar_egy": """
الفلوس وصلت ل{name} ولا لا
التحويل خلص
التحويل واقف ليه
""",
        "mix_ar_en": """
الtransaction وصلت
status التحويل
الtransfer pending ولا confirmed
هل الtransaction confirmed
""",
    },
    "receive": {
        "ar_gulf": """
عطني عنواني
وش عنوان محفظتي
ابي عنوان المحفظة
شارك عنواني
ابي استقبل فلوس
كيف استلم فلوس
ابي احد يحول لي
طلع لي الباركود حقي
ارسل عنواني ل{name}
ابي اطلب فلوس من {name}
{name} يبي يحول لي وش اعطيه
""",
        "ar_msa": """
ما هو عنوان محفظتي
أريد استقبال مبلغ
اعرض رمز الاستلام
شارك عنوان المحفظة
كيف أستلم الأموال
اطلب مبلغا من {name}
""",
        "ar_lev": """
شو عنواني
بدي استقبل مصاري
ابعت عنواني ل{name}
""",
        "ar_egy": """
عنواني ايه
عايز استلم فلوس
ابعت العنوان بتاعي ل{name}
""",
        "mix_ar_en": """
عطني الaddress حقي
ابي الQR حقي
شارك الwallet address
ابي اrequest فلوس من {name}
""",
    },
    "add_contact": {
        "ar_gulf": """
ضيف {name} في الأسماء
ضيف {name}
احفظ {name}
سجل {name} عندي
احفظه باسم {name}
سجله باسم {name}
ابي اضيف {name} جهة اتصال
ضيف رقم {name}
حط {name} في جهات الاتصال
احفظ هالعنوان باسم {name}
احفظ اللي نسخته باسم {name}
اللي حول لي احفظه باسم {name}
ضيف شخص جديد اسمه {name}
""",
        "ar_msa": """
أضف {name} إلى جهات الاتصال
احفظ جهة اتصال جديدة باسم {name}
أضف مستلما جديدا اسمه {name}
سجل {name} كجهة اتصال
""",
        "ar_lev": """
زيد {name} عالأسماء
خزن {name} عندي
سجلو باسم {name}
""",
        "ar_egy": """
ضيف {name} للكونتاكتس
سجل {name} عندي
احفظه باسم {name}
""",
        "mix_ar_en": """
add {name} في الcontacts
ضيف {name} contact
save {name} عندي
احفظ الaddress باسم {name}
""",
    },
    "recovery_help": {
        "ar_gulf": """
ضاع تلفوني
ضاع جوالي شو اسوي
انسرق جوالي
ضيعت تلفوني
جوالي انكسر وابي فلوسي
عندي جوال جديد كيف ارجع محفظتي
ما اقدر ادخل محفظتي
كيف استرجع حسابي
تلفوني طاح في البحر
جوالي راح شو اسوي بالفلوس
""",
        "ar_msa": """
فقدت هاتفي
سرق هاتفي ماذا أفعل
كيف أستعيد محفظتي
أريد استرداد حسابي على جهاز جديد
لا أستطيع الوصول إلى محفظتي
""",
        "ar_lev": """
ضاع موبايلي
انسرق التلفون شو بعمل
بدي رجع محفظتي عالموبايل الجديد
""",
        "ar_egy": """
الموبايل ضاع
اتسرق موبايلي اعمل ايه
عايز ارجع المحفظة على موبايل جديد
""",
        "mix_ar_en": """
ضاع الphone
ابي اسوي recovery
الmobile انسرق
ابي ارجع الwallet على phone جديد
""",
    },
    "cancel": {
        "ar_gulf": """
لا
لا خلاص
الغي
الغيها
بلاش
خلاص ما ابي
لا تحول
لا ترسل
وقف
وقف التحويل
لا لا غلط
مو هذا
هون ما ابي
ارجع
""",
        "ar_msa": """
إلغاء
ألغ العملية
لا أريد
توقف
لا ترسل المبلغ
تراجع
""",
        "ar_lev": """
لأ
خلص ما بدي
لا تبعت
وقف
""",
        "ar_egy": """
لا خلاص
مش عايز
الغي
متحولش
""",
        "mix_ar_en": """
cancel
لا cancel
كنسل
cancel التحويل
stop لا ترسل
""",
    },
    "unknown": {
        "ar_gulf": """
شلونك
مرحبا
كيف الجو اليوم
شغل لي أغنية
ارسل رسالة ل{name}
دز صورة ل{name}
اتصل على {name}
وين أقرب مطعم
كم الساعة
ذكرني بكرة الصبح
شو أخبار الدوري
ابي اطلب بيتزا
ارسل ايميل ل{name}
سولف معي
شو سجل المكالمات
افتح الكاميرا
""",
        "ar_msa": """
ما حالة الطقس
شغل الموسيقى
أرسل رسالة إلى {name}
اتصل بـ {name}
ما هي عاصمة فرنسا
أضف موعدا في التقويم
ما هو سعر الذهب اليوم
""",
        "ar_lev": """
كيفك
شو الطقس بكرا
ابعت مسج ل{name}
دقلي على {name}
""",
        "ar_egy": """
ازيك
الجو عامل ايه
ابعت رسالة ل{name}
كلم {name}
""",
        "mix_ar_en": """
ارسل message ل{name}
شغل الmusic
send photo ل{name}
شو الweather
""",
    },
}

# Hand-written Arabizi (Latin + digits), mostly Gulf. The generator also
# converts Arabic-script templates to Arabizi automatically.
ARABIZI = {
    "check_balance": """
kam raseedi
kam 3indi
sh9ad 3indi
shkther raseedi
wesh raseedi
abi a3rf raseedi
shlon el balance
kam el balance
ades raseedi
""",
    "send": """
7awel {amt} {unit} l {name}
7awel l {name} {amt}
abi a7awel {amt} l {name}
arsel {amt} {unit} l {name}
dez {amt} l {name}
ab3ath {amt} {unit} l {name}
bade 7awel {amt} la {name}
3ayez ab3at {amt} l {name}
""",
    "history": """
shu a5er 3amaliya
wesh a5er el ta7weelat
abi ashoof el 3amaliyat
warini el history
""",
    "tx_status": """
wesalat el flous l {name}
el ta7weel wesal
{name} istalam el flous
el ta7weel 5ala9
""",
    "receive": """
3a6ni 3enwani
wesh 3enwan el ma7fatha
abi asta9bel flous
""",
    "add_contact": """
9ayef {name}
e7fath {name}
sajjel {name} 3indi
e7fatha b esm {name}
""",
    "recovery_help": """
9a3 telephoni
ensera9 jawali
9ayya3t el phone
abi arja3 el wallet
""",
    "cancel": """
la
la 5ala9
elghi
blash
5ala9 ma abi
la t7awel
wa9ef
""",
    "unknown": """
shlonak
kaifak
shaghel oghniya
arsel message l {name}
etasel 3ala {name}
""",
}
