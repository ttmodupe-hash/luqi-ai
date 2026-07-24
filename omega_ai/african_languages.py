#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
African Languages Module for Omega AI
Provides support for major African languages including Swahili, Yoruba, Zulu,
Amharic, Hausa, Igbo, and more. Includes translation, transliteration,
language detection, and cultural context features.
"""

import re
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class AfricanLanguage(Enum):
    """Major African languages supported"""
    SWAHILI = "sw"
    YORUBA = "yo"
    ZULU = "zu"
    AMHARIC = "am"
    HAUSA = "ha"
    IGBO = "ig"
    SHONA = "sn"
    XHOSA = "xh"
    AFRIKAANS = "af"
    SOMALI = "so"
    KINYARWANDA = "rw"
    LINGALA = "ln"
    OROMO = "om"
    TIGRINYA = "ti"
    FULA = "ff"
    SESOTHO = "st"
    TSWANA = "tn"
    WOLLOF = "wo"
    BAMBARA = "bm"
    AKAN = "ak"
    BERBER = "ber"
    MALAGASY = "mg"
    MAURITIAN_CREOLE = "mfe"
    SEYCHELLOIS_CREOLE = "crs"
    CAPE_VERDEAN_CREOLE = "kea"
    CHICHEWA = "ny"


@dataclass
class LanguageInfo:
    """Information about an African language"""
    name: str
    native_name: str
    family: str
    region: str
    speakers_millions: float
    script: str
    has_tones: bool
    description: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "native_name": self.native_name,
            "family": self.family,
            "region": self.region,
            "speakers_millions": self.speakers_millions,
            "script": self.script,
            "has_tones": self.has_tones,
            "description": self.description
        }


@dataclass
class TranslationResult:
    """Result of a translation operation"""
    original: str
    translated: str
    source_language: str
    target_language: str
    confidence: float
    alternatives: List[str] = field(default_factory=list)
    cultural_note: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "original": self.original,
            "translated": self.translated,
            "source_language": self.source_language,
            "target_language": self.target_language,
            "confidence": self.confidence,
            "alternatives": self.alternatives,
            "cultural_note": self.cultural_note
        }


@dataclass
class GreetingPhrase:
    """Greeting phrase in an African language"""
    language: str
    phrase: str
    meaning: str
    context: str
    pronunciation: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "language": self.language,
            "phrase": self.phrase,
            "meaning": self.meaning,
            "context": self.context,
            "pronunciation": self.pronunciation
        }


class AfricanLanguages:
    """
    African Languages support module for Omega AI.
    Provides translation, transliteration, language info, greetings,
    proverbs, and cultural context for major African languages.
    """
    
    def __init__(self):
        self.languages_info = self._initialize_language_info()
        self.translation_dicts = self._initialize_translation_dicts()
        self.greetings_db = self._initialize_greetings()
        self.proverbs_db = self._initialize_proverbs()
        self.cultural_contexts = self._initialize_cultural_contexts()
        logger.info("AfricanLanguages module initialized")
    
    def _initialize_language_info(self) -> Dict[str, LanguageInfo]:
        """Initialize language information database"""
        return {
            AfricanLanguage.SWAHILI.value: LanguageInfo(
                name="Swahili",
                native_name="Kiswahili",
                family="Niger-Congo, Bantu",
                region="East Africa (Kenya, Tanzania, Uganda, DRC, Rwanda, Burundi, Mozambique)",
                speakers_millions=200.0,
                script="Latin",
                has_tones=False,
                description="Swahili is a Bantu language widely spoken in East Africa. It serves as a lingua franca in the region and is the official language of several countries."
            ),
            AfricanLanguage.YORUBA.value: LanguageInfo(
                name="Yoruba",
                native_name="Yorùbá",
                family="Niger-Congo, Volta-Niger",
                region="Nigeria, Benin, Togo",
                speakers_millions=50.0,
                script="Latin",
                has_tones=True,
                description="Yoruba is a tonal language spoken primarily in southwestern Nigeria. It has a rich cultural heritage including Ifa divination and oral literature."
            ),
            AfricanLanguage.ZULU.value: LanguageInfo(
                name="Zulu",
                native_name="isiZulu",
                family="Niger-Congo, Bantu",
                region="South Africa (KwaZulu-Natal), Zimbabwe, Lesotho, Eswatini",
                speakers_millions=28.0,
                script="Latin",
                has_tones=False,
                description="Zulu is one of South Africa's 11 official languages. It features click consonants and is the most widely spoken home language in South Africa."
            ),
            AfricanLanguage.AMHARIC.value: LanguageInfo(
                name="Amharic",
                native_name="አማርኛ",
                family="Afro-Asiatic, Semitic",
                region="Ethiopia",
                speakers_millions=32.0,
                script="Ge'ez (Ethiopic)",
                has_tones=False,
                description="Amharic is the official language of Ethiopia and the second-most spoken Semitic language in the world after Arabic. It uses the Ge'ez script."
            ),
            AfricanLanguage.HAUSA.value: LanguageInfo(
                name="Hausa",
                native_name="Hausa / هَرْشَن هَوْسَ",
                family="Afro-Asiatic, Chadic",
                region="Nigeria, Niger, Ghana, Cameroon, Chad, Sudan",
                speakers_millions=80.0,
                script="Latin, Arabic (Ajami)",
                has_tones=True,
                description="Hausa is one of Africa's largest languages, serving as a lingua franca across West Africa. It uses both Latin and Arabic scripts."
            ),
            AfricanLanguage.IGBO.value: LanguageInfo(
                name="Igbo",
                native_name="Asụsụ Igbo",
                family="Niger-Congo, Volta-Niger",
                region="Nigeria (Southeast), Equatorial Guinea",
                speakers_millions=27.0,
                script="Latin",
                has_tones=True,
                description="Igbo is spoken in southeastern Nigeria. It is a tonal language with a rich oral tradition including proverbs and folktales."
            ),
            AfricanLanguage.SHONA.value: LanguageInfo(
                name="Shona",
                native_name="chiShona",
                family="Niger-Congo, Bantu",
                region="Zimbabwe, Mozambique, Zambia, Botswana",
                speakers_millions=14.0,
                script="Latin",
                has_tones=False,
                description="Shona is the most widely spoken Bantu language in Zimbabwe. It has several dialects including Zezuru, Karanga, and Manyika."
            ),
            AfricanLanguage.XHOSA.value: LanguageInfo(
                name="Xhosa",
                native_name="isiXhosa",
                family="Niger-Congo, Bantu",
                region="South Africa (Eastern Cape, Western Cape), Lesotho",
                speakers_millions=19.0,
                script="Latin",
                has_tones=False,
                description="Xhosa is one of South Africa's official languages, famous for its click consonants. It is the language of Nelson Mandela."
            ),
            AfricanLanguage.AFRIKAANS.value: LanguageInfo(
                name="Afrikaans",
                native_name="Afrikaans",
                family="Indo-European, Germanic",
                region="South Africa, Namibia",
                speakers_millions=7.2,
                script="Latin",
                has_tones=False,
                description="Afrikaans is a West Germanic language that evolved from Dutch. It is one of South Africa's official languages."
            ),
            AfricanLanguage.SOMALI.value: LanguageInfo(
                name="Somali",
                native_name="Soomaali",
                family="Afro-Asiatic, Cushitic",
                region="Somalia, Djibouti, Ethiopia, Kenya",
                speakers_millions=25.0,
                script="Latin",
                has_tones=False,
                description="Somali is the official language of Somalia and a national language in Djibouti. It has a rich tradition of poetry."
            ),
            AfricanLanguage.KINYARWANDA.value: LanguageInfo(
                name="Kinyarwanda",
                native_name="Ikinyarwanda",
                family="Niger-Congo, Bantu",
                region="Rwanda, Uganda, DRC, Burundi",
                speakers_millions=12.0,
                script="Latin",
                has_tones=False,
                description="Kinyarwanda is the official language of Rwanda, spoken by almost all Rwandans. It is mutually intelligible with Kirundi."
            ),
            AfricanLanguage.LINGALA.value: LanguageInfo(
                name="Lingala",
                native_name="Lingála",
                family="Niger-Congo, Bantu",
                region="DRC, Republic of Congo",
                speakers_millions=20.0,
                script="Latin",
                has_tones=False,
                description="Lingala is a Bantu language spoken in the northwestern part of the DRC and the Republic of Congo. It is used in popular music across Africa."
            ),
            AfricanLanguage.OROMO.value: LanguageInfo(
                name="Oromo",
                native_name="Afaan Oromoo",
                family="Afro-Asiatic, Cushitic",
                region="Ethiopia, Kenya, Somalia",
                speakers_millions=37.0,
                script="Latin",
                has_tones=False,
                description="Oromo is the most widely spoken language in Ethiopia. It uses a Latin-based script known as Qubee."
            ),
            AfricanLanguage.TIGRINYA.value: LanguageInfo(
                name="Tigrinya",
                native_name="ትግርኛ",
                family="Afro-Asiatic, Semitic",
                region="Eritrea, Ethiopia (Tigray)",
                speakers_millions=10.0,
                script="Ge'ez (Ethiopic)",
                has_tones=False,
                description="Tigrinya is spoken in Eritrea and the Tigray region of Ethiopia. It uses the Ge'ez script like Amharic."
            ),
            AfricanLanguage.FULA.value: LanguageInfo(
                name="Fula",
                native_name="Fulfulde / Pulaar",
                family="Niger-Congo, Atlantic",
                region="West Africa (Nigeria, Guinea, Senegal, Cameroon, Niger, etc.)",
                speakers_millions=40.0,
                script="Latin, Arabic (Ajami)",
                has_tones=False,
                description="Fula (also called Fulfulde or Pulaar) is spoken across West Africa by the Fulani people, traditionally nomadic pastoralists."
            ),
            AfricanLanguage.SESOTHO.value: LanguageInfo(
                name="Sesotho",
                native_name="Sesotho",
                family="Niger-Congo, Bantu",
                region="Lesotho, South Africa (Free State, Gauteng)",
                speakers_millions=5.6,
                script="Latin",
                has_tones=False,
                description="Sesotho is the official language of Lesotho and is also spoken in South Africa. It belongs to the Sotho-Tswana group of Bantu languages."
            ),
            AfricanLanguage.TSWANA.value: LanguageInfo(
                name="Tswana",
                native_name="Setswana",
                family="Niger-Congo, Bantu",
                region="Botswana, South Africa (North West, Northern Cape), Namibia",
                speakers_millions=8.2,
                script="Latin",
                has_tones=False,
                description="Tswana is the official language of Botswana and is also spoken in South Africa and Namibia."
            ),
            AfricanLanguage.WOLLOF.value: LanguageInfo(
                name="Wolof",
                native_name="Wolof",
                family="Niger-Congo, Atlantic",
                region="Senegal, Gambia, Mauritania",
                speakers_millions=12.0,
                script="Latin",
                has_tones=False,
                description="Wolof is the most widely spoken language in Senegal and serves as a lingua franca in the country."
            ),
            AfricanLanguage.BAMBARA.value: LanguageInfo(
                name="Bambara",
                native_name="Bamanankan",
                family="Niger-Congo, Mande",
                region="Mali, Burkina Faso, Ivory Coast, Senegal",
                speakers_millions=14.0,
                script="Latin",
                has_tones=True,
                description="Bambara is the most widely spoken language in Mali and serves as a lingua franca in the country."
            ),
            AfricanLanguage.AKAN.value: LanguageInfo(
                name="Akan",
                native_name="Akan",
                family="Niger-Congo, Kwa",
                region="Ghana, Ivory Coast",
                speakers_millions=20.0,
                script="Latin",
                has_tones=True,
                description="Akan (including Twi, Fante, and Asante dialects) is one of the most widely spoken languages in Ghana."
            ),
            AfricanLanguage.MALAGASY.value: LanguageInfo(
                name="Malagasy",
                native_name="Malagasy",
                family="Austronesian, Malayo-Polynesian",
                region="Madagascar",
                speakers_millions=25.0,
                script="Latin",
                has_tones=False,
                description="Malagasy is the national language of Madagascar. Despite its geographic location, it belongs to the Austronesian language family."
            ),
            AfricanLanguage.CHICHEWA.value: LanguageInfo(
                name="Chichewa",
                native_name="Chichewa / Nyanja",
                family="Niger-Congo, Bantu",
                region="Malawi, Zambia, Mozambique, Zimbabwe",
                speakers_millions=12.0,
                script="Latin",
                has_tones=False,
                description="Chichewa (also called Nyanja) is the national language of Malawi and is also widely spoken in Zambia and Mozambique."
            )
        }
    
    def _initialize_translation_dicts(self) -> Dict[str, Dict[str, str]]:
        """Initialize basic translation dictionaries"""
        return {
            "sw": {
                "hello": "habari",
                "good morning": "habari za asubuhi",
                "good evening": "habari za jioni",
                "good night": "usiku mwema",
                "thank you": "asante",
                "thank you very much": "asante sana",
                "please": "tafadhali",
                "sorry": "samahani",
                "yes": "ndiyo",
                "no": "hapana",
                "goodbye": "kwa heri",
                "how are you": "habari yako",
                "I am fine": "nzuri",
                "what is your name": "jina lako nani",
                "my name is": "jina langu ni",
                "water": "maji",
                "food": "chakula",
                "friend": "rafiki",
                "love": "upendo",
                "peace": "amani",
                "welcome": "karibu",
                "help": "msaada",
                "family": "familia",
                "home": "nyumbani",
                "school": "shule",
                "work": "kazi",
                "money": "pesa",
                "time": "wakati",
                "day": "siku",
                "good": "nzuri",
                "bad": "mbaya",
                "big": "kubwa",
                "small": "ndogo",
                "beautiful": "nzuri",
                "happy": "furaha",
                "sad": "huzuni",
                "one": "moja",
                "two": "mbili",
                "three": "tatu",
                "four": "nne",
                "five": "tano",
                "ten": "kumi",
                "hundred": "mia",
                "thousand": "elfu",
                "how much": "bei gani",
                "where": "wapi",
                "when": "lini",
                "why": "kwa nini",
                "who": "nani",
                "what": "nini",
                "I": "mimi",
                "you": "wewe",
                "he": "yeye",
                "she": "yeye",
                "we": "sisi",
                "they": "wao",
                "to eat": "kula",
                "to drink": "kunywa",
                "to go": "kwenda",
                "to come": "kuja",
                "to see": "kuona",
                "to know": "kujua",
                "to speak": "kuongea",
                "to learn": "kujifunza",
                "to understand": "kuelewa",
                "to write": "kuandika",
                "to read": "kusoma",
                "to give": "kutoa",
                "to take": "kuchukua",
                "to want": "kutaka",
                "to need": "kuhitaji",
                "to like": "kupenda",
                "to do": "kufanya",
                "to make": "kutengeneza",
                "mother": "mama",
                "father": "baba",
                "child": "mtoto",
                "brother": "kaka",
                "sister": "dada",
                "sun": "jua",
                "moon": "mwezi",
                "star": "nyota",
                "rain": "mvua",
                "wind": "upepo",
                "fire": "moto",
                "earth": "ardhi",
                "sky": "anga",
                "tree": "mti",
                "flower": "ua",
                "river": "mto",
                "mountain": "mlima",
                "sea": "bahari",
                "road": "barabara",
                "market": "soko",
                "hospital": "hospitali",
                "church": "kanisa",
                "mosque": "msikiti",
                "book": "kitabu",
                "car": "gari",
                "bicycle": "baiskeli",
                "phone": "simu",
                "computer": "kompyuta",
                "internet": "intaneti",
                "email": "barua pepe",
                "password": "nenosiri",
                "username": "jina la mtumiaji",
                "medicine": "dawa",
                "health": "afya",
                "strength": "nguvu",
                "weakness": "udhaifu",
                "problem": "shida",
                "solution": "suluhisho",
                "question": "swali",
                "answer": "jibu",
                "beginning": "mwanzo",
                "end": "mwisho",
                "today": "leo",
                "tomorrow": "kesho",
                "yesterday": "jana",
                "morning": "asubuhi",
                "afternoon": "mchana",
                "evening": "jioni",
                "night": "usiku",
                "week": "wiki",
                "month": "mwezi",
                "year": "mwaka",
                "now": "sasa",
                "later": "baadaye",
                "before": "kabla",
                "after": "baada",
                "above": "juu",
                "below": "chini",
                "inside": "ndani",
                "outside": "nje",
                "left": "kushoto",
                "right": "kulia",
                "straight": "moja kwa moja",
                "near": "karibu",
                "far": "mbali",
                "open": "fungua",
                "close": "funga",
                "start": "anza",
                "stop": "acha",
                "continue": "endelea",
                "return": "rejea",
                "remember": "kumbuka",
                "forget": "sahau",
                "search": "tafuta",
                "find": "pata",
                "lose": "poteza",
                "win": "shinda",
                "help me": "nisaidie",
                "I understand": "naelewa",
                "I don't understand": "sielewi",
                "I know": "najua",
                "I don't know": "sijui",
                "I want": "nataka",
                "I need": "nahitaji",
                "I like": "napenda",
                "I love": "napenda sana",
                "I have": "nina",
                "I don't have": "sina",
                "I can": "naweza",
                "I cannot": "siwezi",
                "I will": "nitakwenda",
                "I am going": "naenda",
                "I came": "nili kuja",
                "I saw": "nili kuona",
                "I did": "nili fanya",
                "I said": "nili sema",
                "I think": "nadhani",
                "I believe": " naamini",
                "I hope": "natumai",
                "congratulations": "hongera",
                "good luck": "bahati nzuri",
                "be careful": "kuwa makini",
                "hurry up": "haraka",
                "wait": "subiri",
                "come here": "kuja hapa",
                "go there": "enda huko",
                "look": "angalia",
                "listen": "sikiliza",
                "speak": "ongea",
                "be quiet": "nyamaza",
                "it's okay": "sawa",
                "never mind": "wala usijali",
                "of course": "bila shaka",
                "maybe": "labda",
                "definitely": "hakika",
                "hello everyone": "habari zenu",
                "how is everything": "habari za mambo",
                "nice to meet you": "nimefurahi kukutana nawe",
                "see you later": "tutaonana baadaye",
                "have a good day": "kuwa na siku njema",
                "good journey": "safari njema",
                "sleep well": "lala salama",
                "get well soon": "pona haraka",
                "happy birthday": "siku ya kuzaliwa njema",
                "happy new year": "mwaka mpya heri",
                "merry christmas": "krismasi njema",
                "happy easter": "pasaka njema",
                "happy holidays": "sikukuu njema",
                "best wishes": "tunakutakia heri",
                "god bless you": "mungu akubariki",
                "inshallah": "mungu akipenda",
                "slowly": "pole pole",
                "together": "pamoja",
                "alone": "pekee yangu",
                "everyone": "kila mtu",
                "someone": "mtu",
                "nobody": "hakuna mtu",
                "something": "kitu",
                "nothing": "hakuna kitu",
                "everything": "kila kitu",
                "everywhere": "kila mahali",
                "somewhere": "mahali",
                "nowhere": "hakuna mahali",
                "always": "kila mara",
                "never": "kamwe",
                "sometimes": "mara nyingine",
                "often": "mara nyingi",
                "rarely": "mara chache",
                "usually": "kawaida",
                "again": "tena",
                "already": "tayari",
                "still": "bado",
                "yet": "bado",
                "even": "hata",
                "only": "tu",
                "just": "tu",
                "also": "pia",
                "too": "pia",
                "very": "sana",
                "much": "sana",
                "many": "nyingi",
                "more": "zaidi",
                "less": "pungufu",
                "most": "zaidi",
                "least": "kidogo",
                "enough": "kutosha",
                "all": "wote",
                "none": "hakuna",
                "both": "wote wawili",
                "either": "mojawapo",
                "neither": "wala",
                "each": "kila mmoja",
                "every": "kila",
                "other": "mwingine",
                "another": "mwingine",
                "same": "sawa",
                "different": "tofauti",
                "new": "mpya",
                "old": "zamani",
                "young": "kijana",
                "first": "kwanza",
                "last": "mwisho",
                "next": "ijayo",
                "previous": "iliyopita",
                "early": "mapema",
                "late": "chelewa",
                "soon": "hivi karibuni",
                "long": "refu",
                "short": "fupi",
                "high": "juu",
                "low": "chini",
                "fast": "haraka",
                "slow": "pole pole",
                "hot": "joto",
                "cold": "baridi",
                "warm": "joto la wastani",
                "cool": "baridi ya wastani",
                "dry": "kavu",
                "wet": "maji",
                "clean": "safi",
                "dirty": "chafu",
                "empty": "tupu",
                "full": "kujaa",
                "easy": "rahisi",
                "difficult": "ngumu",
                "free": "bure",
                "busy": "shughuli",
                "ready": "tayari",
                "done": "kumaliza",
                "finished": "kumaliza",
                "true": "kweli",
                "false": "uwongo",
                "right": "sahihi",
                "wrong": "kosa",
                "possible": "inawezekana",
                "impossible": "haiwezekani",
                "important": "muhimu",
                "interesting": "kuvutia",
                "boring": "kuchosha",
                "fun": "kufurahia",
                "dangerous": "hatari",
                "safe": "salama",
                "special": "maalum",
                "normal": "kawaida",
                "common": "kawaida",
                "rare": "nadra",
                "popular": "maarufu",
                "famous": "maarufu",
                "perfect": "kamili",
                "terrible": "mbaya",
                "wonderful": "ajabu",
                "amazing": "kushangaza",
                "excellent": "bora",
                "great": "kubwa",
                "nice": "nzuri",
                "pretty": "nzuri",
                "ugly": "chafu",
                "rich": "tajiri",
                "poor": "maskini",
                "expensive": "ghali",
                "cheap": "rahisi",
                "sweet": "tamu",
                "bitter": "chungu",
                "salty": "chumvi",
                "sour": "chachu",
                "spicy": "kali",
                "fresh": "safi",
                "stale": "bovu",
                "hungry": "njaa",
                "thirsty": "kiu",
                "tired": "uchovu",
                "sick": "magonjwa",
                "healthy": "afya",
                "strong": "nguvu",
                "weak": "dhaifu",
                "hard": "ngumu",
                "soft": "laini",
                "heavy": "zito",
                "light": "nyepesi",
                "loud": "kupaza sauti",
                "quiet": "utulivu",
                "bright": "mng'ao",
                "dark": "giza",
                "clear": "wazi",
                "cloudy": "mawingu",
                "colorful": "rangi",
                "black": "nyeusi",
                "white": "nyeupe",
                "red": "nyekundu",
                "blue": "bluu",
                "green": "kijani",
                "yellow": "njano",
                "orange": "chungwa",
                "purple": "zambarau",
                "brown": "kahawia",
                "gray": "kijivu",
                "pink": "waridi",
                "gold": "dhahabu",
                "silver": "fedha",
            },
            "yo": {
                "hello": "báwo ni",
                "good morning": "Ẹ kú àárọ̀",
                "good evening": "Ẹ kú ìrọ̀lẹ́",
                "good night": "ọ̀rọ̀ alẹ",
                "thank you": "ẹ ṣéun",
                "please": "ẹ jọ̀wọ́",
                "sorry": "má bínú",
                "yes": "bẹ́ẹ̀ni",
                "no": "rárá",
                "goodbye": "ọ̀dẹ́",
                "how are you": "báwo ni",
                "I am fine": "dáadáa ni",
                "water": "omi",
                "food": "ounje",
                "friend": "ọ̀rẹ́",
                "love": "ìfẹ́",
                "peace": "àlàáfíà",
                "welcome": "Ẹ kú àbọ̀",
                "mother": "ìyá",
                "father": "bàbá",
                "child": "ọmọ",
                "family": "ẹbí",
                "home": "ilé",
                "school": "ilé-ìwé",
                "work": "iṣẹ́",
                "money": "owo",
                "time": "àsìkò",
                "day": "ọjọ́",
                "good": "rere",
                "bad": "burú",
                "big": "nlá",
                "small": "kékeré",
                "beautiful": "lẹ́wa",
                "happy": "ayọ̀",
                "sad": "báníbẹ",
                "one": "ọ̀kan",
                "two": "méjì",
                "three": "mẹ́ta",
                "four": "mẹ́rin",
                "five": "márùn-ún",
                "to eat": "jẹun",
                "to drink": "mu",
                "to go": "lọ",
                "to come": "wá",
                "to see": "rí",
                "to know": "mọ̀",
                "to speak": "sọ̀rọ̀",
                "to learn": "kẹ́kọ̀ọ́",
                "to understand": "lóye",
                "to write": "kọ",
                "to read": "ka",
            },
            "zu": {
                "hello": "sawubona",
                "good morning": "sawubona",
                "good evening": "ulale kahle",
                "good night": "ulale kahle",
                "thank you": "ngiyabonga",
                "please": "ngiyacela",
                "sorry": "ngiyaxolisa",
                "yes": "yebo",
                "no": "cha",
                "goodbye": "hamba kahle",
                "how are you": "unjani",
                "I am fine": "ngiyaphila",
                "water": "amanzi",
                "food": "ukudla",
                "friend": "umngane",
                "love": "uthando",
                "peace": "ukuthula",
                "welcome": "siyakwamukela",
                "mother": "umama",
                "father": "ubaba",
                "child": "umntwana",
                "family": "umndeni",
                "home": "ikhaya",
                "school": "isikole",
                "work": "umsebenzi",
                "money": "imali",
                "time": "isikhathi",
                "day": "usuku",
                "good": "kahle",
                "bad": "kubi",
                "big": "kakhulu",
                "small": "encane",
                "beautiful": "muhle",
                "happy": "ujabule",
                "sad": "usizi",
                "one": "kunye",
                "two": "kubili",
                "three": "kuthathu",
                "four": "kune",
                "five": "kuhlanu",
                "to eat": "udla",
                "to drink": "uphuza",
                "to go": "uhamba",
                "to come": "uza",
                "to see": "ubona",
                "to know": "wazi",
                "to speak": "ukhuluma",
                "to learn": "ufunda",
                "to understand": "uqonda",
                "to write": "ubhala",
                "to read": "ufunda",
            },
            "am": {
                "hello": "ሰላም",
                "good morning": "እንደሚል አደርክ",
                "good evening": "እንደሚል አመሸህ",
                "good night": "ደህና እደር",
                "thank you": "አመሰግናለሁ",
                "please": "በባዶሽ",
                "sorry": "አዝናለሁ",
                "yes": "አዎ",
                "no": "አይ",
                "goodbye": "ቻው",
                "how are you": "እንዴት ነህ",
                "I am fine": "ደህና ነኝ",
                "water": "ውሃ",
                "food": "ምግብ",
                "friend": "ጓደኛ",
                "love": "ፍቅር",
                "peace": "ሰላም",
                "welcome": "እንኳን ደህና መጣህ",
                "mother": "እናት",
                "father": "አባት",
                "child": "ልጅ",
                "family": "ቤተሰብ",
                "home": "ቤት",
                "school": "ትምህርት ቤት",
                "work": "ስራ",
                "money": "ገንዘብ",
                "time": "ሰዓት",
                "day": "ቀን",
                "good": "ጥሩ",
                "bad": "መጥፎ",
                "big": "ትልቅ",
                "small": "ትንሽ",
                "beautiful": "ቆንጆ",
                "happy": "ደስተኛ",
                "sad": "የከፋ",
                "one": "አንድ",
                "two": "ሁለት",
                "three": "ሶስት",
                "four": "አራት",
                "five": "አምስት",
                "to eat": "መብላት",
                "to drink": "መጠጣት",
                "to go": "መሄድ",
                "to come": "መምጣት",
                "to see": "ማየት",
                "to know": "ማወቅ",
                "to speak": "መናገር",
                "to learn": "መማር",
                "to understand": "መረዳት",
                "to write": "መጻፍ",
                "to read": "ማንበብ",
            },
            "ha": {
                "hello": "sannu",
                "good morning": "barka da safe",
                "good evening": "barka da yamma",
                "good night": "barka da dare",
                "thank you": "na gode",
                "please": "don Allah",
                "sorry": "yi hankuri",
                "yes": "eh",
                "no": "a'a",
                "goodbye": "sai an jima",
                "how are you": "yaaya kake",
                "I am fine": "lafiya",
                "water": "ruwa",
                "food": "abinci",
                "friend": "aboki",
                "love": "so",
                "peace": "lafiya",
                "welcome": "barka da zuwa",
                "mother": "uwa",
                "father": "uba",
                "child": "yaro",
                "family": "iyali",
                "home": "gida",
                "school": "makaranta",
                "work": "aiki",
                "money": "kudi",
                "time": "lokaci",
                "day": "rana",
                "good": "mai kyau",
                "bad": "mugun",
                "big": "babba",
                "small": "karami",
                "beautiful": "kyakkyawa",
                "happy": "murna",
                "sad": "baƙin ciki",
                "one": "daya",
                "two": "biyu",
                "three": "uku",
                "four": "hudu",
                "five": "biyar",
                "to eat": "ci",
                "to drink": "sha",
                "to go": "tafi",
                "to come": "zo",
                "to see": "gani",
                "to know": "sani",
                "to speak": "magana",
                "to learn": "koyo",
                "to understand": "fahimta",
                "to write": "rubutu",
                "to read": "karatu",
            },
            "ig": {
                "hello": "nnọọ",
                "good morning": "ụtụtụ ọma",
                "good evening": "mgbede ọma",
                "good night": "ka chi fọọ",
                "thank you": "daalụ",
                "please": "biko",
                "sorry": "ndo",
                "yes": "eh",
                "no": "mba",
                "goodbye": "ka ọ dị",
                "how are you": "kedu",
                "I am fine": "ọ dị mma",
                "water": "mmiri",
                "food": "nri",
                "friend": "enyi",
                "love": "ịhụnanya",
                "peace": "udo",
                "welcome": "nnọọ",
                "mother": "nne",
                "father": "nna",
                "child": "nwa",
                "family": "ezinụlọ",
                "home": "ụlọ",
                "school": "ụlọ akwụkwọ",
                "work": "ọrụ",
                "money": "ego",
                "time": "oge",
                "day": "ụbọchị",
                "good": "ọma",
                "bad": "njọ",
                "big": "nnukwu",
                "small": "obere",
                "beautiful": "ọmaranma",
                "happy": "ọṅụ",
                "sad": "iwute",
                "one": "otu",
                "two": "abụọ",
                "three": "atọ",
                "four": "anọ",
                "five": "ise",
                "to eat": "iri",
                "to drink": "ịṅụ",
                "to go": "ịga",
                "to come": "ịbịa",
                "to see": "ihu",
                "to know": "ịma",
                "to speak": "ikwu",
                "to learn": "ịmụta",
                "to understand": "ịghọta",
                "to write": "idede",
                "to read": "agụ",
            },
            "so": {
                "hello": "salaan",
                "good morning": "subax wanaagsan",
                "good evening": "fiid wanaagsan",
                "good night": "habeen wanaagsan",
                "thank you": "mahadsanid",
                "please": "fadlan",
                "sorry": "waan ka xumahay",
                "yes": "haa",
                "no": "maya",
                "goodbye": "nabad gelyo",
                "how are you": "sidee tahay",
                "I am fine": "waan fiicanahay",
                "water": "biyo",
                "food": "cunto",
                "friend": "saaxiib",
                "love": "jacayl",
                "peace": "nabad",
                "welcome": "soo dhawow",
                "mother": "hooyo",
                "father": "aabe",
                "child": "ilmo",
                "family": "qoys",
                "home": "guriga",
                "school": "dugsiga",
                "work": "shaqo",
                "money": "lacag",
                "time": "waqtiga",
                "day": "maalin",
                "good": "wanaagsan",
                "bad": "xun",
                "big": "weyn",
                "small": "yar",
                "beautiful": " qurux",
                "happy": "farxad",
                "sad": "murrugad",
                "one": "kow",
                "two": "laba",
                "three": "saddex",
                "four": "afar",
                "five": "shan",
                "to eat": "cun",
                "to drink": "cab",
                "to go": "tag",
                "to come": "kaalay",
                "to see": "arkay",
                "to know": "ogahay",
                "to speak": "hadal",
                "to learn": "baro",
                "to understand": "fahmo",
                "to write": "qor",
                "to read": "akhri",
            }
        }
    
    def _initialize_greetings(self) -> Dict[str, List[GreetingPhrase]]:
        """Initialize greetings database"""
        return {
            "sw": [
                GreetingPhrase("sw", "Habari", "Hello/News", "General greeting", "ha-BA-ri"),
                GreetingPhrase("sw", "Jambo", "Hello", "Tourist greeting", "JAM-bo"),
                GreetingPhrase("sw", "Mambo", "Hey (informal)", "Casual greeting among youth", "MAM-bo"),
                GreetingPhrase("sw", "Habari za asubuhi", "Good morning", "Morning greeting", "ha-BA-ri za a-SU-bu-hi"),
                GreetingPhrase("sw", "Habari za mchana", "Good afternoon", "Afternoon greeting", "ha-BA-ri za m-CHA-na"),
                GreetingPhrase("sw", "Habari za jioni", "Good evening", "Evening greeting", "ha-BA-ri zi JI-o-ni"),
                GreetingPhrase("sw", "Usiku mwema", "Good night", "Night greeting", "u-SI-ku MWE-ma"),
                GreetingPhrase("sw", "Asante", "Thank you", "Expression of gratitude", "a-SAN-te"),
                GreetingPhrase("sw", "Asante sana", "Thank you very much", "Strong gratitude", "a-SAN-te SA-na"),
                GreetingPhrase("sw", "Karibu", "Welcome", "Welcoming someone", "ka-RI-bu"),
                GreetingPhrase("sw", "Sijambo", "I am fine (response to Jambo)", "Response to greeting", "si-JAM-bo"),
                GreetingPhrase("sw", "Shikamoo", "I hold your feet (respectful)", "Respectful greeting to elders", "shi-ka-MOO"),
                GreetingPhrase("sw", "Marahaba", "Response to Shikamoo", "Elder's response", "ma-ra-HA-ba"),
            ],
            "yo": [
                GreetingPhrase("yo", "Báwo ni", "How are you", "General greeting", "BA-wo ni"),
                GreetingPhrase("yo", "Ẹ kú àárọ̀", "Good morning", "Morning greeting", "eh koo aah-ROH"),
                GreetingPhrase("yo", "Ẹ kú ọ̀sán", "Good afternoon", "Afternoon greeting", "eh koo oh-SAN"),
                GreetingPhrase("yo", "Ẹ kú ìrọ̀lẹ́", "Good evening", "Evening greeting", "eh koo ee-ROH-leh"),
                GreetingPhrase("yo", "Ẹ ṣéun", "Thank you", "Expression of gratitude", "eh SHEH-oon"),
                GreetingPhrase("yo", "Ẹ kú àbọ̀", "Welcome", "Welcoming someone", "eh koo ah-BOH"),
                GreetingPhrase("yo", "Kí ni orúkọ rẹ?", "What is your name?", "Asking someone's name", "kee nee oh-ROO-koh reh"),
                GreetingPhrase("yo", "Orúkọ mi ni...", "My name is...", "Introducing yourself", "oh-ROO-koh mee nee"),
                GreetingPhrase("yo", "Ó dàbọ̀", "Goodbye", "Farewell", "oh DAH-boh"),
                GreetingPhrase("yo", "Ẹ jọ̀wọ́", "Please", "Polite request", "eh joh-WOH"),
                GreetingPhrase("yo", "Má bínú", "Sorry", "Apology", "mah BEE-noo"),
                GreetingPhrase("yo", "Bẹ́ẹ̀ni", "Yes", "Affirmation", "beh-EH-nee"),
                GreetingPhrase("yo", "Rárá", "No", "Negation", "RAH-rah"),
            ],
            "zu": [
                GreetingPhrase("zu", "Sawubona", "Hello (to one person)", "General greeting", "sah-woo-BOH-nah"),
                GreetingPhrase("zu", "Sanibonani", "Hello (to multiple people)", "Plural greeting", "sah-nee-boh-NAH-nee"),
                GreetingPhrase("zu", "Unjani", "How are you", "Asking how someone is", "oon-JAH-nee"),
                GreetingPhrase("zu", "Ngiyaphila", "I am fine", "Response to greeting", "ngee-yah-PEE-lah"),
                GreetingPhrase("zu", "Ngiyabonga", "Thank you", "Expression of gratitude", "ngee-yah-BONG-gah"),
                GreetingPhrase("zu", "Ngiyabonga kakhulu", "Thank you very much", "Strong gratitude", "ngee-yah-BONG-gah kah-KOO-loo"),
                GreetingPhrase("zu", "Uhambe kahle", "Go well (goodbye)", "Farewell to person leaving", "oo-HAM-beh KAH-leh"),
                GreetingPhrase("zu", "Ulale kahle", "Sleep well", "Night greeting", "oo-LAH-leh KAH-leh"),
                GreetingPhrase("zu", "Siyakwamukela", "Welcome", "Welcoming someone", "see-yah-kwah-moo-KEH-lah"),
                GreetingPhrase("zu", "Yebo", "Yes", "Affirmation", "YEH-boh"),
                GreetingPhrase("zu", "Cha", "No", "Negation", "CHAH"),
                GreetingPhrase("zu", "Uxolo", "Sorry/Excuse me", "Apology", "oo-XOH-loh"),
                GreetingPhrase("zu", "Ngiyacela", "Please", "Polite request", "ngee-yah-TCHEH-lah"),
            ],
            "am": [
                GreetingPhrase("am", "ሰላም (Salam)", "Hello/Peace", "General greeting", "sah-LAM"),
                GreetingPhrase("am", "እንደሚል አደርክ (Indemin aderk)", "Good morning", "Morning greeting", "in-deh-meen ah-DERK"),
                GreetingPhrase("am", "እንደሚል አመሸህ (Indemin amesheh)", "Good evening", "Evening greeting", "in-deh-meen ah-meh-SHEH"),
                GreetingPhrase("am", "ደህና እደር (Dehna ider)", "Good night", "Night greeting", "deh-NAH ee-DER"),
                GreetingPhrase("am", "አመሰግናለሁ (Ameseginalehu)", "Thank you", "Expression of gratitude", "ah-meh-seh-gee-nah-leh-HOO"),
                GreetingPhrase("am", "እንኳን ደህና መጣህ (Enkwan dehna metah)", "Welcome", "Welcoming someone", "in-KWAHN deh-NAH meh-TAH"),
                GreetingPhrase("am", "ሰላም ነው (Salam new)", "It is peace (response)", "Response to greeting", "sah-LAM noo"),
                GreetingPhrase("am", "አዎ (Awo)", "Yes", "Affirmation", "ah-WOH"),
                GreetingPhrase("am", "አይ (Ay)", "No", "Negation", "ah-YEE"),
                GreetingPhrase("am", "ቻው (Chaw)", "Goodbye", "Farewell", "CHOW"),
                GreetingPhrase("am", "እንጃ (Enja)", "Please", "Polite request", "in-JAH"),
                GreetingPhrase("am", "አዝናለሁ (Aznalehu)", "Sorry", "Apology", "ahz-nah-leh-HOO"),
                GreetingPhrase("am", "እንዴት ነህ (Endet neh)", "How are you (masc.)", "Asking how someone is", "in-deht NEH"),
                GreetingPhrase("am", "እንዴት ነሽ (Endet nesh)", "How are you (fem.)", "Asking how someone is", "in-deht NESH"),
            ],
            "ha": [
                GreetingPhrase("ha", "Sannu", "Hello", "General greeting", "SAN-noo"),
                GreetingPhrase("ha", "Barka da safe", "Good morning", "Morning greeting", "BAR-kah dah SAH-feh"),
                GreetingPhrase("ha", "Barka da rana", "Good afternoon", "Afternoon greeting", "BAR-kah dah RAH-nah"),
                GreetingPhrase("ha", "Barka da yamma", "Good evening", "Evening greeting", "BAR-kah dah YAM-mah"),
                GreetingPhrase("ha", "Barka da dare", "Good night", "Night greeting", "BAR-kah dah DAH-reh"),
                GreetingPhrase("ha", "Na gode", "Thank you", "Expression of gratitude", "nah GOH-deh"),
                GreetingPhrase("ha", "Na gode sosai", "Thank you very much", "Strong gratitude", "nah GOH-deh soh-SAI"),
                GreetingPhrase("ha", "Sai an jima", "Goodbye", "Farewell", "sai an JEE-mah"),
                GreetingPhrase("ha", "Barka da zuwa", "Welcome", "Welcoming someone", "BAR-kah dah ZOO-wah"),
                GreetingPhrase("ha", "Don Allah", "Please", "Polite request", "dohn ah-LAH"),
                GreetingPhrase("ha", "Yi hankuri", "Sorry", "Apology", "yee han-KOO-ree"),
                GreetingPhrase("ha", "Eh", "Yes", "Affirmation", "EH"),
                GreetingPhrase("ha", "A'a", "No", "Negation", "ah-AH"),
                GreetingPhrase("ha", "Ina kwana?", "How was your night?", "Morning greeting", "EE-nah KWAH-nah"),
                GreetingPhrase("ha", "Lafiya lau", "Fine (response)", "Response to greeting", "lah-FEE-yah LOW"),
            ],
            "ig": [
                GreetingPhrase("ig", "Nnọọ", "Welcome/Hello", "General greeting", "n-NOOR"),
                GreetingPhrase("ig", "Ụtụtụ ọma", "Good morning", "Morning greeting", "oo-TOO-too OH-mah"),
                GreetingPhrase("ig", "Ehihie ọma", "Good afternoon", "Afternoon greeting", "eh-HEE-hee-eh OH-mah"),
                GreetingPhrase("ig", "Mgbede ọma", "Good evening", "Evening greeting", "m-GEH-deh OH-mah"),
                GreetingPhrase("ig", "Ka chi fọọ", "Good night", "Night greeting", "kah chee FOH-oh"),
                GreetingPhrase("ig", "Daalụ", "Thank you", "Expression of gratitude", "DAH-ah-loo"),
                GreetingPhrase("ig", "Daalụ nke ukwuu", "Thank you very much", "Strong gratitude", "DAH-ah-loo nkeh oo-KWOO"),
                GreetingPhrase("ig", "Ka ọ dị", "Goodbye", "Farewell", "kah oh DEE"),
                GreetingPhrase("ig", "Biko", "Please", "Polite request", "BEE-koh"),
                GreetingPhrase("ig", "Ndo", "Sorry", "Apology", "n-DOH"),
                GreetingPhrase("ig", "Eh", "Yes", "Affirmation", "EH"),
                GreetingPhrase("ig", "Mba", "No", "Negation", "M-bah"),
                GreetingPhrase("ig", "Kedu", "How are you", "Asking how someone is", "keh-DOO"),
                GreetingPhrase("ig", "Ọ dị mma", "I am fine", "Response to greeting", "oh DEE mmah"),
                GreetingPhrase("ig", "Kedu aha gị?", "What is your name?", "Asking someone's name", "keh-DOO ah-hah gee"),
            ],
            "so": [
                GreetingPhrase("so", "Salaan", "Hello", "General greeting", "sah-LAHN"),
                GreetingPhrase("so", "Subax wanaagsan", "Good morning", "Morning greeting", "soo-BAHX wah-NAH-sahn"),
                GreetingPhrase("so", "Fiid wanaagsan", "Good evening", "Evening greeting", "feed wah-NAH-sahn"),
                GreetingPhrase("so", "Habeen wanaagsan", "Good night", "Night greeting", "hah-BEYN wah-NAH-sahn"),
                GreetingPhrase("so", "Mahadsanid", "Thank you", "Expression of gratitude", "mah-had-SAH-nid"),
                GreetingPhrase("so", "Mahadsanid badan", "Thank you very much", "Strong gratitude", "mah-had-SAH-nid bah-DAHN"),
                GreetingPhrase("so", "Nabad gelyo", "Goodbye", "Farewell", "nah-BAHD gel-YOH"),
                GreetingPhrase("so", "Soo dhawow", "Welcome", "Welcoming someone", "soh dah-WOH"),
                GreetingPhrase("so", "Fadlan", "Please", "Polite request", "FAHD-lahn"),
                GreetingPhrase("so", "Waan ka xumahay", "Sorry", "Apology", "wahn kah hoo-mah-HAI"),
                GreetingPhrase("so", "Haa", "Yes", "Affirmation", "HAH"),
                GreetingPhrase("so", "Maya", "No", "Negation", "MAH-yah"),
                GreetingPhrase("so", "Sidee tahay?", "How are you?", "Asking how someone is", "see-DEH tah-HAI"),
                GreetingPhrase("so", "Waan fiicanahay", "I am fine", "Response to greeting", "wahn fee-cah-nah-HAI"),
                GreetingPhrase("so", "Magacaa?", "What is your name?", "Asking someone's name", "mah-gah-CHAH"),
            ],
        }
    
    def _initialize_proverbs(self) -> Dict[str, List[Dict]]:
        """Initialize proverbs database"""
        return {
            "sw": [
                {"proverb": "Haraka haraka haina baraka", "meaning": "Hurry hurry has no blessings - patience is important"},
                {"proverb": "Samaki mkunje angali mbichi", "meaning": "Bend the fish while it's still fresh - address problems early"},
                {"proverb": "Asiyefunzwa na mamaye, hufunzwa na ulimwengu", "meaning": "One not taught by their mother will be taught by the world"},
                {"proverb": "Umoja ni nguvu, utengano ni udhaifu", "meaning": "Unity is strength, division is weakness"},
                {"proverb": "Mchagua jembe si mkulima", "meaning": "One who chooses a hoe is not a farmer - actions define you"},
                {"proverb": "Kidole kimoja hakivunji chawa", "meaning": "One finger cannot crush a louse - cooperation is necessary"},
                {"proverb": "Mti hauendi ila kwa nyenzo", "meaning": "A tree does not move except with an axe - change requires action"},
                {"proverb": "Njia ya mwongo ni fupi", "meaning": "The path of a liar is short - truth prevails"},
                {"proverb": "Mchumia juani, hulia kivulini", "meaning": "One who works in the sun eats in the shade - hard work pays off"},
                {"proverb": "Penye nia ipo njia", "meaning": "Where there is a will, there is a way"},
            ],
            "yo": [
                {"proverb": "Bi a ba ńṣòro lójú àgbà, kò tó bí a ṣe ńsọ̀rọ̀ lẹ́nu", "meaning": "A matter discussed in front of elders is not as important as one whispered"},
                {"proverb": "Àgbà kì í wo ìwòye, ọ̀rọ̀ ló ń wo", "meaning": "An elder doesn't look at appearance but at words"},
                {"proverb": "Ìwà rere lẹ̀ṣẹ̀ òtítọ́", "meaning": "Good character is the foundation of truth"},
                {"proverb": "A kì í rí ẹranko kí ó má lójú ọmọ rẹ̀", "meaning": "No animal is without love for its young"},
                {"proverb": "Ọ̀rọ̀ ọmọdé kì í jẹ́ kí àgbà yẹ kíntà", "meaning": "A child's words shouldn't make an elder undress"},
                {"proverb": "Bí a bá ńṣòro fúnni, a ńṣòro fún ara wa", "meaning": "When we work for others, we work for ourselves"},
                {"proverb": "Òwe lẹṣin òwe, òwe lẹṣin òwe, bí òwe bá jẹ ẹni, á jẹ ẹni lópò", "meaning": "Proverbs are the horse of words - when a proverb fails, words fail"},
                {"proverb": "Àgbà jẹ́kí a máa ronú", "meaning": "An elder makes us think"},
                {"proverb": "Ibi tí àgbà bá lọ, kì í fi ọ̀rọ̀ sílẹ̀", "meaning": "Wherever an elder goes, words are not left behind"},
                {"proverb": "Kí ni kò lè pa kìkìrì kí ó tó pa àgbà?", "meaning": "What cannot wait until it kills an elder? - Patience in youth"},
            ],
            "zu": [
                {"proverb": "Inyoka ayikhalisi igama layo, kodwa iyakhalisa isenzo sayo", "meaning": "A snake doesn't announce its name but announces its actions"},
                {"proverb": "Akukho ntwana engenazihlobo", "meaning": "There is no beast without relatives - everyone belongs somewhere"},
                {"proverb": "Umuntu ngumuntu ngabantu", "meaning": "A person is a person through other people - Ubuntu philosophy"},
                {"proverb": "Akulahlwa mbeleko ngakufelwa", "meaning": "One does not throw away the baby carrier because of mourning"},
                {"proverb": "Inkunzi isebunzini bayo", "meaning": "The bull is known by its lair - actions define character"},
                {"proverb": "Isiqalo esinzima siphelela emandleni", "meaning": "A difficult beginning ends in strength"},
                {"proverb": "Akukho ntamo ingaphezu komgwaqo", "meaning": "No neck is above the road - everyone is equal"},
                {"proverb": "Ubuhle bendoda zinkomo zayo", "meaning": "The beauty of a man is his cattle - character matters most"},
                {"proverb": "Umntwana ongenaphi akalwi", "meaning": "A child who doesn't go anywhere doesn't fight - experience brings challenges"},
                {"proverb": "Iqhwa liyanyakaza layoze lashisa", "meaning": "Frost trembles but will eventually warm up - nothing lasts forever"},
            ],
            "am": [
                {"proverb": "ሰው በሰው ያለፈ ነው", "meaning": "A person passes through a person - we need each other"},
                {"proverb": "የጋራ ቤት ሲፈርስ ሁሉም ያለቅሳል", "meaning": "When a shared house collapses, everyone cries - shared responsibility"},
                {"proverb": "በልጅነት የተማረ ሰው በመካከለኛ ዕድሜ ያንፀባርቃል", "meaning": "One who learns in youth shines in middle age"},
                {"proverb": "የበላይ ምክር ለበላይ አይጠቅምም", "meaning": "The advice of the superior doesn't help the superior - even leaders need guidance"},
                {"proverb": "ሰው በሰው ያለፈ ነው", "meaning": "A person is refined by another person"},
                {"proverb": "ፍቅር ያለ ሰላም የለም", "meaning": "There is no peace without love"},
                {"proverb": "ጥበብ ከትህትና የሚጀምር ነው", "meaning": "Wisdom begins with humility"},
                {"proverb": "የጋራ ችግር የጋራ መፍትሄ ይፈልጋል", "meaning": "A shared problem requires a shared solution"},
                {"proverb": "የሰው ልጅ በትዕግስት ያሸንፋል", "meaning": "Human being conquers through patience"},
                {"proverb": "አንድ ለሁሉ ሁሉ ለአንድ", "meaning": "One for all, all for one"},
            ],
            "ha": [
                {"proverb": "Karamin sani, abin duniya ne", "meaning": "Little knowledge is a worldly thing - humility in learning"},
                {"proverb": "Wanda ya san kansa, ya san ubangijinsa", "meaning": "He who knows himself knows his Lord"},
                {"proverb": "Ba zinarii ba ne, amma kishiya ce", "meaning": "It's not gold but it shines - inner value matters"},
                {"proverb": "Kyan gida, kyan gida; wuri ba wuri ba", "meaning": "Home beauty is not about location but character"},
                {"proverb": "Wanda ya tashi da safe, ya ci gaba da rana", "meaning": "He who rises early moves with the day"},
                {"proverb": "Idan ka san wuri, ka san mutum", "meaning": "If you know the place, you know the person - environment shapes character"},
                {"proverb": "Kada ka yi addu'a tare da hannayenka a cikin aljihu", "meaning": "Don't pray with hands in pockets - work hard too"},
                {"proverb": "Kowa da gonar sa", "meaning": "Everyone has their own farm - individual responsibility"},
                {"proverb": "Karamin yaro ba ya san tsoron gajeren dare", "meaning": "A small child doesn't know the fear of a short night - youth is fearless"},
                {"proverb": "Rakumi baya da muhimmanci a gaban kura", "meaning": "A camel has no value before a hyena - context matters"},
            ],
        }
    
    def _initialize_cultural_contexts(self) -> Dict[str, Dict[str, Any]]:
        """Initialize cultural contexts"""
        return {
            "sw": {
                "greeting_importance": "Greetings are very important in Swahili culture. Taking time to greet someone properly is a sign of respect. Rushing through a greeting is considered rude.",
                "hospitality": "Swahili culture places great emphasis on hospitality. Guests are treated with utmost respect and offered food and drink.",
                "community": "Community and togetherness (ujamaa) are central values. Decisions are often made collectively.",
                "respect_for_elders": "Elders are highly respected. The greeting 'Shikamoo' involves a younger person holding an elder's hands as a sign of respect.",
                "islamic_influence": "Many Swahili-speaking regions have Islamic influences, which affects greetings, customs, and daily practices.",
                "communication_style": "Indirect communication is preferred. Direct confrontation is avoided. 'Hapana' (no) is rarely used directly.",
                "time_concept": "Time is viewed flexibly. 'Swahili time' often runs later than Western schedules. Relationships matter more than punctuality.",
                "taboos": [
                    "Using left hand for greetings or eating",
                    "Pointing with feet",
                    "Showing soles of feet",
                    "Rushing through greetings",
                    "Direct refusal"
                ],
                "common_phrases_context": {
                    "Pole pole": "Slowly/Gradually - reflects the unhurried pace of life",
                    "Hakuna matata": "No worries - a philosophy of taking things in stride",
                    "Karibu": "Welcome - reflects the hospitality culture",
                    "Mambo": "Informal greeting among youth, shows friendliness"
                }
            },
            "yo": {
                "greeting_importance": "Greetings in Yoruba culture are elaborate and indicate respect. The time of day determines the specific greeting used.",
                "respect_for_elders": "Prostrating (dobale) for elders is a significant sign of respect. Younger people greet elders first.",
                "hospitality": "Yoruba people are known for their hospitality. Offering food to guests is essential.",
                "community": "Extended family and community bonds are very strong. The concept of 'Omoluabi' (person of good character) is highly valued.",
                "religion": "Traditional Yoruba religion (Ifa/Orisa) coexists with Christianity and Islam. Religious tolerance is common.",
                "communication_style": "Proverbs and indirect speech are highly valued. Direct confrontation is considered rude.",
                "names": "Names have deep meanings and often reflect circumstances of birth, family history, or prayers.",
                "taboos": [
                    "Using left hand to give or receive",
                    "Whistling at night",
                    "Sweeping at night",
                    "Disrespecting elders",
                    "Breaking kola nut improperly"
                ],
                "common_phrases_context": {
                    "Ẹ kú àárọ̀": "Good morning - literally 'greetings of the morning'",
                    "Ẹ ṣéun": "Thank you - essential for maintaining good relationships",
                    "Ẹ kú àbọ̀": "Welcome - reflects hospitality",
                    "Nnoọ": "Welcome - used to greet arriving guests"
                }
            },
            "zu": {
                "ubuntu": "Ubuntu ('I am because we are') is a central philosophy emphasizing community and interconnectedness.",
                "greeting_importance": "Greetings are essential. 'Sawubona' means 'I see you' - acknowledging someone's existence.",
                "respect_for_elders": "Elders are deeply respected. Younger people offer their seat to elders.",
                "hospitality": "Guests are treated with great respect. Refusing offered food can be seen as disrespectful.",
                "community": "Community decisions involve consultation. The 'imbizo' (community meeting) is important.",
                "ancestors": "Ancestors play a significant role in daily life. They are consulted and honored regularly.",
                "communication_style": "Respectful and indirect. Using honorifics is important when addressing elders.",
                "taboos": [
                    "Pointing at someone with a finger",
                    "Crossing arms when greeting",
                    "Looking away during greeting",
                    "Using someone's first name without permission",
                    "Entering a home without greeting"
                ],
                "common_phrases_context": {
                    "Sawubona": "I see you - acknowledges the humanity of the other person",
                    "Ubuntu": "I am because we are - core philosophy of interconnectedness",
                    "Ngiyabonga": "Thank you - gratitude is very important",
                    "Uhambe kahle": "Go well - wishing someone well on their journey"
                }
            },
            "am": {
                "coffee_ceremony": "The Ethiopian coffee ceremony (buna) is a central social ritual that can take hours. It symbolizes friendship and respect.",
                "greeting_importance": "Greetings involve multiple questions about health, family, and work. Quick greetings are considered impolite.",
                "respect_for_elders": "Elders are highly respected. Young people stand when elders enter a room. Kissing cheeks (three times) is common.",
                "hospitality": "Ethiopians are famous for hospitality. Refusing food or drink can be offensive. Sharing from a common plate (injera) is traditional.",
                "community": "Community bonds are strong. The concept of 'Edir' (community mutual help association) is important.",
                "time": "Ethiopia has its own calendar (7-8 years behind Gregorian) and clock system (12-hour cycle starting at dawn).",
                "communication_style": "Indirect and polite. Saying 'no' directly is avoided. Silence can indicate disagreement.",
                "taboos": [
                    "Using left hand for eating or greeting",
                    "Eating with fingers improperly",
                    "Refusing offered food",
                    "Standing taller than an elder while greeting",
                    "Public displays of anger"
                ],
                "common_phrases_context": {
                    "Salam": "Peace - both greeting and blessing",
                    "Tena yistilign": "May God give you health for me",
                    "Ameseginalehu": "I thank you - gratitude is essential",
                    "Enkwan dehna metah": "Welcome - reflects deep hospitality"
                }
            },
            "ha": {
                "greeting_importance": "Greetings are elaborate and follow a specific order. Asking about family, work, and health is essential.",
                "respect_for_elders": "Elders are highly respected. Younger people bow slightly when greeting elders.",
                "hospitality": "Hausa culture values hospitality highly. Guests are offered food and comfortable seating.",
                "community": "Community bonds are strong. Extended family (gida) provides support and identity.",
                "islamic_influence": "Islam heavily influences Hausa culture, including greetings, dress, and daily practices.",
                "communication_style": "Indirect and respectful. Proverbs are commonly used to convey wisdom.",
                "dress": "Modest dress is important, especially for women. The 'hijab' and 'abaya' are common.",
                "taboos": [
                    "Using left hand for eating or greeting",
                    "Disrespecting elders",
                    "Public displays of affection",
                    "Eating while walking in public",
                    "Refusing offered food"
                ],
                "common_phrases_context": {
                    "Sannu": "Hello - can be lengthened for more respect",
                    "Barka da safe": "Blessings of the morning - Islamic greeting",
                    "Na gode": "I thank you - gratitude is essential",
                    "Don Allah": "Please (by God) - polite request"
                }
            },
        }
    
    def get_language_info(self, language_code: str) -> Optional[Dict[str, Any]]:
        """Get information about a language"""
        info = self.languages_info.get(language_code)
        return info.to_dict() if info else None
    
    def translate(self, text: str, target_language: str, source_language: str = "en") -> TranslationResult:
        """Translate text to target African language"""
        text_lower = text.lower().strip()
        
        # Get the translation dictionary
        trans_dict = self.translation_dicts.get(target_language, {})
        
        # Try exact match first
        translated = trans_dict.get(text_lower)
        confidence = 1.0
        
        if not translated:
            # Try partial match
            for key, value in trans_dict.items():
                if key in text_lower or text_lower in key:
                    translated = value
                    confidence = 0.7
                    break
        
        if not translated:
            translated = f"[{text}] (translation not available in {target_language})"
            confidence = 0.0
        
        language_names = {
            "sw": "Swahili", "yo": "Yoruba", "zu": "Zulu", "am": "Amharic",
            "ha": "Hausa", "ig": "Igbo", "so": "Somali", "xh": "Xhosa",
            "af": "Afrikaans", "rw": "Kinyarwanda", "sn": "Shona",
            "ln": "Lingala", "om": "Oromo", "ti": "Tigrinya",
            "ff": "Fula", "st": "Sesotho", "tn": "Tswana",
            "wo": "Wolof", "bm": "Bambara", "ak": "Akan",
            "mg": "Malagasy", "ny": "Chichewa"
        }
        
        return TranslationResult(
            original=text,
            translated=translated,
            source_language=source_language,
            target_language=language_names.get(target_language, target_language),
            confidence=confidence,
            alternatives=[],
            cultural_note=self._get_cultural_note(target_language, text_lower)
        )
    
    def _get_cultural_note(self, language_code: str, text: str) -> str:
        """Get a cultural note for a translation"""
        notes = {
            "sw": {
                "thank you": "In Swahili culture, expressing gratitude (asante) is very important. 'Asante sana' adds emphasis.",
                "hello": "Swahili has many greetings depending on time of day and formality level.",
                "please": "'Tafadhali' is essential for polite requests in Swahili-speaking regions.",
                "sorry": "Apologizing ('samahani') is important for maintaining harmonious relationships."
            },
            "yo": {
                "thank you": "Gratitude is expressed with 'ẹ ṣéun'. For elders, add 'ma' or 'sir' for extra respect.",
                "hello": "Yoruba greetings vary by time of day and the age/status of the person being greeted.",
                "please": "'Ẹ jọ̀wọ́' is used for polite requests. Tone of voice is very important in Yoruba."
            },
            "zu": {
                "thank you": "'Ngiyabonga' is used. The strength of gratitude can be emphasized with 'kakhulu'.",
                "hello": "Sawubona literally means 'I see you' - acknowledging the person's humanity."
            },
            "am": {
                "thank you": "'Ameseginalehu' is formal. Among friends, 'Tanks' is sometimes used colloquially.",
                "hello": "'Salam' (peace) reflects both the greeting and the cultural value of peace."
            },
            "ha": {
                "thank you": "'Na gode' is essential. Adding 'sosai' (very much) strengthens the expression.",
                "hello": "Islamic greetings like 'As-salamu alaykum' are also commonly used."
            }
        }
        
        lang_notes = notes.get(language_code, {})
        return lang_notes.get(text, "")
    
    def translate_batch(self, texts: List[str], target_language: str, 
                       source_language: str = "en") -> List[TranslationResult]:
        """Translate multiple texts"""
        return [self.translate(text, target_language, source_language) for text in texts]
    
    def get_greetings(self, language_code: str) -> List[Dict[str, Any]]:
        """Get common greetings for a language"""
        greetings = self.greetings_db.get(language_code, [])
        return [g.to_dict() for g in greetings]
    
    def get_greeting_by_context(self, language_code: str, context: str) -> List[Dict[str, Any]]:
        """Get greetings filtered by context"""
        all_greetings = self.greetings_db.get(language_code, [])
        filtered = [g for g in all_greetings if context.lower() in g.context.lower()]
        return [g.to_dict() for g in filtered]
    
    def get_random_proverb(self, language_code: str) -> Dict[str, str]:
        """Get a random proverb"""
        proverbs = self.proverbs_db.get(language_code, [])
        if proverbs:
            import random
            return random.choice(proverbs)
        return {"proverb": "", "meaning": "No proverbs available for this language"}
    
    def get_proverbs(self, language_code: str, count: int = 5) -> List[Dict[str, str]]:
        """Get proverbs for a language"""
        proverbs = self.proverbs_db.get(language_code, [])
        return proverbs[:count] if proverbs else []
    
    def get_cultural_context(self, language_code: str) -> Dict[str, Any]:
        """Get cultural context for a language"""
        return self.cultural_contexts.get(language_code, {})
    
    def get_supported_languages(self) -> List[Dict[str, Any]]:
        """Get list of all supported languages"""
        return [{
            "code": code,
            **info.to_dict()
        } for code, info in self.languages_info.items()]
    
    def detect_language(self, text: str) -> Dict[str, Any]:
        """Simple language detection based on common patterns"""
        text_lower = text.lower()
        
        # Language markers (common words)
        markers = {
            "sw": ["habari", "asante", "karibu", "jambo", "ndiyo", "hapana", "tafadhali", "mzuri", "sana", "na"],
            "yo": ["ẹ ṣéun", "báwo ni", "nǹkan", "ọ̀rọ̀", "jọ̀wọ́", "bẹ́ẹ̀ni", "rárá", "ọmọ", "ìyá", "bàbá"],
            "zu": ["sawubona", "ngiyabonga", "yebo", "cha", "unjani", "hamba kahle", "siyakwamukela", "mngane"],
            "am": ["ሰላም", "አመሰግናለሁ", "እንኳን ደህና መጣህ", "አዎ", "አይ", "ቻው", "እንደሚል አደርክ"],
            "ha": ["sannu", "na gode", "barka da safe", "eh", "a'a", "lafiya", "aboki", "sai an jima"],
            "ig": ["nnọọ", "daalụ", "biko", "kedu", "mba", "ndo", "ọ dị mma", "ẹzigbo", "ụtụtụ ọma"],
            "so": ["salaan", "mahadsanid", "subax wanaagsan", "haa", "maya", "walaal", "nabad gelyo"],
        }
        
        scores = {}
        for lang, words in markers.items():
            score = sum(1 for word in words if word in text_lower)
            if score > 0:
                scores[lang] = score
        
        if scores:
            best_lang = max(scores, key=scores.get)
            confidence = min(scores[best_lang] / len(markers[best_lang]) * 3, 1.0)
            
            lang_names = {
                "sw": "Swahili", "yo": "Yoruba", "zu": "Zulu", "am": "Amharic",
                "ha": "Hausa", "ig": "Igbo", "so": "Somali"
            }
            
            return {
                "detected_language": lang_names.get(best_lang, best_lang),
                "language_code": best_lang,
                "confidence": round(confidence, 2),
                "all_scores": {lang_names.get(k, k): v for k, v in scores.items()}
            }
        
        return {
            "detected_language": "unknown",
            "language_code": "",
            "confidence": 0.0,
            "all_scores": {}
        }
    
    def transliterate(self, text: str, language_code: str) -> Dict[str, str]:
        """Transliterate text to Latin script"""
        # Simplified transliteration for Ge'ez script (Amharic/Tigrinya)
        if language_code in ["am", "ti"]:
            gez_to_latin = {
                'ሀ': 'ha', 'ሁ': 'hu', 'ሂ': 'hi', 'ሃ': 'haa', 'ሄ': 'hee', 'ህ': 'h', 'ሆ': 'ho',
                'ለ': 'le', 'ሉ': 'lu', 'ሊ': 'li', 'ላ': 'laa', 'ሌ': 'lee', 'ል': 'l', 'ሎ': 'lo',
                'ሐ': 'ha', 'ሑ': 'hu', 'ሒ': 'hi', 'ሓ': 'haa', 'ሔ': 'hee', 'ሕ': 'h', 'ሖ': 'ho',
                'መ': 'me', 'ሙ': 'mu', 'ሚ': 'mi', 'ማ': 'maa', 'ሜ': 'mee', 'ም': 'm', 'ሞ': 'mo',
                'ሠ': 'se', 'ሡ': 'su', 'ሢ': 'si', 'ሣ': 'saa', 'ሤ': 'see', 'ሥ': 's', 'ሦ': 'so',
                'ረ': 're', 'ሩ': 'ru', 'ሪ': 'ri', 'ራ': 'raa', 'ሬ': 'ree', 'ር': 'r', 'ሮ': 'ro',
                'ሰ': 'se', 'ሱ': 'su', 'ሲ': 'si', 'ሳ': 'saa', 'ሴ': 'see', 'ስ': 's', 'ሶ': 'so',
                'ሸ': 'she', 'ሹ': 'shu', 'ሺ': 'shi', 'ሻ': 'shaa', 'ሼ': 'shee', 'ሽ': 'sh', 'ሾ': 'sho',
                'ቀ': 'qe', 'ቁ': 'qu', 'ቂ': 'qi', 'ቃ': 'qaa', 'ቄ': 'qee', 'ቅ': 'q', 'ቆ': 'qo',
                'በ': 'be', 'ቡ': 'bu', 'ቢ': 'bi', 'ባ': 'baa', 'ቤ': 'bee', 'ብ': 'b', 'ቦ': 'bo',
                'ቨ': 've', 'ቩ': 'vu', 'ቪ': 'vi', 'ቫ': 'vaa', 'ቬ': 'vee', 'ቭ': 'v', 'ቮ': 'vo',
                'ተ': 'te', 'ቱ': 'tu', 'ቲ': 'ti', 'ታ': 'taa', 'ቴ': 'tee', 'ት': 't', 'ቶ': 'to',
                'ቸ': 'che', 'ቹ': 'chu', 'ቺ': 'chi', 'ቻ': 'chaa', 'ቼ': 'chee', 'ች': 'ch', 'ቾ': 'cho',
                'ኀ': 'he', 'ኁ': 'hu', 'ኂ': 'hi', 'ኃ': 'haa', 'ኄ': 'hee', 'ኅ': 'h', 'ኆ': 'ho',
                'ነ': 'ne', 'ኑ': 'nu', 'ኒ': 'ni', 'ና': 'naa', 'ኔ': 'nee', 'ን': 'n', 'ኖ': 'no',
                'ኘ': 'gne', 'ኙ': 'gnu', 'ኚ': 'gni', 'ኛ': 'gnaa', 'ኜ': 'gnee', 'ኝ': 'gn', 'ኞ': 'gno',
                'አ': 'a', 'ኡ': 'u', 'ኢ': 'i', 'ኣ': 'aa', 'ኤ': 'ee', 'እ': 'e', 'ኦ': 'o',
                'ከ': 'ke', 'ኩ': 'ku', 'ኪ': 'ki', 'ካ': 'kaa', 'ኬ': 'kee', 'ክ': 'k', 'ኮ': 'ko',
                'ኸ': 'he', 'ኹ': 'hu', 'ኺ': 'hi', 'ኻ': 'haa', 'ኼ': 'hee', 'ኽ': 'h', 'ኾ': 'ho',
                'ወ': 'we', 'ዉ': 'wu', 'ዊ': 'wi', 'ዋ': 'waa', 'ዌ': 'wee', 'ው': 'w', 'ዎ': 'wo',
                'ዐ': 'a', 'ዑ': 'u', 'ዒ': 'i', 'ዓ': 'aa', 'ዔ': 'ee', 'ዕ': 'e', 'ዖ': 'o',
                'ዘ': 'ze', 'ዙ': 'zu', 'ዚ': 'zi', 'ዛ': 'zaa', 'ዜ': 'zee', 'ዝ': 'z', 'ዞ': 'zo',
                'ዠ': 'zhe', 'ዡ': 'zhu', 'ዢ': 'zhi', 'ዣ': 'zhaa', 'ዤ': 'zhee', 'ዥ': 'zh', 'ዦ': 'zho',
                'የ': 'ye', 'ዩ': 'yu', 'ዪ': 'yi', 'ያ': 'yaa', 'ዬ': 'yee', 'ይ': 'y', 'ዮ': 'yo',
                'ደ': 'de', 'ዱ': 'du', 'ዲ': 'di', 'ዳ': 'daa', 'ዴ': 'dee', 'ድ': 'd', 'ዶ': 'do',
                'ጀ': 'je', 'ጁ': 'ju', 'ጂ': 'ji', 'ጃ': 'jaa', 'ጄ': 'jee', 'ጅ': 'j', 'ጆ': 'jo',
                'ገ': 'ge', 'ጉ': 'gu', 'ጊ': 'gi', 'ጋ': 'gaa', 'ጌ': 'gee', 'ግ': 'g', 'ጎ': 'go',
                'ጠ': 'te', 'ጡ': 'tu', 'ጢ': 'ti', 'ጣ': 'taa', 'ጤ': 'tee', 'ጥ': 't', 'ጦ': 'to',
                'ጨ': 'che', 'ጩ': 'chu', 'ጪ': 'chi', 'ጫ': 'chaa', 'ጬ': 'chee', 'ጭ': 'ch', 'ጮ': 'cho',
                'ጰ': 'pe', 'ጱ': 'pu', 'ጲ': 'pi', 'ጳ': 'paa', 'ጴ': 'pee', 'ጵ': 'p', 'ጶ': 'po',
                'ጸ': 'tse', 'ጹ': 'tsu', 'ጺ': 'tsi', 'ጻ': 'tsaa', 'ጼ': 'tsee', 'ጽ': 'ts', 'ጾ': 'tso',
                'ፀ': 'tse', 'ፁ': 'tsu', 'ፂ': 'tsi', 'ፃ': 'tsaa', 'ፄ': 'tsee', 'ፅ': 'ts', 'ፆ': 'tso',
                'ፈ': 'fe', 'ፉ': 'fu', 'ፊ': 'fi', 'ፋ': 'faa', 'ፌ': 'fee', 'ፍ': 'f', 'ፎ': 'fo',
                'ፐ': 'pe', 'ፑ': 'pu', 'ፒ': 'pi', 'ፓ': 'paa', 'ፔ': 'pee', 'ፕ': 'p', 'ፖ': 'po',
                ' ': ' ', '.': '.', ',': ',', '?': '?', '!': '!', '-': '-',
            }
            
            transliterated = ""
            for char in text:
                transliterated += gez_to_latin.get(char, char)
            
            return {
                "original": text,
                "transliterated": transliterated,
                "language": language_code,
                "script": "Ge'ez to Latin"
            }
        
        return {
            "original": text,
            "transliterated": text,
            "language": language_code,
            "note": "Transliteration not supported for this language"
        }
    
    def get_common_phrases(self, language_code: str, category: str = "basic") -> Dict[str, Any]:
        """Get common phrases by category"""
        categories = {
            "basic": ["hello", "goodbye", "thank you", "please", "sorry", "yes", "no"],
            "greetings": ["hello", "good morning", "good evening", "good night", "how are you"],
            "courtesy": ["thank you", "please", "sorry", "excuse me", "welcome"],
            "family": ["mother", "father", "child", "brother", "sister", "family"],
            "numbers": ["one", "two", "three", "four", "five", "ten", "hundred", "thousand"],
            "actions": ["to eat", "to drink", "to go", "to come", "to see", "to know", "to speak"],
        }
        
        trans_dict = self.translation_dicts.get(language_code, {})
        phrases_to_get = categories.get(category, categories["basic"])
        
        phrases = {}
        for phrase in phrases_to_get:
            translated = trans_dict.get(phrase)
            if translated:
                phrases[phrase] = translated
        
        return {
            "language": language_code,
            "category": category,
            "phrases": phrases
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize the AfricanLanguages module state"""
        return {
            "supported_languages": len(self.languages_info),
            "total_translation_entries": sum(len(d) for d in self.translation_dicts.values()),
            "total_greetings": sum(len(g) for g in self.greetings_db.values()),
            "total_proverbs": sum(len(p) for p in self.proverbs_db.values()),
            "languages": [code for code in self.languages_info.keys()]
        }
