#!/usr/bin/env python3
"""
African Languages Support Module v25.1.0 "LUQI"
=================================================
Multilingual support for major African languages including:
- Swahili, Yoruba, Igbo, Zulu, Hausa, Amharic, Somali
- Translation, transliteration, and cultural context
- Language detection and text-to-speech preparation

Usage:
    from work_support.african_languages import translate, detect_language
    result = translate("Hello", target_lang="sw")
"""

import json
import re
from typing import Dict, List, Optional

# ═══════════════════════════════════════════════════════════════════════════════
#  LANGUAGE DATA
# ═══════════════════════════════════════════════════════════════════════════════

LANGUAGE_CODES = {
    "sw": "Swahili",
    "yo": "Yoruba",
    "ig": "Igbo",
    "zu": "Zulu",
    "ha": "Hausa",
    "am": "Amharic",
    "so": "Somali",
    "af": "Afrikaans",
    "rw": "Kinyarwanda",
    "lg": "Luganda",
    "sn": "Shona",
    "tw": "Twi",
    "mg": "Malagasy",
    "ny": "Chichewa",
    "tn": "Tswana",
    "xh": "Xhosa",
    "kg": "Kongo",
    "ln": "Lingala",
    "wo": "Wolof",
    "bm": "Bambara",
}

# Greeting phrases by language
GREETINGS = {
    "sw": {"hello": "Habari", "good_morning": "Habari za asubuhi", "good_evening": "Habari za jioni",
           "how_are_you": "Habari gani?", "thank_you": "Asante", "welcome": "Karibu",
           "goodbye": "Kwa heri", "yes": "Ndiyo", "no": "Hapana"},
    "yo": {"hello": "Bawo ni", "good_morning": "E kaaro", "good_evening": "E kaale",
           "how_are_you": "Bawo ni?", "thank_you": "E se", "welcome": "E kaabo",
           "goodbye": "O dabọ", "yes": "Bẹẹni", "no": "Rara"},
    "ig": {"hello": "Nnọọ", "good_morning": "Ịtụtụ ọma", "good_evening": "Mgbede ọma",
           "how_are_you": "Kedu?", "thank_you": "Daalụ", "welcome": "Nnọọ",
           "goodbye": "Ka ọ dị", "yes": "Ee", "no": "Mba"},
    "zu": {"hello": "Sawubona", "good_morning": "Sawubona", "good_evening": "Sawubona",
           "how_are_you": "Unjani?", "thank_you": "Ngiyabonga", "welcome": "Wamukelekile",
           "goodbye": "Hamba kahle", "yes": "Yebo", "no": "Cha"},
    "ha": {"hello": "Sannu", "good_morning": "Barka da safiya", "good_evening": "Barka da yamma",
           "how_are_you": "Yaya kake?", "thank_you": "Na gode", "welcome": "Maraba",
           "goodbye": "Sai anjima", "yes": "Ee", "no": "A'a"},
    "am": {"hello": "ሰላም (Selam)", "good_morning": "ደህና እደላችሁ", "good_evening": "ደህና እደላችሁ",
           "how_are_you": "እንዴት ነህ?", "thank_you": "አመሰግናለሁ", "welcome": "እንኳን ደህና መጣህ",
           "goodbye": "ቻው", "yes": "አዎ", "no": "አይ"},
    "so": {"hello": "Salaan", "good_morning": "Subax wanaagsan", "good_evening": "Fiid wanaagsan",
           "how_are_you": "Is ka warran?", "thank_you": "Mahadsanid", "welcome": "Soo dhawow",
           "goodbye": "Nabad gelyo", "yes": "Haa", "no": "Maya"},
}

