"""
Wisdom Engine — Cultural proverbs, quotes, and wisdom from traditions worldwide.

Provides curated collections of proverbs from 17+ cultural traditions,
with translations, meanings, and source attributions. Supports
random selection, tradition filtering, and thematic exploration.

Usage:
    engine = WisdomEngine()
    result = engine.get_wisdom(tradition="yoruba")
    traditions = engine.list_traditions()
"""

from __future__ import annotations

import random
from typing import Any


# ── Proverb database ──────────────────────────────────────────────────────

_PROVERBS: dict[str, list[dict[str, str]]] = {
    "zulu": [
        {
            "proverb": "Umuntu ngumuntu ngabantu",
            "translation": "A person is a person because of other people.",
            "meaning": "Our humanity is defined by our relationships and community.",
            "source": "Traditional Zulu oral tradition",
        },
        {
            "proverb": "Indlela ibuzwa kwabaphambili",
            "translation": "The path is asked about from those who have gone before.",
            "meaning": "Seek guidance from elders and those with experience.",
            "source": "Traditional Zulu oral tradition",
        },
        {
            "proverb": "Akulahlwa mbeleko ngakufelwa",
            "translation": "The carrying-skin is not thrown away because of a miscarriage.",
            "meaning": "Do not abandon your methods because of a single failure.",
            "source": "Traditional Zulu oral tradition",
        },
        {
            "proverb": "Inhlanhla ayiphakelwa",
            "translation": "Luck is not served on a plate.",
            "meaning": "Good fortune requires effort and action on your part.",
            "source": "Traditional Zulu oral tradition",
        },
        {
            "proverb": "Isiqalo esisha sivame ukuba nobunzima",
            "translation": "A new beginning often has difficulty.",
            "meaning": "Starting something new is always challenging — persevere.",
            "source": "Traditional Zulu oral tradition",
        },
        {
            "proverb": "Umntwana ongakhuliyo wesinye isele",
            "translation": "The child who does not grow belongs to another creature.",
            "meaning": "A child's character reflects their upbringing and community.",
            "source": "Traditional Zulu oral tradition",
        },
    ],
    "xhosa": [
        {
            "proverb": "Umntu ngumntu ngabantu",
            "translation": "A person is a person through other persons.",
            "meaning": "Ubuntu — we become fully human through our relationships.",
            "source": "Traditional Xhosa oral tradition",
        },
        {
            "proverb": "Ingcibi yakuba ngokwakhe ifa kwelakowayo",
            "translation": "A diviner who persists in her own way falls into a pit.",
            "meaning": "Stubborn refusal to listen to advice leads to trouble.",
            "source": "Traditional Xhosa oral tradition",
        },
        {
            "proverb": "Amathambo akahlanjululwa",
            "translation": "Bones are not swept away.",
            "meaning": "The deeds of ancestors remain and affect the living.",
            "source": "Traditional Xhosa oral tradition",
        },
        {
            "proverb": "Iqaqa aliziva kunuka",
            "translation": "The skunk does not smell its own stink.",
            "meaning": "People often fail to recognize their own faults.",
            "source": "Traditional Xhosa oral tradition",
        },
        {
            "proverb": "Ukusoka akulahlwa",
            "translation": "A gift is not thrown away.",
            "meaning": "Be grateful for what you receive; do not despise gifts.",
            "source": "Traditional Xhosa oral tradition",
        },
    ],
    "yoruba": [
        {
            "proverb": "Ibi tí à ńlọ là ńwò, a kì í wo ibi tí a ti ń bọ̀",
            "translation": "One looks to where one is going, not where one is coming from.",
            "meaning": "Focus on the future rather than dwelling on the past.",
            "source": "Traditional Yoruba oral tradition",
        },
        {
            "proverb": "Ẹni tí a ńwà kì í sina",
            "translation": "The person being searched for does not get lost.",
            "meaning": "If you persist in seeking something, you will find it.",
            "source": "Traditional Yoruba oral tradition",
        },
        {
            "proverb": "Àgbàlagbà jẹ ẹ̀wọ̀n ọ̀dọ́; bí àgbàlagbà bá lójú àánú, yóò tú ẹni náà sílẹ̀",
            "translation": "Elders hold the keys to the prison of youth; if merciful, they will release you.",
            "meaning": "Elders have authority and wisdom; their guidance frees the young.",
            "source": "Traditional Yoruba oral tradition",
        },
        {
            "proverb": "Bí o ṣe pẹ́ tí o ńṣe àgbàádá, bẹ́ẹ̀ ni àgbàádá á rìn lọ́wọ rẹ",
            "translation": "However long it takes you to forge a machete, so will it serve your hand.",
            "meaning": "The effort you put into something determines the quality of its results.",
            "source": "Traditional Yoruba oral tradition",
        },
        {
            "proverb": "Ìkọ̀kọ̀ ò gba ìmú, ìmú ló gba ìkọ̀kọ̀",
            "translation": "The elbow does not capture the fist; the fist captures the elbow.",
            "meaning": "Understand the proper order and hierarchy of things.",
            "source": "Traditional Yoruba oral tradition",
        },
        {
            "proverb": "A kì í dájú odò láti ìhín òde",
            "translation": "You do not judge a river from its mouth.",
            "meaning": "Do not judge things by their outward appearance alone.",
            "source": "Traditional Yoruba oral tradition",
        },
    ],
    "swahili": [
        {
            "proverb": "Haraka haraka haina baraka",
            "translation": "Hurry hurry has no blessing.",
            "meaning": "Rushing leads to mistakes; patience brings better results.",
            "source": "Swahili coastal tradition",
        },
        {
            "proverb": "Samaki mkunje angali mbichi",
            "translation": "Bend the fish while it is still fresh.",
            "meaning": "Shape character while young; correction is harder later.",
            "source": "Swahili coastal tradition",
        },
        {
            "proverb": "Mgeni siku mbili, siku ya tatu mpe jembe",
            "translation": "A guest for two days; on the third day give him a hoe.",
            "meaning": "Hospitality has limits; everyone should contribute.",
            "source": "Swahili coastal tradition",
        },
        {
            "proverb": "Kila mwamba ngoma, ngoma huimba",
            "translation": "Every drum has its own song.",
            "meaning": "Everyone has their unique contribution and voice.",
            "source": "Swahili coastal tradition",
        },
        {
            "proverb": "Asiyefunzwa na mamaye, hufunzwa na ulimwengu",
            "translation": "What is not taught by the mother will be taught by the world.",
            "meaning": "Lessons missed at home are learned through harder experiences.",
            "source": "Swahili coastal tradition",
        },
    ],
    "akan": [
        {
            "proverb": "Nyansa bun mu ne wan a obi nnya no firii ne nkyen",
            "translation": "Wisdom is not a product of schooling but of lifelong attempt to acquire it.",
            "meaning": "True wisdom comes from continuous learning, not just formal education.",
            "source": "Akan (Ghana) oral tradition",
        },
        {
            "proverb": "Aboa bi beka wo a, ne ofiri wo ntoma mu",
            "translation": "If an animal will bite you, it will be from your own cloth.",
            "meaning": "Betrayal often comes from those closest to you.",
            "source": "Akan (Ghana) oral tradition",
        },
        {
            "proverb": "Tikro nko agyina",
            "translation": "One tree cannot make a forest.",
            "meaning": "Community and cooperation are essential for success.",
            "source": "Akan (Ghana) oral tradition",
        },
        {
            "proverb": "Obi nnim obrempon ahyease",
            "translation": "No one knows the beginning of a great man.",
            "meaning": "Greatness has humble origins; do not underestimate anyone.",
            "source": "Akan (Ghana) oral tradition",
        },
        {
            "proverb": "Ahwene pa nkasa",
            "translation": "Good beads do not speak.",
            "meaning": "True quality speaks for itself without boasting.",
            "source": "Akan (Ghana) oral tradition",
        },
    ],
    "confucian": [
        {
            "proverb": "学而不思则罔，思而不学则殆",
            "translation": "Learning without thought is labor lost; thought without learning is perilous.",
            "meaning": "Study and reflection must go hand in hand for true understanding.",
            "source": "The Analects, Confucius",
        },
        {
            "proverb": "己所不欲，勿施于人",
            "translation": "Do not do to others what you would not want done to yourself.",
            "meaning": "The Golden Rule — empathy is the foundation of ethical behavior.",
            "source": "The Analects, Confucius",
        },
        {
            "proverb": "知之者不如好之者，好之者不如乐之者",
            "translation": "Those who know are not as good as those who love; those who love are not as good as those who delight.",
            "meaning": "Passion and joy in learning surpass mere knowledge.",
            "source": "The Analects, Confucius",
        },
        {
            "proverb": "不患人之不己知，患不知人也",
            "translation": "I will not be afflicted at others not knowing me; I will be afflicted that I do not know others.",
            "meaning": "Seek to understand others rather than worrying about being understood.",
            "source": "The Analects, Confucius",
        },
        {
            "proverb": "三人行，必有我师焉",
            "translation": "When three walk together, there must be one who can be my teacher.",
            "meaning": "Everyone has something to teach you; stay humble and observant.",
            "source": "The Analects, Confucius",
        },
    ],
    "buddhist": [
        {
            "proverb": "千年の功を一夜にして崩す",
            "translation": "A thousand years of merit can be destroyed in one night.",
            "meaning": "Virtue takes time to build but can be quickly lost through negligence.",
            "source": "Buddhist teaching",
        },
        {
            "proverb": "振り返るな、振り返れば尸がある",
            "translation": "Do not look back; if you look back, there are corpses.",
            "meaning": "Dwelling on past mistakes prevents progress; focus on the present path.",
            "source": "Buddhist teaching",
        },
        {
            "proverb": "滴水の石を穿つ",
            "translation": "Dripping water pierces stone.",
            "meaning": "Consistent small efforts achieve what force cannot.",
            "source": "Buddhist teaching",
        },
        {
            "proverb": "過去を憂えず、未来を恐れず、現在を生きる",
            "translation": "Do not grieve the past, fear not the future, live in the present.",
            "meaning": "Mindfulness and presence are the keys to peace.",
            "source": "Buddhist teaching",
        },
        {
            "proverb": "七転び八起き",
            "translation": "Fall seven times, rise eight.",
            "meaning": "Resilience is defined by rising one more time than you fall.",
            "source": "Buddhist teaching",
        },
    ],
    "tao": [
        {
            "proverb": "千里之行，始于足下",
            "translation": "A journey of a thousand miles begins with a single step.",
            "meaning": "Every great achievement starts with a small beginning.",
            "source": "Tao Te Ching, Lao Tzu, Chapter 64",
        },
        {
            "proverb": "上善若水",
            "translation": "The highest good is like water.",
            "meaning": "Be adaptable, humble, and nourishing like water that flows to the lowest places.",
            "source": "Tao Te Ching, Lao Tzu, Chapter 8",
        },
        {
            "proverb": "知人者智，自知者明",
            "translation": "Knowing others is wisdom; knowing yourself is enlightenment.",
            "meaning": "Self-knowledge is the highest form of understanding.",
            "source": "Tao Te Ching, Lao Tzu, Chapter 33",
        },
        {
            "proverb": "祸兮福之所倚，福兮祸之所伏",
            "translation": "Misfortune is the foundation of fortune; fortune is the hiding place of misfortune.",
            "meaning": "Good and bad fortune are intertwined; adversity contains seeds of opportunity.",
            "source": "Tao Te Ching, Lao Tzu, Chapter 58",
        },
        {
            "proverb": "道可道，非常道",
            "translation": "The Tao that can be told is not the eternal Tao.",
            "meaning": "The deepest truths transcend words and must be experienced directly.",
            "source": "Tao Te Ching, Lao Tzu, Chapter 1",
        },
    ],
    "greek": [
        {
            "proverb": "Γνῶθι σεαυτόν",
            "translation": "Know thyself.",
            "meaning": "Self-examination is the foundation of wisdom.",
            "source": "Inscribed at the Temple of Apollo, Delphi",
        },
        {
            "proverb": "Μηδὲν ἄγαν",
            "translation": "Nothing in excess.",
            "meaning": "Moderation in all things leads to the good life.",
            "source": "Inscribed at the Temple of Apollo, Delphi",
        },
        {
            "proverb": "Ἐν οἴνῳ ἀλήθεια",
            "translation": "In wine there is truth.",
            "meaning": "People reveal their true nature when their guard is down.",
            "source": "Traditional Greek proverb",
        },
        {
            "proverb": "Ὁ βίος βραχύς, ἡ δὲ τέχνη μακρή",
            "translation": "Life is short, art is long.",
            "meaning": "The craft takes a lifetime to master; use your time wisely.",
            "source": "Hippocrates",
        },
        {
            "proverb": "Πάντα ῥεῖ",
            "translation": "Everything flows.",
            "meaning": "Change is the only constant; adapt and embrace impermanence.",
            "source": "Heraclitus",
        },
    ],
    "roman": [
        {
            "proverb": "Mens sana in corpore sano",
            "translation": "A sound mind in a sound body.",
            "meaning": "Physical and mental health are inseparable.",
            "source": "Juvenal, Satire X",
        },
        {
            "proverb": "Carpe diem",
            "translation": "Seize the day.",
            "meaning": "Make the most of the present moment; do not defer your dreams.",
            "source": "Horace, Odes",
        },
        {
            "proverb": "Per aspera ad astra",
            "translation": "Through hardships to the stars.",
            "meaning": "Great achievements require enduring difficulty.",
            "source": "Traditional Latin proverb",
        },
        {
            "proverb": "Audentes fortuna iuvat",
            "translation": "Fortune favors the bold.",
            "meaning": "Those who take risks are more likely to succeed.",
            "source": "Virgil, Aeneid",
        },
        {
            "proverb": "Veni, vidi, vici",
            "translation": "I came, I saw, I conquered.",
            "meaning": "Swift, decisive action leads to success.",
            "source": "Julius Caesar",
        },
    ],
    "celtic": [
        {
            "proverb": "Ar scáth a chéile a mhaireann na daoine",
            "translation": "It is in each other's shadow that people live.",
            "meaning": "We depend on one another for shelter and survival.",
            "source": "Irish Gaelic proverb",
        },
        {
            "proverb": "Ní neart go cur le chéile",
            "translation": "There is no strength without unity.",
            "meaning": "Collective effort is more powerful than individual action.",
            "source": "Irish Gaelic proverb",
        },
        {
            "proverb": "An té a bhíonn siúlach, bíonn scéalach",
            "translation": "He who travels has stories to tell.",
            "meaning": "Experience broadens the mind and enriches life.",
            "source": "Irish Gaelic proverb",
        },
        {
            "proverb": "Is fearr Gaeilge briste ná Béarla cliste",
            "translation": "Broken Irish is better than clever English.",
            "meaning": "Authenticity and effort matter more than polished pretense.",
            "source": "Irish Gaelic proverb",
        },
        {
            "proverb": "Tús maith leath na hoibre",
            "translation": "A good start is half the work.",
            "meaning": "Beginning well sets the foundation for success.",
            "source": "Irish Gaelic proverb",
        },
    ],
    "norse": [
        {
            "proverb": "Þrír halda því sem þrír vita",
            "translation": "Three hold what three know.",
            "meaning": "Shared knowledge strengthens bonds and security.",
            "source": "Hávamál, Poetic Edda",
        },
        {
            "proverb": "Manvit er manns gaman",
            "translation": "Wisdom is man's joy.",
            "meaning": "The pursuit of knowledge brings true happiness.",
            "source": "Hávamál, Poetic Edda",
        },
        {
            "proverb": "Deyr fé, deyja frændr, deyr sjálfr it sama",
            "translation": "Cattle die, kinsmen die, the self must also die.",
            "meaning": "All mortal things perish; only reputation endures.",
            "source": "Hávamál, Poetic Edda, Stanza 76",
        },
        {
            "proverb": "Atrúnðr er betri en óván sjálfs",
            "translation": "Better a cautious retreat than reckless advance.",
            "meaning": "Strategic withdrawal can be wiser than foolish bravery.",
            "source": "Hávamál, Poetic Edda",
        },
        {
            "proverb": "Sá er sæll sem sjálfr of á",
            "translation": "Happy is he who has himself.",
            "meaning": "Contentment comes from self-sufficiency and self-knowledge.",
            "source": "Hávamál, Poetic Edda",
        },
    ],
    "islamic": [
        {
            "proverb": "الكتاب يقرأ من عنوانه",
            "translation": "The book is read from its title.",
            "meaning": "First impressions and appearances reveal much about what is within.",
            "source": "Arabic proverb",
        },
        {
            "proverb": "من شابه أباه فما ظلم",
            "translation": "Whoever resembles his father has done no wrong.",
            "meaning": "Following the good example of elders is praiseworthy.",
            "source": "Arabic proverb",
        },
        {
            "proverb": "إنما الشكر لمن كان عند النعمة شكور",
            "translation": "Gratitude is for one who is thankful in blessing.",
            "meaning": "True gratitude is expressed through actions, not just words.",
            "source": "Islamic teaching",
        },
        {
            "proverb": "العلم نور",
            "translation": "Knowledge is light.",
            "meaning": "Education illuminates the path through darkness and ignorance.",
            "source": "Islamic teaching",
        },
        {
            "proverb": "الصبر مفتاح الفرج",
            "translation": "Patience is the key to relief.",
            "meaning": "Enduring hardship with patience leads to eventual ease.",
            "source": "Islamic teaching",
        },
    ],
    "hebrew": [
        {
            "proverb": "אִם אֵין אֲנִי לִי, מִי לִי? וּכְשֶׁאֲנִי לְעַצְמִי, מָה אֲנִי?",
            "translation": "If I am not for myself, who will be for me? And if I am only for myself, what am I?",
            "meaning": "Balance self-care with responsibility to others.",
            "source": "Pirkei Avot (Ethics of the Fathers) 1:14",
        },
        {
            "proverb": "לֹא עָלֶיךָ הַמְּלָאכָה לִגְמֹר, וְלֹא אַתָּה בֶן חוֹרִין לִבָּטֵל מִמֶּנָּה",
            "translation": "You are not obligated to complete the work, but neither are you free to abandon it.",
            "meaning": "Do your part with diligence, even if you cannot finish the whole task.",
            "source": "Pirkei Avot 2:21",
        },
        {
            "proverb": "כָּל הַמְקַנֵּא אֶת חֲבֵרוֹ מוֹתֵר לוֹ כְּאִלּוּ מְקַנֵּא אֶת אָבִיו וְאֶת אִמּוֹ",
            "translation": "Envy of a friend is as destructive as envy of one's own parents.",
            "meaning": "Jealousy destroys relationships and self-worth.",
            "source": "Pirkei Avot",
        },
        {
            "proverb": "חַיָּב אִינִישׁ לְבַסּוֹמֵי בְּפוּרָיָא",
            "translation": "A person is obligated to make their days meaningful.",
            "meaning": "Live purposefully; make each day count.",
            "source": "Talmudic teaching",
        },
        {
            "proverb": "מַחֲלוֹקֶת שֶׁהִיא לְשֵׁם שָׁמַיִם, סוֹפָהּ לְהִתְקַיֵּם",
            "translation": "An argument for the sake of heaven will endure.",
            "meaning": "Disagreements rooted in genuine pursuit of truth have lasting value.",
            "source": "Pirkei Avot 5:20",
        },
    ],
    "native_american": [
        {
            "proverb": "We do not inherit the earth from our ancestors; we borrow it from our children.",
            "translation": "We do not inherit the earth from our ancestors; we borrow it from our children.",
            "meaning": "We are stewards of the earth, responsible to future generations.",
            "source": "Lakota / Native American proverb",
        },
        {
            "proverb": "The soul would have no rainbow if the eyes had no tears.",
            "translation": "The soul would have no rainbow if the eyes had no tears.",
            "meaning": "Sorrow and joy are intertwined; suffering deepens our capacity for beauty.",
            "source": "Native American proverb",
        },
        {
            "proverb": "Tell me the facts and I'll learn. Tell me the truth and I'll believe. But tell me a story and it will live in my heart forever.",
            "translation": "Tell me the facts and I'll learn. Tell me the truth and I'll believe. But tell me a story and it will live in my heart forever.",
            "meaning": "Stories are the most powerful vehicle for learning and memory.",
            "source": "Native American proverb",
        },
        {
            "proverb": "It takes a thousand voices to tell a single story.",
            "translation": "It takes a thousand voices to tell a single story.",
            "meaning": "Every perspective contributes to the full understanding of truth.",
            "source": "Native American proverb",
        },
        {
            "proverb": "Walk lightly in the spring; Mother Earth is pregnant.",
            "translation": "Walk lightly in the spring; Mother Earth is pregnant.",
            "meaning": "Treat nature with reverence and care, especially during times of renewal.",
            "source": "Kiowa proverb",
        },
    ],
    "aboriginal": [
        {
            "proverb": "We are all visitors to this time, this place. We are just passing through.",
            "translation": "We are all visitors to this time, this place. We are just passing through.",
            "meaning": "Humility about our place in the grand scheme of existence.",
            "source": "Australian Aboriginal teaching",
        },
        {
            "proverb": "The land owns us, we do not own the land.",
            "translation": "The land owns us, we do not own the land.",
            "meaning": "We belong to the earth; it does not belong to us.",
            "source": "Australian Aboriginal teaching",
        },
        {
            "proverb": "Those who lose dreaming are lost.",
            "translation": "Those who lose dreaming are lost.",
            "meaning": "Imagination and spiritual connection give direction to life.",
            "source": "Australian Aboriginal proverb",
        },
        {
            "proverb": "Keep your eyes on the sun, and you will not see the shadows.",
            "translation": "Keep your eyes on the sun, and you will not see the shadows.",
            "meaning": "Focus on the positive and the light, and darkness loses its power.",
            "source": "Australian Aboriginal proverb",
        },
        {
            "proverb": "Every person has a place, and every place has a person.",
            "translation": "Every person has a place, and every place has a person.",
            "meaning": "Everyone has a unique role and belonging in the world.",
            "source": "Australian Aboriginal teaching",
        },
    ],
    "sanskrit": [
        {
            "proverb": "वसुधैव कुटुम्बकम्",
            "translation": "The world is one family.",
            "meaning": "All of humanity is connected as a single family.",
            "source": "Maha Upanishad",
        },
        {
            "proverb": "अतिथि देवो भव",
            "translation": "The guest is equivalent to God.",
            "meaning": "Treat all who come to you with reverence and hospitality.",
            "source": "Taittiriya Upanishad",
        },
        {
            "proverb": "योगः कर्मसु कौशलम्",
            "translation": "Yoga is skill in action.",
            "meaning": "Excellence comes from dedicated, mindful practice.",
            "source": "Bhagavad Gita 2:50",
        },
        {
            "proverb": "सत्यमेव जयते",
            "translation": "Truth alone triumphs.",
            "meaning": "No matter how long it takes, truth ultimately prevails.",
            "source": "Mundaka Upanishad",
        },
        {
            "proverb": "तमसो मा ज्योतिर्गमय",
            "translation": "Lead me from darkness to light.",
            "meaning": "Seek knowledge and enlightenment over ignorance.",
            "source": "Brihadaranyaka Upanishad",
        },
    ],
    "korean": [
        {
            "proverb": "시작이 반이다",
            "translation": "Starting is half the task.",
            "meaning": "The hardest part of any endeavor is simply beginning.",
            "source": "Korean proverb",
        },
        {
            "proverb": "가는 말이 고와야 오는 말이 곱다",
            "translation": "If the outgoing words are beautiful, the incoming words will be beautiful.",
            "meaning": "Treat others with kindness and you will receive kindness in return.",
            "source": "Korean proverb",
        },
        {
            "proverb": "금강산도 식후경",
            "translation": "Even Mount Geumgang is best seen after a meal.",
            "meaning": "Basic needs must be met before appreciating beauty or higher pursuits.",
            "source": "Korean proverb",
        },
        {
            "proverb": "개구리 올챙이 적 생각도 못 한다",
            "translation": "The frog forgets that it was once a tadpole.",
            "meaning": "Those who succeed often forget their humble beginnings.",
            "source": "Korean proverb",
        },
        {
            "proverb": "뿌린 대로 거둔다",
            "translation": "As you sow, so shall you reap.",
            "meaning": "Your actions determine your outcomes; act with intention.",
            "source": "Korean proverb",
        },
    ],
    "persian": [
        {
            "proverb": "با نیاز می‌آموزی",
            "translation": "You learn through need.",
            "meaning": "Necessity is the greatest teacher.",
            "source": "Persian proverb",
        },
        {
            "proverb": "این نیز بگذرد",
            "translation": "This too shall pass.",
            "meaning": "All things, both good and bad, are temporary; endure with patience.",
            "source": "Persian wisdom, attributed to Solomon",
        },
        {
            "proverb": "هر که بامش بیش، برفش بیشتر",
            "translation": "The larger the roof, the more snow it collects.",
            "meaning": "Greater positions carry greater responsibilities and burdens.",
            "source": "Persian proverb",
        },
        {
            "proverb": "یک دست صدا ندارد",
            "translation": "One hand has no sound.",
            "meaning": "Cooperation is necessary to accomplish meaningful things.",
            "source": "Persian proverb",
        },
        {
            "proverb": "آب از سرچشمه پاکیزه‌تر است",
            "translation": "Water is cleaner from the source.",
            "meaning": "Seek knowledge and truth from their original sources.",
            "source": "Persian proverb",
        },
    ],
}

