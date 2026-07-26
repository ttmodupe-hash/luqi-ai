"""
African Language Data Module
============================
Comprehensive language dictionaries and content for 5 major African languages:
Swahili, isiZulu, Hausa, Yoruba, and Amharic.

Each language entry includes common phrases, alphabet/character systems,
pronunciation notes, cultural context, translation pairs, and sample sentences.

Usage:
    from language_data import LANGUAGES, TRANSLATION_PAIRS, SAMPLE_SENTENCES
    swahili_phrases = LANGUAGES["swahili"]["phrases"]

Data structure is optimised for API consumption and AI model training.
"""

from typing import Dict, List, Any

# =============================================================================
# LANGUAGE DATABASE
# =============================================================================

LANGUAGES: Dict[str, Dict[str, Any]] = {
    "swahili": {
        "name": "Swahili",
        "native_name": "Kiswahili",
        "family": "Niger-Congo / Bantu",
        "region": "East Africa (Kenya, Tanzania, Uganda, DRC, Mozambique, Somalia)",
        "speakers_approx": "200,000,000",
        "status": "Official language in Tanzania, Kenya, Uganda; lingua franca in East Africa",
        "alphabet": {
            "type": "Latin",
            "letters": [
                "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
                "K", "L", "M", "N", "O", "P", "R", "S", "T", "U",
                "V", "W", "Y", "Z"
            ],
            "note": "Swahili uses the Latin alphabet without Q and X. It does not use the letters Q or X in native words.",
            "special_combinations": ["ch", "dh", "gh", "kh", "ng'", "ny", "sh", "th"]
        },
        "pronunciation_notes": [
            "Vowels: a (ah), e (eh), i (ee), o (oh), u (oo) — pronounced clearly and distinctly",
            "No silent letters — every letter is pronounced",
            "Stress is typically on the second-to-last syllable (penultimate)",
            "'ng' is pronounced as in 'sing'; 'ng'' with apostrophe is a hard g sound",
            "'ny' is pronounced like the Spanish 'ñ'",
            "No tone system — pitch does not change word meaning"
        ],
        "grammar_notes": [
            "Nouns are grouped into noun classes (similar to gender in other languages)",
            "Verbs do not change for person — same form for I, you, he/she, etc.",
            "Subject prefixes attached to verbs indicate who is doing the action",
            "No definite or indefinite articles (no 'the' or 'a')",
            "Adjectives must agree with the noun class of the noun they describe"
        ],
        "cultural_context": {
            "greeting_importance": "Greetings are extremely important in Swahili culture. It is considered rude to begin a conversation or ask for something without first exchanging greetings extensively.",
            "origin": "Developed along the East African coast through centuries of trade between Bantu-speaking Africans and Arab traders. Contains many Arabic loanwords (est. 30-40%).",
            "pan_african_role": "Swahili serves as a unifying language across East Africa and is promoted as a language of African unity.",
            "formality": "Use 'shikamoo' to greet elders respectfully (literally 'I hold your feet'). Respond with 'marahaba'.",
            "religious_context": "Used in Islamic religious contexts in coastal regions, but is a secular language of wider communication."
        },
        "phrases": [
            {"phrase": "Jambo", "translation": "Hello", "context": "General greeting"},
            {"phrase": "Habari", "translation": "How are you / News?", "context": "Common greeting"},
            {"phrase": "Habari gani", "translation": "How are you? (literally: what news?)", "context": "Informal greeting"},
            {"phrase": "Nzuri / Nzuri sana", "translation": "Good / Very good", "context": "Response to habari"},
            {"phrase": "Asante", "translation": "Thank you", "context": "Standard thanks"},
            {"phrase": "Asante sana", "translation": "Thank you very much", "context": "Grateful thanks"},
            {"phrase": "Karibu", "translation": "Welcome / You're welcome / Come in", "context": "Hospitality; also response to thanks"},
            {"phrase": "Tafadhali", "translation": "Please", "context": "Polite request"},
            {"phrase": "Samahani", "translation": "Excuse me / Sorry", "context": "Getting attention or apologising"},
            {"phrase": "Ndiyo", "translation": "Yes", "context": "Affirmation"},
            {"phrase": "Hapana", "translation": "No", "context": "Negation"},
            {"phrase": "Kwa heri", "translation": "Goodbye (to one person)", "context": "Farewell"},
            {"phrase": "Kwa herini", "translation": "Goodbye (to multiple people)", "context": "Farewell to group"},
            {"phrase": "Lala salama", "translation": "Good night / Sleep well", "context": "Bedtime farewell"},
            {"phrase": "Ninaitwa...", "translation": "My name is...", "context": "Introduction"},
            {"phrase": "Jina lako nani?", "translation": "What is your name?", "context": "Asking name"},
            {"phrase": "Unatoka wapi?", "translation": "Where are you from?", "context": "Asking origin"},
            {"phrase": "Natoka...", "translation": "I am from...", "context": "Stating origin"},
            {"phrase": "Unasema Kiingereza?", "translation": "Do you speak English?", "context": "Language check"},
            {"phrase": "Sielewi", "translation": "I don't understand", "context": "Confusion"},
            {"phrase": "Pole pole", "translation": "Slowly / Gently / Take it easy", "context": "Common phrase; also name of famous Kilimanjaro climbing pace"},
            {"phrase": "Hakuna matata", "translation": "No problem / No worries", "context": "Famous phrase meaning everything is fine"},
            {"phrase": "Maji", "translation": "Water", "context": "Essential word"},
            {"phrase": "Chakula", "translation": "Food", "context": "Essential word"},
            {"phrase": "Bei gani?", "translation": "How much is it?", "context": "Shopping"},
            {"phrase": "Shikamoo", "translation": "Respectful greeting to elders", "context": "Cultural greeting"},
            {"phrase": "Marahaba", "translation": "Response to shikamoo", "context": "Elder response"},
            {"phrase": "Mungu akubariki", "translation": "God bless you", "context": "Blessing"},
            {"phrase": "Tutaonana", "translation": "See you later", "context": "Casual goodbye"}
        ],
        "common_words": {
            "greetings": {
                "hello": "Jambo / Habari",
                "good_morning": "Habari za asubuhi",
                "good_afternoon": "Habari za mchana",
                "good_evening": "Habari za jioni",
                "good_night": "Usiku mwema"
            },
            "people": {
                "person": "mtu",
                "friend": "rafiki",
                "family": "familia / jamaa",
                "child": "mtoto",
                "mother": "mama",
                "father": "baba"
            },
            "food": {
                "food": "chakula",
                "water": "maji",
                "bread": "mkate",
                "rice": "wali / mchele",
                "meat": "nyama",
                "fish": "samaki"
            },
            "numbers_1_to_10": {
                "1": "moja", "2": "mbili", "3": "tatu", "4": "nne",
                "5": "tano", "6": "sita", "7": "saba", "8": "nane",
                "9": "tisa", "10": "kumi"
            }
        }
    },

    "isizulu": {
        "name": "isiZulu",
        "native_name": "isiZulu",
        "family": "Niger-Congo / Bantu",
        "region": "South Africa (KwaZulu-Natal, Gauteng, Mpumalanga), Zimbabwe, Lesotho",
        "speakers_approx": "27,000,000",
        "status": "Official language of South Africa; most widely spoken home language in SA",
        "alphabet": {
            "type": "Latin (extended)",
            "letters": [
                "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
                "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
                "U", "V", "W", "X", "Y", "Z"
            ],
            "special_combinations": ["bh", "ch", "dl", "gc", "gq", "hl", "kh", "kl", "nq", "nx", "ny", "ph", "qh", "sh", "th", "ts", "ty", "xh", "yt"],
            "click_consonants": [
                {"symbol": "c", "description": "Dental click (tongue against teeth)", "example_word": "cina"},
                {"symbol": "q", "description": "Alveolar click (tongue against palate)", "example_word": "qanda"},
                {"symbol": "x", "description": "Lateral click (tongue against side)", "example_word": "xoxa"}
            ],
            "note": "isiZulu features three distinct click sounds represented by c, q, and x. These are unique to Khoisan-influenced Bantu languages."
        },
        "pronunciation_notes": [
            "Three click sounds: c (dental), q (alveolar), x (lateral) — essential to master",
            "Vowels: a (ah), e (eh), i (ee), o (oh), u (oo) — similar to other Bantu languages",
            "Aspiration: 'ph', 'th', 'kh' are aspirated (puff of air); 'p', 't', 'k' are not",
            "Ejective sounds: some consonants are pronounced with a glottal stop",
            "Vowel length can be significant in some dialects",
            "Tone system: isiZulu is a tonal language — pitch changes word meaning",
            "Stress usually falls on the penultimate (second-to-last) syllable"
        ],
        "grammar_notes": [
            "Noun class system with 15+ noun classes (ubantu noun class system)",
            "Verbs change with subject concords (prefixes) that match noun class",
            "No grammatical gender — biological gender distinguished lexically",
            "Possessive constructions use possessive concords",
            "Negation formed with prefix 'a-' and suffix '-nga' pattern"
        ],
        "cultural_context": {
            "greeting_importance": "Greetings (ukubingelela) are culturally essential. The exchange 'Sawubona' / 'Yebo' establishes human connection and acknowledges the other's humanity (ubuntu).",
            "ubuntu": "The philosophy of 'ubuntu' — 'I am because we are' — is central to Zulu cultural identity and is reflected in language use.",
            "origin": "isiZulu is the language of the Zulu people, the largest ethnic group in South Africa. The Zulu Kingdom was founded by Shaka kaSenzangakhona in 1816.",
            "honorifics": "Use 'Sawubona' for one person, 'Sanibonani' for a group. 'Sawubona' literally means 'I see you' — acknowledging the other person's existence.",
            "clan_names": "Zulu people identify strongly with their clan names (izithakazelo) and often introduce themselves with them."
        },
        "phrases": [
            {"phrase": "Sawubona", "translation": "Hello (to one person; literally: I see you)", "context": "Standard greeting"},
            {"phrase": "Sanibonani", "translation": "Hello (to multiple people)", "context": "Group greeting"},
            {"phrase": "Yebo", "translation": "Yes", "context": "Affirmation"},
            {"phrase": "Cha", "translation": "No", "context": "Negation"},
            {"phrase": "Ngiyabonga", "translation": "Thank you", "context": "Standard thanks"},
            {"phrase": "Ngiyabonga kakhulu", "translation": "Thank you very much", "context": "Deep gratitude"},
            {"phrase": "Uyamukelwa", "translation": "You are welcome", "context": "Response to thanks"},
            {"phrase": "Ngiyaxolisa", "translation": "I am sorry", "context": "Apology"},
            {"phrase": "Ungathanda ukuphi?", "translation": "Where would you like to go?", "context": "Offering help"},
            {"phrase": "Igama lami ngu...", "translation": "My name is...", "context": "Introduction"},
            {"phrase": "Ungubani igama lakho?", "translation": "What is your name?", "context": "Asking name"},
            {"phrase": "Unjani?", "translation": "How are you?", "context": "Health inquiry"},
            {"phrase": "Ngiyaphila", "translation": "I am well", "context": "Positive response"},
            {"phrase": "Hamba kahle", "translation": "Go well / Goodbye (to person leaving)", "context": "Farewell"},
            {"phrase": "Sala kahle", "translation": "Stay well / Goodbye (to person staying)", "context": "Farewell"},
            {"phrase": "Lala kahle", "translation": "Sleep well", "context": "Bedtime"},
            {"phrase": "Ngiyakuthanda", "translation": "I love you", "context": "Affection"},
            {"phrase": "Uhlakaniphe", "translation": "Be clever / Wise", "context": "Encouragement"},
            {"phrase": "Amandla", "translation": "Power / Strength", "context": "Expression of power; also anti-apartheid slogan"},
            {"phrase": "Ngiyakwazi", "translation": "I know / I understand", "context": "Acknowledging understanding"},
            {"phrase": "Ngiyasiza", "translation": "I am helping", "context": "Offering assistance"},
            {"phrase": "Isikhathi sini?", "translation": "What time is it?", "context": "Asking time"},
            {"phrase": "Kubiza malini?", "translation": "How much does it cost?", "context": "Shopping"},
            {"phrase": "Ngiyalapha", "translation": "I am here", "context": "Presence"},
            {"phrase": "Izinto zinjani?", "translation": "How are things?", "context": "Casual inquiry"},
            {"phrase": "Usaphila na?", "translation": "Are you still well?", "context": "Checking on someone"},
            {"phrase": "Ngikhuluphele", "translation": "I am fine / healthy", "context": "Health response"},
            {"phrase": "Ukube njani?", "translation": "How has it been?", "context": "Checking in"}
        ],
        "common_words": {
            "greetings": {
                "hello": "Sawubona / Sanibonani",
                "good_morning": "Sawubona / Usuku olumnene",
                "good_evening": "Kuhle kube kusihlwa",
                "good_night": "Lala kahle"
            },
            "people": {
                "person": "umuntu",
                "friend": "umngane",
                "family": "imindi",
                "child": "umntwana",
                "mother": "umama",
                "father": "ubaba"
            },
            "food": {
                "food": "ukudla",
                "water": "amanzi",
                "bread": "isinkwa",
                "meat": "inyama",
                "milk": "ubisi"
            },
            "numbers_1_to_10": {
                "1": "kunye", "2": "kubili", "3": "kuthathu", "4": "kune",
                "5": "kuhlanu", "6": "yisithupha", "7": "yisikhombisa",
                "8": "yisishiyagalombili", "9": "yisishiyagalolunye", "10": "yishumi"
            }
        }
    },

    "hausa": {
        "name": "Hausa",
        "native_name": "Hausa / Harshen Hausa",
        "family": "Afro-Asiatic / Chadic",
        "region": "Northern Nigeria, Niger, Chad, Ghana, Cameroon, Sudan, Benin",
        "speakers_approx": "80,000,000+ (native + second language)",
        "status": "Major trade language of West Africa; official in Northern Nigeria",
        "alphabet": {
            "type": "Latin (Boko) and Arabic (Ajami)",
            "latin_letters": [
                "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
                "K", "L", "M", "N", "O", "R", "S", "T", "U", "W",
                "Y", "Z"
            ],
            "special_characters": [
                {"character": "ɓ / Ɓ", "name": "B with hook", "sound": "Implosive 'b' — like sucking air in"},
                {"character": "ɗ / Ɗ", "name": "D with hook", "sound": "Implosive 'd' — like sucking air in"},
                {"character": "ƙ / Ƙ", "name": "K with hook", "sound": "Ejective 'k' — sharp release of air"},
                {"character": "ƴ / Ƴ", "name": "Y with hook", "sound": "Ejective/glottal 'y'"},
                {"character": "ʼ / '", "name": "Glottal stop / Hamza", "sound": "Catch in the throat"}
            ],
            "vowels": {
                "short": "a, e, i, o, u",
                "long": "aa, ee, ii, oo, uu",
                "note": "Vowel length is phonemic — distinguishes word meaning"
            },
            "note": "Hausa uses two writing systems: Latin-based 'Boko' (introduced by British colonial administration) and Arabic-based 'Ajami' (centuries-old tradition)."
        },
        "pronunciation_notes": [
            "Implosive consonants: ɓ and ɗ are pronounced by drawing air inward (rare sound type globally)",
            "Ejective consonants: ƙ and Ƴ involve sharp release of air from the glottis",
            "Vowel length is crucial — short vs. long vowels change word meaning completely",
            "Tone system: Hausa has both lexical tone (high, low, falling) and grammatical tone",
            "Glottal stop (') is a distinct sound and important for meaning",
            "'R' is rolled/flapped as in Spanish or Italian",
            "No 'P' sound in native Hausa words — 'f' or 'b' used instead"
        ],
        "grammar_notes": [
            "Subject pronouns are often fused with tense markers into single words",
            "No grammatical gender for inanimate nouns",
            "Plural formation is complex — multiple systems including suffixes, infixes, and tone changes",
            "Verb roots typically don't change; aspects (perfective, imperfective) marked by tone and auxiliaries",
            "Prepositions are relatively few; many spatial relations expressed through nouns"
        ],
        "cultural_context": {
            "greeting_importance": "Greetings in Hausa culture are elaborate and essential. Multiple exchanges of 'Sannu' with various qualifiers are expected before any business or conversation.",
            "islamic_influence": "Hausa culture is predominantly Muslim (95%+), and the language contains significant Arabic vocabulary, especially for religious and scholarly concepts.",
            "trade_history": "Hausa has been a trade language across West Africa for centuries, serving as a lingua franca for the trans-Saharan trade routes.",
            "poetry": "Hausa has a rich tradition of oral poetry and written literature, especially praise songs (roko) and proverbs (karin magana).",
            "proverbs": "Karin magana (proverbs/sayings) are highly valued and used extensively in daily conversation and oratory."
        },
        "phrases": [
            {"phrase": "Sannu", "translation": "Hello / Greetings", "context": "Standard greeting"},
            {"phrase": "Sannu da zuwa", "translation": "Welcome (literally: greetings on arrival)", "context": "Receiving someone"},
            {"phrase": "Sannu da safe", "translation": "Good morning", "context": "Morning greeting"},
            {"phrase": "Sannu da rana", "translation": "Good afternoon", "context": "Afternoon greeting"},
            {"phrase": "Sannu da yamma", "translation": "Good evening", "context": "Evening greeting"},
            {"phrase": "Na gode", "translation": "Thank you", "context": "Standard thanks"},
            {"phrase": "Na gode sosai", "translation": "Thank you very much", "context": "Deep gratitude"},
            {"phrase": "Maraba", "translation": "You're welcome", "context": "Response to thanks"},
            {"phrase": "To", "translation": "OK / Yes / Fine", "context": "Very common multipurpose word"},
            {"phrase": "A'a", "translation": "No", "context": "Negation"},
            {"phrase": "Don Allah", "translation": "Please / For God's sake", "context": "Polite request"},
            {"phrase": "Yaya kake? (m) / Yaya kike? (f)", "translation": "How are you?", "context": "Health inquiry"},
            {"phrase": "Ina lafiya", "translation": "I am fine / well", "context": "Positive response"},
            {"phrase": "Lafiya lau", "translation": "Fine, completely (everything is fine)", "context": "Everything OK"},
            {"phrase": "Suna na...", "translation": "My name is...", "context": "Introduction"},
            {"phrase": "Menene sunanka?", "translation": "What is your name?", "context": "Asking name"},
            {"phrase": "Ina zaune a...", "translation": "I live in...", "context": "Stating residence"},
            {"phrase": "Sai da gobe", "translation": "See you tomorrow / Until tomorrow", "context": "Farewell"},
            {"phrase": "Barka da dare", "translation": "Good night", "context": "Bedtime"},
            {"phrase": "Barka da rana", "translation": "Happy celebration / Eid greetings", "context": "Festive greeting"},
            {"phrase": "Ba komai", "translation": "No problem / It's nothing", "context": "Dismissive of thanks"},
            {"phrase": "Taimako", "translation": "Help", "context": "Asking for help"},
            {"phrase": "Ruwa", "translation": "Water", "context": "Essential word"},
            {"phrase": "Abinci", "translation": "Food", "context": "Essential word"},
            {"phrase": "Nawa ne?", "translation": "How much is it?", "context": "Shopping"},
            {"phrase": "Ina son...", "translation": "I want...", "context": "Expressing desire"},
            {"phrase": "Bana fahimta", "translation": "I don't understand", "context": "Confusion"},
            {"phrase": "Sai an jima", "translation": "See you later / In a while", "context": "Casual goodbye"}
        ],
        "common_words": {
            "greetings": {
                "hello": "Sannu",
                "good_morning": "Sannu da safe",
                "good_afternoon": "Sannu da rana",
                "good_evening": "Sannu da yamma"
            },
            "people": {
                "person": "mutum",
                "friend": "aboki",
                "family": "iyali",
                "child": "yaro / yarinya",
                "mother": "uwa",
                "father": "uba"
            },
            "food": {
                "food": "abinci",
                "water": "ruwa",
                "bread": "burodi",
                "rice": "shinkafa",
                "meat": "nama"
            },
            "numbers_1_to_10": {
                "1": "daya", "2": "biyu", "3": "uku", "4": "hudu",
                "5": "biyar", "6": "shida", "7": "bakwai", "8": "takwas",
                "9": "tara", "10": "goma"
            }
        }
    },

    "yoruba": {
        "name": "Yoruba",
        "native_name": "Yorùbá / Èdè Yorùbá",
        "family": "Niger-Congo / Volta-Niger",
        "region": "Southwest Nigeria, Benin, Togo, Ghana, Brazil, Cuba (as Lucumí)",
        "speakers_approx": "45,000,000+",
        "status": "Official language in Southwest Nigeria; one of Africa's major languages",
        "alphabet": {
            "type": "Latin (extended)",
            "letters": [
                "A", "B", "D", "E", "Ẹ", "F", "G", "Gb", "H", "I",
                "J", "K", "L", "M", "N", "O", "Ọ", "P", "R", "S",
                "Ṣ", "T", "U", "W", "Y"
            ],
            "special_characters": [
                {"character": "ẹ / Ẹ", "name": "E with dot below", "sound": "Open 'e' as in 'bet'"},
                {"character": "ọ / Ọ", "name": "O with dot below", "sound": "Open 'o' as in 'or'"},
                {"character": "ṣ / Ṣ", "name": "S with dot below", "sound": "'Sh' sound as in 'ship'"},
                {"character": "gb", "name": "Gb digraph", "sound": "Simultaneous g and b (labio-velar)"},
                {"character": "á, à, ā, â", "name": "Vowels with tone marks", "sound": "High, low, mid, and falling tones"}
            ],
            "tone_system": {
                "description": "Yoruba is a fully tonal language with three phonemic tones",
                "tones": [
                    {"mark": "acute (á)", "name": "High tone", "pitch": "High pitch"},
                    {"mark": "grave (à)", "name": "Low tone", "pitch": "Low pitch"},
                    {"mark": "macron (ā) or none", "name": "Mid tone", "pitch": "Middle pitch"}
                ],
                "importance": "Tone changes word meaning completely. E.g., 'ọkọ' (husband) vs. 'òkò' (hoe) vs. 'ọ̀kọ̀' (boat)"
            },
            "note": "The Yoruba alphabet does not use C, Q, V, X, or Z. Gb is treated as a single letter."
        },
        "pronunciation_notes": [
            "Tonal language — three tones (high, mid, low) that change word meaning",
            "Vowel harmony: vowels in a word tend to be either all oral (a, e, i, o, u) or all nasal (an, en, in, on, un)",
            "'ṣ' is always pronounced as 'sh' in 'ship'",
            "'ẹ' is an open 'e' sound as in English 'bet'; 'e' is a closed 'e' as in 'bait'",
            "'ọ' is an open 'o' sound as in 'or'; 'o' is a closed 'o' as in 'go'",
            "'gb' is a simultaneous labio-velar sound — both g and b pronounced together",
            "Syllable structure is typically CV (consonant-vowel) — no consonant clusters except 'gb'"
        ],
        "grammar_notes": [
            "Subject-verb-object (SVO) word order",
            "No grammatical gender for nouns",
            "Verbs do not conjugate for tense — time indicated by context or auxiliaries",
            "Aspect markers indicate whether action is completed, ongoing, or habitual",
            "Pronouns change form based on their grammatical function in the sentence",
            "Serial verb constructions are very common"
        ],
        "cultural_context": {
            "greeting_importance": "Greetings are elaborate and culturally significant. Multiple exchanges of 'Báwo ni' with handshakes and inquiries about family are expected.",
            "origin": "Yoruba people have lived in Southwest Nigeria for thousands of years. The Oyo Empire (14th-19th century) was one of Africa's largest pre-colonial states.",
            "ifá_tradition": "Yoruba spirituality includes the Ifá divination tradition, which has spread to the Americas as Santería (Cuba), Candomblé (Brazil), and Vodun.",
            "naming": "Yoruba names have deep meaning — children are often named by circumstances of birth (e.g., Taiwo/Kehinde for twins).",
            "courtesy": "Using 'ẹ jọ̀ọ́' (please) and 'ẹ ṣeun' (thank you) is essential for polite interaction.",
            "diaspora": "Yoruba culture and language survived the transatlantic slave trade and continue in Brazil, Cuba, Trinidad, and the United States."
        },
        "phrases": [
            {"phrase": "Báwo ni?", "translation": "How are you? / How is it?", "context": "Standard greeting"},
            {"phrase": "Báwo ni ayé?", "translation": "How is life?", "context": "Deeper greeting"},
            {"phrase": "Dáadáa ni", "translation": "It is good / I am fine", "context": "Positive response"},
            {"phrase": "Ṣeun / Ẹ ṣeun", "translation": "Thank you / You (pl) thank", "context": "Gratitude; 'ẹ' prefix for respect"},
            {"phrase": "Ẹ ṣeun pupọ̀", "translation": "Thank you very much", "context": "Deep gratitude"},
            {"phrase": "Kò tópẹ́", "translation": "You're welcome (literally: it is not enough to thank)", "context": "Response to thanks"},
            {"phrase": "Ẹ kú àárọ̀", "translation": "Good morning (literally: greeting of the morning)", "context": "Morning greeting"},
            {"phrase": "Ẹ kú ọ̀sán", "translation": "Good afternoon", "context": "Afternoon greeting"},
            {"phrase": "Ẹ kú ìrọ̀lẹ́", "translation": "Good evening", "context": "Evening greeting"},
            {"phrase": "Ọ̀dàárọ̀", "translation": "Good night", "context": "Bedtime"},
            {"phrase": "Kí ni orúkọ rẹ?", "translation": "What is your name?", "context": "Asking name"},
            {"phrase": "Orúkọ mi ni...", "translation": "My name is...", "context": "Introduction"},
            {"phrase": "Bẹẹni", "translation": "Yes", "context": "Affirmation"},
            {"phrase": "Rárá", "translation": "No", "context": "Negation"},
            {"phrase": "Ẹ jọ̀ọ́", "translation": "Please", "context": "Polite request"},
            {"phrase": "Ẹ ma bínú", "translation": "Don't be angry / Sorry", "context": "Apology"},
            {"phrase": "Mo nífẹ̀ẹ́ rẹ", "translation": "I love you", "context": "Affection"},
            {"phrase": "Ó dàbọ̀", "translation": "Goodbye", "context": "Farewell"},
            {"phrase": "Ka yíní", "translation": "See you later", "context": "Casual goodbye"},
            {"phrase": "O wọ́n", "translation": "It is expensive", "context": "Shopping"},
            {"phrase": "Ìwé", "translation": "Book / Paper", "context": "Education"},
            {"phrase": "Omi", "translation": "Water", "context": "Essential word"},
            {"phrase": "Oúnjẹ", "translation": "Food", "context": "Essential word"},
            {"phrase": "Báwo ni o ṣe wá?", "translation": "How did you come? / How are you?", "context": "Greeting variation"},
            {"phrase": "Ẹ kú ìṣẹ́jú méta", "translation": "Happy new year / Greetings on this occasion", "context": "Celebration"},
            {"phrase": "Àlàáfíà ni", "translation": "It is peace / I am at peace", "context": "Peaceful greeting response"},
            {"phrase": "Mo fẹ́ràn Yorùbá", "translation": "I love Yoruba", "context": "Cultural pride"},
            {"phrase": "Ẹ kú àánú", "translation": "Greetings of mercy", "context": "Religious greeting"},
            {"phrase": "Sáré", "translation": "Run / Hurry", "context": "Urgency"}
        ],
        "common_words": {
            "greetings": {
                "hello": "Báwo ni",
                "good_morning": "Ẹ kú àárọ̀",
                "good_afternoon": "Ẹ kú ọ̀sán",
                "good_evening": "Ẹ kú ìrọ̀lẹ́",
                "good_night": "Ọ̀dàárọ̀"
            },
            "people": {
                "person": "ènìyàn",
                "friend": "ọ̀rẹ́",
                "family": "ebí",
                "child": "ọmọ",
                "mother": "ìyá",
                "father": "bàbá"
            },
            "food": {
                "food": "oúnjẹ",
                "water": "omi",
                "bread": "búrẹ́dì",
                "rice": "ìrẹsì",
                "meat": "ẹran"
            },
            "numbers_1_to_10": {
                "1": "ọ̀kan", "2": "méjì", "3": "mẹ́ta", "4": "mẹ́rin",
                "5": "márùn-ún", "6": "mẹ́fà", "7": "méje", "8": "mẹ́jọ",
                "9": "mẹ́sàn-án", "10": "mọ́kànlá"  # Note: corrected to proper Yoruba
            }
        }
    },

    "amharic": {
        "name": "Amharic",
        "native_name": "አማርኛ (Amarəñña)",
        "family": "Afro-Asiatic / Semitic",
        "region": "Ethiopia (official language), Eritrea, Egypt, Israel, diaspora communities",
        "speakers_approx": "32,000,000+ (native); 25,000,000+ (second language)",
        "status": "Official language of Ethiopia; one of the few indigenous African languages with official status at a national level",
        "alphabet": {
            "type": "Ge'ez / Ethiopic script (Fidel)",
            "script_name": "Fidel (ፊደል)",
            "base_characters": 26,
            "total_characters": "~270 (including modifications)",
            "description": "The Ge'ez script is an abugida (segmental writing system) where each character represents a consonant-vowel syllable. The base consonant shape is modified to indicate the following vowel.",
            "base_consonants": [
                "ሀ (hä)", "ለ (lä)", "ሐ (ḥä)", "መ (mä)", "ሠ (śä)", "ረ (rä)",
                "ሰ (sä)", "ሸ (šä)", "ቀ (qä)", "በ (bä)", "ተ (tä)", "ቸ (čä)",
                "ኀ (ḫä)", "ነ (nä)", "ኘ (ñä)", "አ (ʾä)", "ከ (kä)", "ኸ (ḳä)",
                "ወ (wä)", "ዐ (ʿä)", "ዘ (zä)", "ዠ (žä)", "የ (yä)", "ደ (dä)",
                "ጀ (ǧä)", "ገ (gä)", "ጠ (ṭä)", "ጨ (č̣ä)", "ጰ (p̣ä)", "ፀ (ṣä)",
                "ፈ (fä)", "ፐ (pä)"
            ],
            "vowel_orders": [
                "1st order: ä (ə) — central vowel",
                "2nd order: u — as in 'food'",
                "3rd order: i — as in 'see'",
                "4th order: a — as in 'father'",
                "5th order: e — as in 'say'",
                "6th order: ə (o) — as in 'go'",
                "7th order: wa — labialised"
            ],
            "note": "Amharic is written left-to-right. The script evolved from the ancient Ge'ez language, which remains the liturgical language of the Ethiopian Orthodox Church."
        },
        "pronunciation_notes": [
            "The 'q' sound (ቀ) is an ejective — a sharp k sound produced by closing the glottis",
            "The 'ḳ' sound (ኸ) is a velar ejective, distinct from regular k",
            "The glottal stop (አ) is a distinct consonant in Amharic — a catch in the throat",
            "Vowels are always pronounced clearly and distinctly",
            "Gemination (doubling of consonants) is phonemic and changes word meaning",
            "Stress typically falls on the second-to-last syllable",
            "No tone system in Amharic (unlike some other Ethiopian languages)"
        ],
        "grammar_notes": [
            "Subject-object-verb (SOV) word order",
            "Grammatical gender: masculine and feminine (often marked by suffixes -ä for masc, -it for fem)",
            "Verbs are highly complex with extensive conjugation patterns",
            "Plurality often marked by internal changes or suffixes (-očč, -an, -t)",
            "Definite article is suffixed to the noun (e.g., bet-u = 'the house')",
            "Possessive suffixes attached directly to nouns",
            "Compound verbs common — main verb + auxiliary verb combinations"
        ],
        "cultural_context": {
            "greeting_importance": "Greetings are elaborate and involve multiple inquiries about health, family, and work. Shaking hands while touching shoulders is common among men.",
            "ethiopian_orthodox": "The Ethiopian Orthodox Tewahedo Church has profoundly shaped Amharic culture. Many Amharic words and expressions have religious origins.",
            "coffee_origin": "Ethiopia is the birthplace of coffee. The traditional coffee ceremony (buna maflat) is a central social ritual conducted in Amharic.",
            "calendar": "Ethiopia uses its own ancient calendar (7-8 years behind the Gregorian calendar) and its own time system (12-hour cycle starting at dawn).",
            "formality": "Use 'wo' (ወ) or 'at' (አቶ) as respectful prefixes before names for men and women respectively.",
            "enkutatash": "Ethiopian New Year (Enkutatash) is celebrated on September 11 (or 12 in leap years)."
        },
        "phrases": [
            {"phrase": "ሰላም (Salam)", "translation": "Hello / Peace", "context": "Standard greeting"},
            {"phrase": "እንደምን አደርክ (Indämən ädärk)", "translation": "Good morning (to a male)", "context": "Morning greeting"},
            {"phrase": "እንደምን አደርሽ (Indämən ädärəš)", "translation": "Good morning (to a female)", "context": "Morning greeting"},
            {"phrase": "እንደምን ዋሉ (Indämən walu)", "translation": "Good afternoon / How was your day?", "context": "Afternoon greeting"},
            {"phrase": "እንደምን አመሸህ (Indämən ämäšäh)", "translation": "Good evening (to a male)", "context": "Evening greeting"},
            {"phrase": "እንደምን አመሸሽ (Indämən ämäšəš)", "translation": "Good evening (to a female)", "context": "Evening greeting"},
            {"phrase": "አመሰግናለሁ (Amäsägənallähu)", "translation": "Thank you", "context": "Standard thanks"},
            {"phrase": "በጣም አመሰግናለሁ (Bəṭam amäsägənallähu)", "translation": "Thank you very much", "context": "Deep gratitude"},
            {"phrase": "አይ በቃ (Ay bäḳa)", "translation": "No problem / It's OK", "context": "Response to thanks"},
            {"phrase": "አዎ (Awo)", "translation": "Yes", "context": "Affirmation"},
            {"phrase": "አይ (Ay)", "translation": "No", "context": "Negation"},
            {"phrase": "እባክህ (Ǝbakəh)", "translation": "Please (to a male)", "context": "Polite request"},
            {"phrase": "እባክሽ (Ǝbakəš)", "translation": "Please (to a female)", "context": "Polite request"},
            {"phrase": "ስሜ... ነው (Səmē... naw)", "translation": "My name is...", "context": "Introduction"},
            {"phrase": "ስምህ ማን ነው? (Səməh man naw?)", "translation": "What is your name? (to male)", "context": "Asking name"},
            {"phrase": "ስምሽ ማን ነው? (Səməš man naw?)", "translation": "What is your name? (to female)", "context": "Asking name"},
            {"phrase": "እንደምን ነህ? (Indämən näh?)", "translation": "How are you? (to a male)", "context": "Health inquiry"},
            {"phrase": "እንደምን ነሽ? (Indämən nəš?)", "translation": "How are you? (to a female)", "context": "Health inquiry"},
            {"phrase": "ጥሩ ነኝ (Ṭəru näñ)", "translation": "I am fine / good", "context": "Positive response"},
            {"phrase": "ደህና ሁን (Dähna hun)", "translation": "Goodbye (to male) / Be well", "context": "Farewell"},
            {"phrase": "ደህና ሁኚ (Dähna huni)", "translation": "Goodbye (to female)", "context": "Farewell"},
            {"phrase": "ደህና እደር (Dähna Ǝdär)", "translation": "Good night (to male)", "context": "Bedtime"},
            {"phrase": "ደህና እደሪ (Dähna Ǝdäri)", "translation": "Good night (to female)", "context": "Bedtime"},
            {"phrase": "ይቅርታ (Yiq̇ərta)", "translation": "Sorry / Excuse me / Forgiveness", "context": "Apology"},
            {"phrase": "ፍቅር (Fəq̇ər)", "translation": "Love", "context": "Affection"},
            {"phrase": "ውሃ (Wəha)", "translation": "Water", "context": "Essential word"},
            {"phrase": "ምግብ (Məgbə)", "translation": "Food", "context": "Essential word"},
            {"phrase": "ዋጋው ስንት ነው? (Wagaw sənt naw?)", "translation": "How much does it cost?", "context": "Shopping"},
            {"phrase": "አልገባኝም (Algeb_añəm)", "translation": "I don't understand", "context": "Confusion"},
            {"phrase": "በኋላ እንገናኝ (Bäẖ_wala Ǝngänañ)", "translation": "See you later", "context": "Casual goodbye"}
        ],
        "common_words": {
            "greetings": {
                "hello": "ሰላም (Salam)",
                "good_morning": "እንደምን አደርክ / አደርሽ",
                "good_afternoon": "እንደምን ዋሉ",
                "good_evening": "እንደምን አመሸህ / አመሸሽ",
                "good_night": "ደህና እደር / እደሪ"
            },
            "people": {
                "person": "ሰው (säw)",
                "friend": "ወዳጅ (wädaǧ)",
                "family": "ቤተሰብ (bētäsäb)",
                "child": "ልጅ (lǧ)",
                "mother": "እናት (Ǝnat)",
                "father": "አባት (Abat)"
            },
            "food": {
                "food": "ምግብ (Məgbə)",
                "water": "ውሃ (Wəha)",
                "bread": "ዳቦ (Dabo)",
                "meat": "ስጋ (Səga)",
                "coffee": "ቡና (Buna)"
            },
            "numbers_1_to_10": {
                "1": "አንድ (and)", "2": "ሁለት (hulät)", "3": "ሦስት (sost)",
                "4": "አራት (arat)", "5": "አምስት (amst)", "6": "ስድስት (sədst)",
                "7": "ሰባት (säbat)", "8": "ስምንት (smənt)",
                "9": "ዘጠኝ (zäṭäñ)", "10": "አስር (asr)"
            }
        }
    }
}