# Common conversational translations
COMMON_PHRASES = {
    "sw": {"I need help": "Nahitaji msaada", "What is your name?": "Jina lako nani?",
           "My name is": "Jina langu ni", "I don't understand": "Sielewi",
           "Please speak slowly": "Tafadhali sema pole pole", "Where is the hospital?": "Hospitali iko wapi?",
           "How much does this cost?": "Hii bei gani?", "I am lost": "Nimepotea",
           "Can you help me?": "Unaweza kunisaidia?", "Water": "Maji", "Food": "Chakula"},
    "yo": {"I need help": "Mo nilo iranlowo", "What is your name?": "Kini oruko re?",
           "My name is": "Oruko mi ni", "I don't understand": "Nko oye",
           "Please speak slowly": "Jọwọ sọ rora", "Where is the hospital?": "Ibo ni ile iwosan?",
           "How much does this cost?": "Elo ni eleyi?", "I am lost": "Mo sonu",
           "Can you help me?": "Ṣe o le ran mi lowo?", "Water": "Omi", "Food": "Ounje"},
    "ig": {"I need help": "Achọrọ m enyemaka", "What is your name?": "Kedu aha gị?",
           "My name is": "Aha m bụ", "I don't understand": "Aghọtaghị m",
           "Please speak slowly": "Biko kwuo nwayọọ", "Where is the hospital?": "Ebee ka ụlọ ọgwụ dị?",
           "How much does this cost?": "Ego ole ka nke a bụ?", "I am lost": "A furu m efe",
           "Can you help me?": "Ị nwere ike inyere m aka?", "Water": "Mmiri", "Food": "Nri"},
    "zu": {"I need help": "Ngidinga usizo", "What is your name?": "Ubani igama lakho?",
           "My name is": "Igama lami ngu", "I don't understand": "Angiqondi",
           "Please speak slowly": "Ake ukhulume kancane", "Where is the hospital?": "Isibhedlele sikuphi?",
           "How much does this cost?": "Kubiza malini?", "I am lost": "Ngilahlekile",
           "Can you help me?": "Ungangisiza?", "Water": "Amanzi", "Food": "Ukudla"},
    "ha": {"I need help": "Ina bukatan taimako", "What is your name?": "Yaya sunanka?",
           "My name is": "Sunana ne", "I don't understand": "Ban fahimta ba",
           "Please speak slowly": "Don Allah ka yi hankali", "Where is the hospital?": "Ina asibitin yake?",
           "How much does this cost?": "Nawa ne wannan?", "I am lost": "Na bata",
           "Can you help me?": "Za ka iya taimaka mini?", "Water": "Ruwa", "Food": "Abinci"},
}

# Number translations (1-10)
NUMBERS = {
    "sw": ["moja", "mbili", "tatu", "nne", "tano", "sita", "saba", "nane", "tisa", "kumi"],
    "yo": ["okan", "meji", "meta", "merin", "marun", "mefa", "meje", "mejo", "mesan", "mewa"],
    "ig": ["otu", "abụọ", "atọ", "anọ", "ise", "isi", "asaa", "asatọ", "iteghete", "iri"],
    "zu": ["kunye", "kubili", "kuthathu", "kune", "kunhlanu", "isithupha", "isikhombisa", "isishiyagalombili", "isishiyagalolunye", "ishumi"],
    "ha": ["daya", "biyu", "uku", "hudu", "biyar", "shida", "bakwai", "takwas", "tara", "goma"],
    "am": ["አንድ", "ሁለት", "ሦስት", "አራት", "አምስት", "ስድስት", "ሰባት", "ስምንት", "ዘጠኝ", "አስር"],
    "so": ["kow", "laba", "saddex", "afar", "shan", "lix", "toddoba", "siddeed", "sagaal", "toban"],
}


# ═══════════════════════════════════════════════════════════════════════════════
#  CORE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_supported_languages() -> Dict[str, str]:
    """Return a dictionary of supported language codes and names."""
    return dict(LANGUAGE_CODES)


def detect_language(text: str) -> str:
    """Best-effort language detection for African languages."""
    text_lower = text.lower().strip()
    
    # Check for Amharic script (Ge'ez)
    if re.search(r'[\u1200-\u137F]', text):
        return "am"
    
    # Check for specific Swahili markers
    sw_markers = ["habari", "asante", "karibu", "jina", "tafadhali", "maji", "asubuhi"]
    if any(m in text_lower for m in sw_markers):
        return "sw"
    
    # Check for Yoruba markers (with tone marks)
    yo_markers = ["bawo", "ẹ kú", "ẹ kaaro", "ẹ kaale", "o dabọ", "ẹ jọwọ", "e se"]
    if any(m in text_lower for m in yo_markers):
        return "yo"
    
    # Check for Igbo markers
    ig_markers = ["nnọọ", "kedụ", "daalụ", "ka ọ dị", "biko", "nno"]
    if any(m in text_lower for m in ig_markers):
        return "ig"
    
    # Check for Zulu markers
    zu_markers = ["sawubona", "unjani", "ngiyabonga", "wamukelekile", "yebo", "cha"]
    if any(m in text_lower for m in zu_markers):
        return "zu"
    
    # Check for Hausa markers
    ha_markers = ["sannu", "na gode", "maraba", "ina bukatar", "don allah", "yaya kake"]
    if any(m in text_lower for m in ha_markers):
        return "ha"
    
    # Check for Somali markers
    so_markers = ["salaan", "subax wanaagsan", "mahadsanid", "nabad gelyo", "ismaa"]
    if any(m in text_lower for m in so_markers):
        return "so"
    
    return "unknown"