_TRADITION_METADATA: dict[str, dict[str, str]] = {
    "zulu": {"name": "Zulu", "region": "Southern Africa", "family": "African"},
    "xhosa": {"name": "Xhosa", "region": "Southern Africa", "family": "African"},
    "yoruba": {"name": "Yoruba", "region": "West Africa", "family": "African"},
    "swahili": {"name": "Swahili", "region": "East Africa", "family": "African"},
    "akan": {"name": "Akan", "region": "West Africa", "family": "African"},
    "confucian": {"name": "Confucian", "region": "East Asia", "family": "Eastern"},
    "buddhist": {"name": "Buddhist", "region": "East Asia", "family": "Eastern"},
    "tao": {"name": "Taoist", "region": "East Asia", "family": "Eastern"},
    "greek": {"name": "Greek", "region": "Mediterranean", "family": "Western"},
    "roman": {"name": "Roman", "region": "Mediterranean", "family": "Western"},
    "celtic": {"name": "Celtic", "region": "Northwestern Europe", "family": "Western"},
    "norse": {"name": "Norse", "region": "Northern Europe", "family": "Western"},
    "islamic": {"name": "Islamic", "region": "Middle East", "family": "Middle Eastern"},
    "hebrew": {"name": "Hebrew", "region": "Middle East", "family": "Middle Eastern"},
    "native_american": {"name": "Native American", "region": "North America", "family": "Indigenous"},
    "aboriginal": {"name": "Aboriginal Australian", "region": "Oceania", "family": "Indigenous"},
    "sanskrit": {"name": "Sanskrit", "region": "South Asia", "family": "Eastern"},
    "korean": {"name": "Korean", "region": "East Asia", "family": "Eastern"},
    "persian": {"name": "Persian", "region": "Middle East", "family": "Middle Eastern"},
}