# =============================================================================
# CROSS-LANGUAGE TRANSLATION PAIRS
# =============================================================================

TRANSLATION_PAIRS: Dict[str, Dict[str, str]] = {
    "hello": {
        "swahili": "Jambo / Habari",
        "isizulu": "Sawubona / Sanibonani",
        "hausa": "Sannu",
        "yoruba": "Báwo ni",
        "amharic": "ሰላም (Salam)"
    },
    "thank_you": {
        "swahili": "Asante",
        "isizulu": "Ngiyabonga",
        "hausa": "Na gode",
        "yoruba": "Ẹ ṣeun",
        "amharic": "አመሰግናለሁ (Amäsägənallähu)"
    },
    "yes": {
        "swahili": "Ndiyo",
        "isizulu": "Yebo",
        "hausa": "To",
        "yoruba": "Bẹẹni",
        "amharic": "አዎ (Awo)"
    },
    "no": {
        "swahili": "Hapana",
        "isizulu": "Cha",
        "hausa": "A'a",
        "yoruba": "Rárá",
        "amharic": "አይ (Ay)"
    },
    "please": {
        "swahili": "Tafadhali",
        "isizulu": "Ngiyacela",
        "hausa": "Don Allah",
        "yoruba": "Ẹ jọ̀ọ́",
        "amharic": "እባክህ / እባክሽ (Ǝbakəh / Ǝbakəš)"
    },
    "sorry": {
        "swahili": "Samahani",
        "isizulu": "Ngiyaxolisa",
        "hausa": "Yi hak'uri",
        "yoruba": "Ẹ má bínú",
        "amharic": "ይቅርታ (Yiq̇ərta)"
    },
    "goodbye": {
        "swahili": "Kwa heri",
        "isizulu": "Hamba kahle / Sala kahle",
        "hausa": "Sai da gobe",
        "yoruba": "Ó dàbọ̀",
        "amharic": "ደህና ሁን / ሁኚ (Dähna hun / huni)"
    },
    "how_are_you": {
        "swahili": "Habari gani / Habari yako?",
        "isizulu": "Unjani?",
        "hausa": "Yaya kake / kike?",
        "yoruba": "Báwo ni?",
        "amharic": "እንደምን ነህ / ነሽ? (Indämən näh / nəš?)"
    },
    "i_am_fine": {
        "swahili": "Nzuri / Nzuri sana",
        "isizulu": "Ngiyaphila",
        "hausa": "Ina lafiya / Lafiya lau",
        "yoruba": "Dáadáa ni",
        "amharic": "ጥሩ ነኝ (Ṭəru n äñ)"
    },
    "my_name_is": {
        "swahili": "Ninaitwa...",
        "isizulu": "Igama lami ngu...",
        "hausa": "Suna na...",
        "yoruba": "Orúkọ mi ni...",
        "amharic": "ስሜ... ነው (Səmē... naw)"
    },
    "what_is_your_name": {
        "swahili": "Jina lako nani?",
        "isizulu": "Ungubani igama lakho?",
        "hausa": "Menene sunanka?",
        "yoruba": "Kí ni orúkọ rẹ?",
        "amharic": "ስምህ / ስምሽ ማን ነው? (Səməh / Səməš man naw?)"
    },
    "welcome": {
        "swahili": "Karibu",
        "isizulu": "Uyamukelwa",
        "hausa": "Maraba da zuwa",
        "yoruba": "Ẹ kú abẹ́wò",
        "amharic": "እንኳን ደህና መጣህ (Ǝnkwan dähna mäṭah)"
    },
    "i_love_you": {
        "swahili": "Nakupenda",
        "isizulu": "Ngiyakuthanda",
        "hausa": "Ina son ka / ki",
        "yoruba": "Mo nífẹ̀ẹ́ rẹ",
        "amharic": "አፍቅርሃለሁ (Afəq̇ərəhallähu)"
    },
    "water": {
        "swahili": "Maji",
        "isizulu": "Amanzi",
        "hausa": "Ruwa",
        "yoruba": "Omi",
        "amharic": "ውሃ (Wəha)"
    },
    "food": {
        "swahili": "Chakula",
        "isizulu": "Ukudla",
        "hausa": "Abinci",
        "yoruba": "Oúnjẹ",
        "amharic": "ምግብ (Məgbə)"
    },
    "mother": {
        "swahili": "Mama",
        "isizulu": "Umama",
        "hausa": "Uwa",
        "yoruba": "Ìyá",
        "amharic": "እናት (Ǝnat)"
    },
    "father": {
        "swahili": "Baba",
        "isizulu": "Ubaba",
        "hausa": "Uba",
        "yoruba": "Bàbá",
        "amharic": "አባት (Abat)"
    },
    "friend": {
        "swahili": "Rafiki",
        "isizulu": "Umngane",
        "hausa": "Aboki",
        "yoruba": "Ọ̀rẹ́",
        "amharic": "ወዳጅ (Wädaǧ)"
    },
    "good_morning": {
        "swahili": "Habari za asubuhi",
        "isizulu": "Sawubona",
        "hausa": "Sannu da safe",
        "yoruba": "Ẹ kú àárọ̀",
        "amharic": "እንደምን አደርክ / አደርሽ"
    },
    "good_night": {
        "swahili": "Lala salama",
        "isizulu": "Lala kahle",
        "hausa": "Barka da dare",
        "yoruba": "Ọ̀dàárọ̀",
        "amharic": "ደህና እደር / እደሪ"
    }
}


