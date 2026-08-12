"""African Languages Translation & Support Module.
Supports isiZulu, isiXhosa, Afrikaans, Sesotho, Setswana, Sepedi, Xitsonga, Tshivenda, Swati, Ndebele.
"""

import json
from typing import Dict, List, Optional

# Language code mapping
LANG_CODES = {
    "zulu": "zu",
    "xhosa": "xh",
    "afrikaans": "af",
    "sesotho": "st",
    "setswana": "tn",
    "sepedi": "nso",
    "xitsonga": "ts",
    "tshivenda": "ve",
    "swati": "ss",
    "ndebele": "nr",
    "english": "en",
}

# Basic phrase dictionary
PHRASES = {
    "hello": {
        "zu": "Sawubona",
        "xh": "Molo",
        "af": "Hallo",
        "st": "Dumela",
        "tn": "Dumela",
        "nso": "Dumela",
        "ts": "Avuxeni",
        "ve": "Ndaa / Aa",
        "ss": "Sawubona",
        "nr": "Sawubona",
        "en": "Hello",
    },
    "thank_you": {
        "zu": "Ngiyabonga",
        "xh": "Enkosi",
        "af": "Dankie",
        "st": "Kea leboha",
        "tn": "Ke a leboga",
        "nso": "Ke a leboga",
        "ts": "Ndza nkhensa",
        "ve": "Ndo livhuwa",
        "ss": "Ngiyabonga",
        "nr": "Ngiyabonga",
        "en": "Thank you",
    },
    "goodbye": {
        "zu": "Hamba kahle / Sala kahle",
        "xh": "Hamba kakuhle / Sala kakuhle",
        "af": "Totsiens",
        "st": "Sala hantle / Tsamaya hantle",
        "tn": "Go siame",
        "nso": "Šala gabotse / Sepela gabotse",
        "ts": "Hambi kahle / Sala kahle",
        "ve": "Vhaṱeni fhano / Tshimbilani fhano",
        "ss": "Hamba kahle / Sala kahle",
        "nr": "Hamba kahle / Sala kahle",
        "en": "Goodbye",
    },
    "how_are_you": {
        "zu": "Unjani?",
        "xh": "Unjani?",
        "af": "Hoe gaan dit?",
        "st": "O phela joang?",
        "tn": "O tsogile jang?",
        "nso": "O phela joang?",
        "ts": "Ku njhani?",
        "ve": "Vha pfi khou ita mini?",
        "ss": "Unjani?",
        "nr": "Unjani?",
        "en": "How are you?",
    },
    "welcome": {
        "zu": "Siyakwamukela",
        "xh": "Wamkelekile",
        "af": "Welkom",
        "st": "O amohetswe",
        "tn": "O amogelesegile",
        "nso": "O a amogelelwa",
        "ts": "U amukeriwile",
        "ve": "Vha ṱoḓea",
        "ss": "Siyakwamukela",
        "nr": "Siyakwamukela",
        "en": "Welcome",
    },
}


def translate_phrase(phrase: str, target_lang: str = "zu") -> str:
    """Translate a common phrase to an African language."""
    code = LANG_CODES.get(target_lang.lower(), target_lang.lower())
    return PHRASES.get(phrase, {}).get(code, phrase)


def get_supported_languages() -> List[Dict]:
    """Return list of supported African languages."""
    return [
        {"name": "isiZulu", "code": "zu", "region": "KwaZulu-Natal"},
        {"name": "isiXhosa", "code": "xh", "region": "Eastern Cape"},
        {"name": "Afrikaans", "code": "af", "region": "Western Cape, National"},
        {"name": "Sesotho", "code": "st", "region": "Free State"},
        {"name": "Setswana", "code": "tn", "region": "North West"},
        {"name": "Sepedi", "code": "nso", "region": "Limpopo"},
        {"name": "Xitsonga", "code": "ts", "region": "Limpopo, Mpumalanga"},
        {"name": "Tshivenda", "code": "ve", "region": "Limpopo"},
        {"name": "siSwati", "code": "ss", "region": "Mpumalanga"},
        {"name": "isiNdebele", "code": "nr", "region": "Mpumalanga"},
    ]


def detect_language(text: str) -> str:
    """Basic language detection for South African languages."""
    # Very simple heuristic
    indicators = {
        "zu": ["ngiyabonga", "sawubona", "umuntu"],
        "xh": ["enkosi", "molo", "ubuntu"],
        "af": ["dankie", "hallo", "goeie"],
        "st": ["kea leboha", "dumela", "mohlotse"],
        "tn": ["kea leboga", "dumela", "rone"],
    }
    text_lower = text.lower()
    for lang, words in indicators.items():
        if any(w in text_lower for w in words):
            return lang
    return "en"


class AfricanLanguages:
    """African languages support engine."""

    def __init__(self):
        self.phrases = PHRASES
        self.lang_codes = LANG_CODES

    def translate(self, text: str, target: str = "zu") -> str:
        """Translate text to target African language."""
        # For now, only support known phrases
        if text.lower() in self.phrases:
            return translate_phrase(text.lower(), target)
        return text

    def greet(self, lang: str = "zu") -> str:
        return translate_phrase("hello", lang)

    def languages(self) -> List[Dict]:
        return get_supported_languages()


if __name__ == "__main__":
    engine = AfricanLanguages()
    print(engine.greet("zu"))
    print(engine.greet("xh"))
    print(engine.greet("af"))
    print(json.dumps(engine.languages(), indent=2))
