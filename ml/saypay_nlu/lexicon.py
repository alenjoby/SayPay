"""Shared word lists and Arabic clitic handling."""

from __future__ import annotations

# Arabic prefixes that attach to the next word: و (and), ب (with/in), ل (to),
# ف (so), ال (the), and combinations. "لأحمد" -> "احمد", "وعشرين" -> "عشرين".
_AR_PREFIXES = ("وبال", "وال", "بال", "فال", "كال", "لل", "ال", "و", "ب", "ل", "ف")


def ar_variants(word: str) -> list[str]:
    """The word plus versions with Arabic clitic prefixes removed."""
    out = [word]
    for p in _AR_PREFIXES:
        if word.startswith(p) and len(word) - len(p) >= 2:
            rest = word[len(p):]
            if rest not in out:
                out.append(rest)
            # One more level: "وال" handled above, but "ولل..." etc.
            for q in ("ال",):
                if rest.startswith(q) and len(rest) - len(q) >= 2 and rest[len(q):] not in out:
                    out.append(rest[len(q):])
    return out


# Words that name a relationship rather than a person. A saved contact named
# with any word in a group also matches the other words in that group.
FAMILY_ALIASES: list[set[str]] = [
    {"mom", "mother", "mum", "mummy", "mommy", "mama", "maa", "amma", "ammi", "ammy",
     "umma", "ummi", "yumma", "امي", "ماما", "يمه", "يما", "والدتي", "امه",
     "माँ", "मां", "मम्मी", "अम्मा", "अम्मी", "माता"},
    {"dad", "father", "papa", "pappa", "baba", "abba", "abbu", "abu", "yuba", "ابوي", "بابا",
     "يبه", "يبا", "والدي", "ابويه", "पापा", "पिताजी", "अब्बा", "अब्बू", "बाबा"},
    {"brother", "bro", "bhai", "bhaiya", "akhi", "اخوي", "اخي", "भाई", "भैया"},
    {"sister", "sis", "didi", "behen", "ukhti", "اختي", "اخويه", "दीदी", "बहन"},
    {"wife", "biwi", "zawjati", "زوجتي", "مرتي", "बीवी", "पत्नी"},
    {"husband", "pati", "zawji", "زوجي", "رجلي", "पति"},
    {"son", "beta", "ibni", "ولدي", "ابني", "बेटा"},
    {"daughter", "beti", "binti", "بنتي", "बेटी"},
    {"grandma", "grandmother", "nani", "dadi", "yaddah", "جدتي", "يدتي", "नानी", "दादी"},
    {"grandpa", "grandfather", "nana", "dada", "jaddi", "جدي", "يدي", "नाना", "दादा"},
]

# Tokens that should never be taken as a contact name or a new name.
STOPWORDS = {
    # English
    "to", "for", "the", "a", "an", "my", "me", "i", "is", "it", "of", "and", "please", "pls",
    "can", "you", "could", "would", "just", "this", "that", "user", "person", "guy", "him",
    "her", "them", "some", "money", "now", "what", "whats", "how", "much", "do", "does",
    "did", "have", "has", "with", "from", "on", "in", "at", "as", "be", "want", "wanna",
    "need", "let", "lets", "hey", "hi", "hello", "ok", "okay", "yes", "new", "number",
    "phone", "account", "wallet", "go", "through", "here", "there", "tell", "show", "give",
    "check", "one", "which", "who", "was", "were", "are", "am", "via", "using", "by",
    # Hinglish
    "ko", "ke", "ki", "ka", "liye", "mera", "meri", "mere", "mujhe", "hai", "hain", "kya",
    "karo", "kar", "kardo", "karna", "do", "de", "dena", "bhai", "yaar", "aur", "se", "me",
    "mein", "main", "ek", "ye", "yeh", "wo", "woh", "bhi", "na", "abhi", "paise", "paisa",
    "kitna", "kitne", "tha", "thi", "hua", "gaya", "gayi",
    # Arabic (normalized)
    "الى", "لـ", "حق", "حقي", "على", "عن", "من", "في", "انا", "ابي", "ابغي", "ابغى",
    "اريد", "بدي", "ودي", "ممكن", "لو", "سمحت", "يا", "هذا", "هذي", "هاذا", "شخص", "حساب",
    "فلوس", "مبلغ", "الحين", "الان", "لي", "هو", "هي", "كم", "شو", "ايش", "وش", "رقم",
    "جوال", "تلفون", "محفظه", "عشان", "بس", "اللي", "الي", "مع", "و", "ل", "ب", "يعني",
    "كان", "تم",
}