# =============================================================================
# SAMPLE SENTENCES WITH TRANSLATIONS
# =============================================================================

SAMPLE_SENTENCES: Dict[str, List[Dict[str, str]]] = {
    "swahili": [
        {
            "swahili": "Jambo, habari yako?",
            "english": "Hello, how are you?",
            "literal": "Hello, your news?",
            "context": "Casual greeting between friends"
        },
        {
            "swahili": "Asante sana kwa msaada wako.",
            "english": "Thank you very much for your help.",
            "literal": "Thanks very for help your.",
            "context": "Expressing deep gratitude"
        },
        {
            "swahili": "Ninaitwa Amina na ninatoka Kenya.",
            "english": "My name is Amina and I am from Kenya.",
            "literal": "I am called Amina and I come from Kenya.",
            "context": "Self-introduction"
        },
        {
            "swahili": "Tafadhali, unaweza kunisaidia?",
            "english": "Please, can you help me?",
            "literal": "Please, you can to-help me?",
            "context": "Polite request for assistance"
        },
        {
            "swahili": "Karibu nyumbani kwangu.",
            "english": "Welcome to my home.",
            "literal": "Welcome home to-my-place.",
            "context": "Hospitality invitation"
        },
        {
            "swahili": "Ninapenda kupiga picha za wanyama porini.",
            "english": "I love taking photos of wild animals.",
            "literal": "I like to-hit pictures of animals in-the-wild.",
            "context": "Talking about hobbies"
        },
        {
            "swahili": "Chakula kimeiva. Karibu ule.",
            "english": "The food is ready. Please come eat.",
            "literal": "Food it-is-cooked. Welcome eat.",
            "context": "Offering food to a guest"
        },
        {
            "swahili": "Tutaonana kesho shuleni.",
            "english": "We will see each other tomorrow at school.",
            "literal": "We-will-see-each-other tomorrow at-school.",
            "context": "Saying goodbye, planning to meet"
        },
        {
            "swahili": "Pole kwa msiba ulioupata.",
            "english": "Sorry for the loss you have suffered.",
            "literal": "Slowly/sympathy for bereavement you-have-received.",
            "context": "Expressing condolences"
        },
        {
            "swahili": "Hakuna matata, tutafanya kazi pamoja.",
            "english": "No problem, we will work together.",
            "literal": "No problems, we-will-do work together.",
            "context": "Reassuring someone"
        }
    ],

    "isizulu": [
        {
            "isizulu": "Sawubona, Unjani namuhla?",
            "english": "Hello, how are you today?",
            "literal": "I see you, how are you today?",
            "context": "Standard Zulu greeting"
        },
        {
            "isizulu": "Ngiyabonga kakhulu ngosizo lwakho.",
            "english": "Thank you very much for your help.",
            "literal": "I thank very for help your.",
            "context": "Expressing gratitude"
        },
        {
            "isizulu": "Igama lami nguThabo, ngiphila kahle.",
            "english": "My name is Thabo, I am doing well.",
            "literal": "Name my is Thabo, I am well well.",
            "context": "Introduction with wellness"
        },
        {
            "isizulu": "Ngiyaxolisa, ngicela ukubuza umbuzo.",
            "english": "Excuse me, I would like to ask a question.",
            "literal": "I am sorry, I ask to ask a question.",
            "context": "Politely getting attention"
        },
        {
            "isizulu": "Uma ungathanda, ungakwazi ukungisiza.",
            "english": "If you would like, you can help me.",
            "literal": "If you would-like, you can to-help me.",
            "context": "Requesting help politely"
        },
        {
            "isizulu": "IsiZulu silukhuni ukufunda, kodwa siyathanda.",
            "english": "Zulu is difficult to learn, but we love it.",
            "literal": "Language Zulu it-is-hard to-learn, but we-love-it.",
            "context": "Talking about learning the language"
        },
        {
            "isizulu": "Umjikelezo waseNingizimu Afrika unenhlangano enkulu.",
            "english": "South Africa's rugby team has great unity.",
            "literal": "Team of-South Africa it-has unity big.",
            "context": "Talking about sports"
        },
        {
            "isizulu": "Lala kahle, uzobonwa kusasa.",
            "english": "Sleep well, you will be seen tomorrow.",
            "literal": "Sleep well, you-will-be-seen tomorrow.",
            "context": "Saying goodnight"
        },
        {
            "isizulu": "Ubuntu ngumuntu ngabanye abantu.",
            "english": "A person is a person through other people / I am because we are.",
            "literal": "Humanity is-person through-other people.",
            "context": "Expressing the philosophy of ubuntu"
        },
        {
            "isizulu": "Siyabonga kakhulu, siyabahlonipha abadala.",
            "english": "We thank very much, we respect the elders.",
            "literal": "We-thank very, we-respect the-elders.",
            "context": "Showing cultural respect"
        }
    ],

    "hausa": [
        {
            "hausa": "Sannu, yaya kake yau?",
            "english": "Hello, how are you today?",
            "literal": "Greetings, how are-you today?",
            "context": "Casual greeting"
        },
        {
            "hausa": "Na gode sosai, Allah ya ba ka lafiya.",
            "english": "Thank you very much, may God give you health.",
            "literal": "I thank very, God may give you health.",
            "context": "Expressing gratitude with blessing"
        },
        {
            "hausa": "Suna na Amina ce, ina zaune a Kano.",
            "english": "My name is Amina, I live in Kano.",
            "literal": "Name my Amina is, I live in Kano.",
            "context": "Self-introduction"
        },
        {
            "hausa": "Don Allah, zaka iya taimakona?",
            "english": "Please, can you help me?",
            "literal": "For God, you-can able to-help-me?",
            "context": "Polite request"
        },
        {
            "hausa": "Barka da zuwa gidana. Ka zauna lafiya.",
            "english": "Welcome to my home. Sit in peace.",
            "literal": "Blessings of arrival my-house. You sit health.",
            "context": "Welcoming a guest"
        },
        {
            "hausa": "Ina son karatu da kuma koyon harsuna.",
            "english": "I love reading and learning languages.",
            "literal": "I like reading and also learning languages.",
            "context": "Talking about hobbies"
        },
        {
            "hausa": "Yanayi yana da kyau a yau.",
            "english": "The weather is nice today.",
            "literal": "Weather it-is with goodness today.",
            "context": "Casual conversation"
        },
        {
            "hausa": "Sai da gobe, Allah ya kare ka.",
            "english": "Until tomorrow, may God protect you.",
            "literal": "Until tomorrow, God may protect you.",
            "context": "Saying goodbye with blessing"
        },
        {
            "hausa": "Ba komai, mun gode da irin wannan taimakon.",
            "english": "No problem, we thank for this kind of help.",
            "literal": "No anything, we thanked for kind this help.",
            "context": "Dismissing thanks"
        },
        {
            "hausa": "Harshen Hausa yana da daraja sosai a Yammacin Afrika.",
            "english": "The Hausa language has great importance in West Africa.",
            "literal": "Language Hausa it-has importance very in West Africa.",
            "context": "Discussing language significance"
        }
    ],

    "yoruba": [
        {
            "yoruba": "Báwo ni, ṣe àlàáfíà ni?",
            "english": "How are you, is it peace?",
            "literal": "How is-it, is peace it?",
            "context": "Traditional Yoruba greeting"
        },
        {
            "yoruba": "Ẹ ṣeun pupọ̀, Ọlọ́run yóò dáàbò bo ọ.",
            "english": "Thank you very much, God will protect you.",
            "literal": "You thank much, God will shield cover you.",
            "context": "Gratitude with blessing"
        },
        {
            "yoruba": "Orúkọ mi ni Olúwaseun, mo ti ìlú Ìbàdàn wá.",
            "english": "My name is Oluwaseun, I come from the city of Ibadan.",
            "literal": "Name my is Oluwaseun, I from city Ibadan come.",
            "context": "Self-introduction"
        },
        {
            "yoruba": "Ẹ jọ̀ọ́, ṣé ẹ lè ràn mí lọ́wọ́?",
            "english": "Please, can you help me?",
            "literal": "You please, can you able run me help?",
            "context": "Polite request"
        },
        {
            "yoruba": "Ẹ kú àbẹ́wò sí ilé mi. Jọ̀ọ́ ẹ jókòó.",
            "english": "Welcome to my home. Please sit down.",
            "literal": "Greeting of arrival to house my. Please you sit.",
            "context": "Welcoming a guest"
        },
        {
            "yoruba": "Mo fẹ́ràn kíkà àti kíkọ́ èdè mìíràn.",
            "english": "I love reading and learning other languages.",
            "literal": "I love reading and learning languages other.",
            "context": "Talking about hobbies"
        },
        {
            "yoruba": "Ọjọ́ òní dára pupọ̀.",
            "english": "Today's weather is very good.",
            "literal": "Day today good very.",
            "context": "Casual conversation"
        },
        {
            "yoruba": "Ó dàbọ̀, a ó rí ara wa.",
            "english": "Goodbye, we will see ourselves.",
            "literal": "It turns-back, we shall see selves our.",
            "context": "Farewell"
        },
        {
            "yoruba": "Èdè Yorùbá jẹ́ ohun ìní àwa Yorùbá.",
            "english": "The Yoruba language is the heritage of we Yoruba people.",
            "literal": "Language Yoruba is thing heritage we Yoruba.",
            "context": "Cultural pride statement"
        },
        {
            "yoruba": "Àgbáyé ni ilé, àwọn ènìyàn ni ìwé.",
            "english": "The world is a house, people are the books.",
            "literal": "World is house, people are books.",
            "context": "Yoruba proverb about learning from people"
        }
    ],

    "amharic": [
        {
            "amharic": "ሰላም፣ እንደምን ነህ? (Salam, Indämən näh?)",
            "english": "Hello, how are you?",
            "literal": "Peace, how are-you?",
            "context": "Standard greeting"
        },
        {
            "amharic": "በጣም አመሰግናለሁ፣ እግዚአብሔር ይባርክህ። (Bəṭam amäsägənallähu, Ǝgziabhēr yəbarəkəh.)",
            "english": "Thank you very much, God bless you.",
            "literal": "Very I-thank, God may-bless-you.",
            "context": "Deep gratitude with blessing"
        },
        {
            "amharic": "ስሜ ሀና ነው፣ ከኢትዮጵያ ነኝ። (Səmē Hana naw, käƏtəropəya näñ.)",
            "english": "My name is Hana, I am from Ethiopia.",
            "literal": "Name-my Hana is, from-Ethiopia I-am.",
            "context": "Self-introduction"
        },
        {
            "amharic": "እባክህ፣ መርዳት ትችላለህ? (Ǝbakəh, märədät təčəlalläh?)",
            "english": "Please, can you help?",
            "literal": "Please-I-beg-you, to-help you-are-able?",
            "context": "Polite request"
        },
        {
            "amharic": "እንኳን ደህና መጣህ፣ እባክህ ተቀመጥ። (Ǝnkwan dähna mäṭah, Ǝbakəh täqämaṭ.)",
            "english": "Welcome, please sit.",
            "literal": "Congratulations well you-came, please sit.",
            "context": "Welcoming a guest"
        },
        {
            "amharic": "አዲስ አበባ ውብ ከተማ ናት። (Addis Ababa wəb kätäma nat.)",
            "english": "Addis Ababa is a beautiful city.",
            "literal": "Addis Ababa beautiful city she-is.",
            "context": "Talking about the capital"
        },
        {
            "amharic": "ቡና የኢትዮጵያ ልዩ ጣዕም አለው። (Buna yäƏtəropəya ləyu ṭaʿəm alläw.)",
            "english": "Coffee has a special taste from Ethiopia.",
            "literal": "Coffee of-Ethiopia special taste it-has.",
            "context": "Talking about Ethiopian coffee"
        },
        {
            "amharic": "ደህና ሁን፣ በኋላ እንገናኝ። (Dähna hun, Bäẖ_wala Ǝngänañ.)",
            "english": "Be well, see you later.",
            "literal": "Wellness be, after we-will-meet.",
            "context": "Saying goodbye"
        },
        {
            "amharic": "አማርኛ መማር ጥሩ ነገር ነው። (Amarəñña mämär ṭəru nägär naw.)",
            "english": "Learning Amharic is a good thing.",
            "literal": "Amharic to-learn good thing it-is.",
            "context": "Talking about language learning"
        },
        {
            "amharic": "ኢትዮጵያ ብሔራዊ ቋንቋዎች ያሏት አገር ናት። (Ətəropəya bəḥerawi qʷanqʷačč yallät aṅär nat.)",
            "english": "Ethiopia is a country that has national languages.",
            "literal": "Ethiopia national languages that-has country she-is.",
            "context": "Discussing Ethiopian languages"
        }
    ]
}