class WisdomEngine:
    """Cultural wisdom and proverbs engine with 19 traditions."""

    def __init__(self) -> None:
        self._proverbs = _PROVERBS
        self._metadata = _TRADITION_METADATA

    # ── Public API ─────────────────────────────────────────────────────────

    def get_wisdom(self, tradition: str | None = None) -> dict:
        """Get a proverb/quote from a cultural tradition.

        Args:
            tradition: Tradition key (e.g., 'yoruba', 'greek').
                       If None, selects randomly from all traditions.

        Returns:
            Dictionary with proverb, translation, meaning, tradition, and source.
        """
        if tradition is None:
            tradition = random.choice(list(self._proverbs.keys()))

        key = tradition.lower().strip()
        if key not in self._proverbs:
            # Attempt fuzzy match
            for k in self._proverbs:
                if key in k or k in key:
                    key = k
                    break
            else:
                key = "general"

        collection = self._proverbs.get(key, self._proverbs["zulu"])
        entry = random.choice(collection)
        meta = self._metadata.get(key, {"name": key.title(), "region": "Unknown", "family": "Unknown"})

        return {
            "proverb": entry["proverb"],
            "translation": entry["translation"],
            "meaning": entry["meaning"],
            "tradition": meta["name"],
            "tradition_key": key,
            "region": meta["region"],
            "family": meta["family"],
            "source": entry["source"],
        }

    def list_traditions(self) -> list[dict[str, str]]:
        """List all available traditions with metadata.

        Returns:
            List of dictionaries with key, name, region, family, and proverb_count.
        """
        result: list[dict[str, str]] = []
        for key, meta in self._metadata.items():
            if key in self._proverbs:
                result.append({
                    "key": key,
                    "name": meta["name"],
                    "region": meta["region"],
                    "family": meta["family"],
                    "proverb_count": str(len(self._proverbs[key])),
                })
        result.sort(key=lambda x: (x["family"], x["name"]))
        return result

    def get_by_theme(self, theme: str) -> list[dict]:
        """Search proverbs by theme/keyword across all traditions.

        Args:
            theme: Keyword to search for (e.g., 'patience', 'wisdom').

        Returns:
            List of matching proverb dictionaries.
        """
        matches: list[dict] = []
        theme_lower = theme.lower()
        for key, collection in self._proverbs.items():
            meta = self._metadata.get(key, {})
            for entry in collection:
                searchable = f"{entry['proverb']} {entry['meaning']} {entry['translation']}"
                if theme_lower in searchable.lower():
                    matches.append({
                        "proverb": entry["proverb"],
                        "translation": entry["translation"],
                        "meaning": entry["meaning"],
                        "tradition": meta.get("name", key),
                        "source": entry["source"],
                    })
        return matches

    def get_all_from_tradition(self, tradition: str) -> list[dict]:
        """Get all proverbs from a specific tradition.

        Args:
            tradition: Tradition key.

        Returns:
            List of all proverb dictionaries in that tradition.
        """
        key = tradition.lower().strip()
        if key not in self._proverbs:
            return []
        meta = self._metadata.get(key, {})
        return [
            {
                "proverb": e["proverb"],
                "translation": e["translation"],
                "meaning": e["meaning"],
                "tradition": meta.get("name", key),
                "source": e["source"],
            }
            for e in self._proverbs[key]
        ]

    def random_wisdom(self, count: int = 3) -> list[dict]:
        """Get multiple random proverbs from different traditions.

        Args:
            count: Number of proverbs to return (max = number of traditions).

        Returns:
            List of proverb dictionaries.
        """
        traditions = list(self._proverbs.keys())
        selected = random.sample(traditions, min(count, len(traditions)))
        return [self.get_wisdom(t) for t in selected]


# ── Module-level convenience alias ────────────────────────────────────────

ModuleName = WisdomEngine