def translate(text: str, target_lang: str = "sw", source_lang: str = "en") -> Dict:
    """Translate common phrases. Falls back to phrase lookup."""
    target_lang = target_lang.lower()
    source_lang = source_lang.lower()
    
    if target_lang not in LANGUAGE_CODES:
        return {"status": "error", "message": f"Language '{target_lang}' not supported. Use: {list(LANGUAGE_CODES.keys())}"}
    
    text_lower = text.lower().strip()
    
    # Check greetings
    greetings = GREETINGS.get(target_lang, {})
    for key, phrase in greetings.items():
        if text_lower == key.lower() or text_lower in key.lower():
            return {"status": "success", "translation": phrase, "source": text, "language": LANGUAGE_CODES[target_lang]}
    
    # Check common phrases (English -> target)
    common = COMMON_PHRASES.get(target_lang, {})
    if text_lower in common:
        return {"status": "success", "translation": common[text_lower], "source": text, "language": LANGUAGE_CODES[target_lang]}
    
    # Check for partial matches
    for eng, trans in common.items():
        if eng.lower() in text_lower or text_lower in eng.lower():
            return {"status": "success", "translation": trans, "source": text, "language": LANGUAGE_CODES[target_lang], "note": "partial match"}
    
    return {"status": "available_languages", "requested": text, "target": LANGUAGE_CODES[target_lang],
            "supported_phrases": list(common.keys())[:10]}


def translate_number(number: int, target_lang: str = "sw") -> Dict:
    """Translate a number (1-10) to the target language."""
    target_lang = target_lang.lower()
    if target_lang not in LANGUAGE_CODES:
        return {"status": "error", "message": f"Language '{target_lang}' not supported"}
    
    if not 1 <= number <= 10:
        return {"status": "error", "message": "Only numbers 1-10 supported"}
    
    numbers = NUMBERS.get(target_lang, [])
    if numbers:
        return {"status": "success", "number": number, "translation": numbers[number - 1], "language": LANGUAGE_CODES[target_lang]}
    return {"status": "not_available", "message": f"Numbers not available for {LANGUAGE_CODES[target_lang]}"}


def get_greeting(greeting_type: str = "hello", lang: str = "sw") -> Dict:
    """Get a greeting in the specified language."""
    lang = lang.lower()
    if lang not in GREETINGS:
        return {"status": "error", "available": list(GREETINGS.keys()), "message": f"Greetings not available for '{lang}'"}
    
    greeting = GREETINGS[lang].get(greeting_type)
    if greeting:
        return {"status": "success", "greeting": greeting, "type": greeting_type, "language": LANGUAGE_CODES[lang]}
    
    return {"status": "available_greetings", "types": list(GREETINGS[lang].keys()), "language": LANGUAGE_CODES[lang]}


def get_numbers(lang: str = "sw") -> Dict:
    """Get all numbers (1-10) in the specified language."""
    lang = lang.lower()
    if lang not in NUMBERS:
        return {"status": "error", "message": f"Numbers not available for '{lang}'"}
    
    result = {i + 1: NUMBERS[lang][i] for i in range(10)}
    return {"status": "success", "language": LANGUAGE_CODES[lang], "numbers": result}