# =============================================================================
# LANGUAGE LEARNING PATHS
# =============================================================================

LEARNING_PATHS: Dict[str, Dict[str, Any]] = {
    "swahili": {
        "difficulty": "Beginner-friendly",
        "estimated_hours_to_conversational": "200-300",
        "estimated_hours_to_fluent": "600-900",
        "easiest_aspects": [
            "No grammatical gender",
            "No tone system",
            "Phonetic spelling (read as written)",
            "Regular verb conjugation"
        ],
        "hardest_aspects": [
            "Noun class system (15+ classes)",
            "Agreement system across noun classes",
            "Verb derivation system"
        ],
        "recommended_start": "Learn greetings first, then basic noun class patterns",
        "learning_stages": [
            {"stage": 1, "focus": "Greetings, basic phrases, numbers", "weeks": "1-2"},
            {"stage": 2, "focus": "Noun classes, present tense verbs", "weeks": "3-6"},
            {"stage": 3, "focus": "Past/future tenses, question formation", "weeks": "7-12"},
            {"stage": 4, "focus": "Complex sentences, idioms, cultural expressions", "weeks": "13-24"}
        ]
    },
    "isizulu": {
        "difficulty": "Intermediate",
        "estimated_hours_to_conversational": "300-450",
        "estimated_hours_to_fluent": "800-1200",
        "easiest_aspects": [
            "Regular verb patterns",
            "No grammatical gender for objects",
            "Logical noun class system"
        ],
        "hardest_aspects": [
            "Click sounds (c, q, x) — must master these",
            "Noun class agreement system",
            "Tone system changes word meaning"
        ],
        "recommended_start": "Master the three click sounds first, then basic greetings",
        "learning_stages": [
            {"stage": 1, "focus": "Click sounds, basic greetings, pronunciation", "weeks": "1-3"},
            {"stage": 2, "focus": "Noun classes, basic verb conjugation", "weeks": "4-8"},
            {"stage": 3, "focus": "Tone patterns, complex sentences", "weeks": "9-16"},
            {"stage": 4, "focus": "Advanced grammar, idioms, ubuntu philosophy", "weeks": "17-30"}
        ]
    },
    "hausa": {
        "difficulty": "Intermediate",
        "estimated_hours_to_conversational": "250-400",
        "estimated_hours_to_fluent": "700-1000",
        "easiest_aspects": [
            "No grammatical gender",
            "Relatively simple verb structure",
            "Widely used across West Africa"
        ],
        "hardest_aspects": [
            "Implosive consonants (ɓ, ɗ)",
            "Ejective consonants (ƙ, ƴ)",
            "Tone system",
            "Complex plural formation"
        ],
        "recommended_start": "Practice the implosive and ejective sounds, learn basic greetings",
        "learning_stages": [
            {"stage": 1, "focus": "Special consonants, greetings, numbers", "weeks": "1-3"},
            {"stage": 2, "focus": "Tone patterns, basic sentence structure", "weeks": "4-8"},
            {"stage": 3, "focus": "Verb aspects, plural patterns", "weeks": "9-14"},
            {"stage": 4, "focus": "Complex grammar, proverbs, formal speech", "weeks": "15-26"}
        ]
    },
    "yoruba": {
        "difficulty": "Intermediate",
        "estimated_hours_to_conversational": "300-450",
        "estimated_hours_to_fluent": "800-1100",
        "easiest_aspects": [
            "Simple syllable structure",
            "No consonant clusters (mostly)",
            "Regular spelling once tones are learned"
        ],
        "hardest_aspects": [
            "Three-tone system (high, mid, low) — essential for meaning",
            "Vowel harmony rules",
            "Nasal vowels",
            "Tonal downstep patterns"
        ],
        "recommended_start": "Master the three tones first — they change word meaning",
        "learning_stages": [
            {"stage": 1, "focus": "Tone system, basic pronunciation, greetings", "weeks": "1-3"},
            {"stage": 2, "focus": "Vowel harmony, basic grammar", "weeks": "4-8"},
            {"stage": 3, "focus": "Verb constructions, serial verbs", "weeks": "9-14"},
            {"stage": 4, "focus": "Advanced tones, poetry, proverbs", "weeks": "15-28"}
        ]
    },
    "amharic": {
        "difficulty": "Advanced",
        "estimated_hours_to_conversational": "400-600",
        "estimated_hours_to_fluent": "1000-1500",
        "easiest_aspects": [
            "No tone system",
            "Phonetic once script is learned",
            "Rich literary tradition with resources"
        ],
        "hardest_aspects": [
            "Ge'ez script (Fidel) — 200+ characters to learn",
            "Complex verb conjugation patterns",
            "Ejective consonants",
            "SOV word order (unusual for English speakers)"
        ],
        "recommended_start": "Learn the Ge'ez script thoroughly before moving to grammar",
        "learning_stages": [
            {"stage": 1, "focus": "Ge'ez script reading and writing", "weeks": "1-4"},
            {"stage": 2, "focus": "Basic pronunciation, greetings, simple sentences", "weeks": "5-10"},
            {"stage": 3, "focus": "Verb conjugation, noun gender, case marking", "weeks": "11-18"},
            {"stage": 4, "focus": "Complex grammar, formal register, literature", "weeks": "19-35"}
        ]
    }
}


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "LANGUAGES",
    "TRANSLATION_PAIRS",
    "SAMPLE_SENTENCES",
    "LEARNING_PATHS",
]