def get_cultural_note(lang: str = "sw") -> Dict:
    """Get cultural context notes for a language."""
    notes = {
        "sw": "Swahili is spoken by over 200 million people across East Africa. It's the lingua franca of the region and uses 'Habari' as a universal greeting that works at any time of day.",
        "yo": "Yoruba is spoken by over 45 million people in Nigeria, Benin, and Togo. Greetings are very important - always greet elders first. 'Bawo ni' is the standard greeting.",
        "ig": "Igbo is spoken by over 27 million people, primarily in southeastern Nigeria. 'Nnọọ' is a warm welcome greeting. Respect and hospitality are core cultural values.",
        "zu": "Zulu is the most widely spoken home language in South Africa with over 12 million speakers. 'Sawubona' literally means 'I see you' - acknowledging the person's presence.",
        "ha": "Hausa is spoken by over 80 million people across West Africa, primarily in northern Nigeria and Niger. 'Sannu' is a respectful greeting used in all situations.",
        "am": "Amharic is the official language of Ethiopia with over 32 million speakers. It uses the Ge'ez script. Greetings are formal and often include blessings.",
        "so": "Somali is spoken by over 20 million people in Somalia, Djibouti, Ethiopia, and Kenya. 'Salaan' derives from Arabic 'Salaam' meaning peace.",
    }
    
    lang = lang.lower()
    if lang in notes:
        return {"status": "success", "language": LANGUAGE_CODES.get(lang, lang), "note": notes[lang]}
    return {"status": "error", "available": list(LANGUAGE_CODES.keys())}


def transliterate(text: str, lang: str = "am") -> Dict:
    """Provide transliteration for languages with non-Latin scripts."""
    transliterations = {
        "am": {
            "ሰላም": "selam", "አመሰግናለሁ": "amesegenalehu", "እንዴት ነህ": "indet neh",
            "አዎ": "awo", "አይ": "ay", "እንኳን ደህና መጣህ": "enquan dena metah",
        },
    }
    
    lang = lang.lower()
    if lang in transliterations:
        text_lower = text.strip()
        if text_lower in transliterations[lang]:
            return {"status": "success", "original": text, "transliteration": transliterations[lang][text_lower], "language": LANGUAGE_CODES.get(lang, lang)}
        return {"status": "available", "phrases": list(transliterations[lang].keys())}
    return {"status": "error", "message": f"Transliteration not available for '{lang}'"}


def get_all_greetings() -> Dict:
    """Get all greetings for all supported languages."""
    return {"status": "success", "greetings": {k: v for k, v in GREETINGS.items()}}


def language_search(query: str) -> Dict:
    """Search for languages by name or code."""
    query = query.lower()
    results = []
    for code, name in LANGUAGE_CODES.items():
        if query in code.lower() or query in name.lower():
            results.append({"code": code, "name": name, "greetings_available": code in GREETINGS, "numbers_available": code in NUMBERS})
    
    if results:
        return {"status": "success", "results": results}
    return {"status": "not_found", "query": query, "all_languages": {code: name for code, name in LANGUAGE_CODES.items()}}


# ═══════════════════════════════════════════════════════════════════════════════
#  FASTAPI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════

def api_translate(text: str, target: str = "sw") -> Dict:
    """API wrapper for translation."""
    return translate(text, target_lang=target)


def api_detect(text: str) -> Dict:
    """API wrapper for language detection."""
    lang = detect_language(text)
    return {"status": "success", "detected_language": lang, "language_name": LANGUAGE_CODES.get(lang, "Unknown"), "text_sample": text[:50]}


def api_get_greetings(lang: str = "sw") -> Dict:
    """API wrapper for greetings."""
    return get_greeting(greeting_type="hello", lang=lang)


def api_language_list() -> Dict:
    """API wrapper for language list."""
    return {"status": "success", "languages": get_supported_languages(), "total": len(LANGUAGE_CODES)}


def api_cultural_note(lang: str = "sw") -> Dict:
    """API wrapper for cultural notes."""
    return get_cultural_note(lang=lang)


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import sys
    
    # Demo mode
    print("=" * 50)
    print("African Languages Support Demo")
    print("=" * 50)
    
    print("\nSupported languages:")
    for code, name in get_supported_languages().items():
        print(f"  {code}: {name}")
    
    print("\n--- Greetings ---")
    for lang in ["sw", "yo", "ig", "zu", "ha"]:
        g = get_greeting("hello", lang)
        print(f"  {LANGUAGE_CODES[lang]}: {g.get('greeting', 'N/A')}")
    
    print("\n--- Sample Translations ---")
    for text in ["hello", "thank_you", "how_are_you"]:
        print(f"\n  '{text}':")
        for lang in ["sw", "yo", "zu"]:
            t = translate(text, target_lang=lang)
            print(f"    {LANGUAGE_CODES[lang]}: {t.get('translation', 'N/A')}")
    
    print("\n--- Language Detection ---")
    samples = ["Habari gani?", "Bawo ni?", "Sawubona!", "Na gode"]
    for s in samples:
        d = detect_language(s)
        print(f"  '{s}' -> {LANGUAGE_CODES.get(d, d)}")
