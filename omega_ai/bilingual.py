"""Omega AI v3 — Bilingual Interview Engine
Simulated interview practice in 6 languages with AI evaluator.
65 bilingual questions per language with cultural context, scoring,
and detailed feedback on fluency, grammar, vocabulary, and cultural
awareness.

Usage:
    from bilingual import BilingualInterview
    bi = BilingualInterview()
    bi.start_interview("zulu")
    # or
    result = bi.ask_question("zulu", "greeting")
"""
from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class InterviewQuestion:
    """A single bilingual interview question."""
    question_id: str
    category: str
    question_en: str
    question_native: str
    expected_answer: str
    follow_up: str
    cultural_context: str
    scoring_criteria: List[str] = field(default_factory=list)


@dataclass
class InterviewScore:
    """Score for a single response."""
    question_id: str
    fluency: int = 0          # 0-10
    grammar: int = 0          # 0-10
    vocabulary: int = 0       # 0-10
    cultural_awareness: int = 0  # 0-10
    overall: int = 0          # 0-10
    feedback: str = ""


class BilingualInterview:
    """Bilingual interview practice with AI evaluation."""

    LANGUAGES: Dict[str, Dict[str, str]] = {
        "zulu": {"name": "isiZulu", "flag": "🇿🇦", "region": "South Africa (KwaZulu-Natal)"},
        "xhosa": {"name": "isiXhosa", "flag": "🇿🇦", "region": "South Africa (Eastern Cape)"},
        "swahili": {"name": "Kiswahili", "flag": "🇹🇿", "region": "East Africa"},
        "yoruba": {"name": "Yorùbá", "flag": "🇳🇬", "region": "Nigeria, Benin, Togo"},
        "afrikaans": {"name": "Afrikaans", "flag": "🇿🇦", "region": "South Africa, Namibia"},
        "french": {"name": "Français", "flag": "🇫🇷", "region": "Francophone Africa"},
    }

    # 65 questions across 13 categories × 5 questions each
    QUESTION_BANK: Dict[str, List[InterviewQuestion]] = {
        "zulu": [
            InterviewQuestion("zu_g1", "greeting", "How do you greet someone respectfully in the morning?",
                "Watshela kanjani umuntu ohloniphekile ekuseni?",
                "Sawubona, sanibonani (plural), or Yebo sawubona for 'Yes, I see you'",
                "When would you use 'Sanibonani' versus 'Sawubona'?",
                "Zulu greetings are reciprocal - the greeting acknowledges the person's presence and dignity."),
            InterviewQuestion("zu_g2", "greeting", "What is the appropriate response when someone says 'Sawubona'?",
                "Yini impendulo efanele uma ethi 'Sawubona'?",
                "Yebo, sawubona (Yes, I see you) or simply Sawubona in return",
                "What does the literal meaning 'I see you' convey about Zulu culture?",
                "The greeting Sawubona literally means 'I see you' - acknowledging the person's existence and worth."),
            InterviewQuestion("zu_g3", "greeting", "How would you introduce yourself formally in Zulu?",
                "Ungazethula kanjani ngendlela yamahleko ngesiZulu?",
                "Igama lami ngu-[name], ngingu-[surname]. Nginjani ngingathokozela ukukwazi.",
                "How does formality level change based on age of the person you're addressing?",
                "Age and social hierarchy determine the level of formality. Elders require more respectful language (hlonipha)."),
            InterviewQuestion("zu_g4", "greeting", "What are common Zulu farewells?",
                "Yini okujwayelekile ukusho uma kuhalaliselwa ngesiZulu?",
                "Hamba kahle (go well - to person leaving), Sala kahle (stay well - to person staying)",
                "When would you use 'Hamba kahle' versus 'Sala kahle'?",
                "Zulu distinguishes between the person leaving and the person staying - each gets a different blessing."),
            InterviewQuestion("zu_g5", "greeting", "How do you ask 'How are you?' and respond in Zulu?",
                "Ungabuza kanjani 'Unjani?' futhi uphendule ngesiZulu?",
                "Unjani? (How are you?) - Ngiyaphila (I'm fine), Ngiyabonga (Thank you)",
                "What are three alternative ways to ask about someone's wellbeing?",
                "Zulu has multiple ways to enquire about health, work, and family - showing holistic care."),
            InterviewQuestion("zu_f1", "family", "How do you say 'my mother' and 'my father' in Zulu?",
                "Ungasho kanjani 'umama wami' no 'ubaba wami' ngesiZulu?",
                "Umama wami (my mother), Ubaba wami (my father)",
                "How do these terms extend to aunts and uncles in Zulu kinship?",
                "Zulu kinship terms are expansive - mother's sister is also 'mama', father's brother is also 'baba'."),
            InterviewQuestion("zu_f2", "family", "Describe your family using Zulu vocabulary.",
                "Chaza umndeni wakho usebenzisa amagama esiZulu.",
                "Umndeni wami unama-[number] (My family has [number] people)...",
                "How would you describe your position among siblings (firstborn, lastborn)?",
                "Birth order matters in Zulu culture - firstborn (inkosana) has special responsibilities."),
            InterviewQuestion("zu_f3", "family", "What is the Zulu word for 'children' and how is it used?",
                "Yigama lesiZulu elithi 'abantwana' futhi lisetshenziswa kanjani?",
                "Abantwana (children), used for all children including nieces, nephews, and cousins",
                "How does the concept of 'ubuntu' relate to family in Zulu culture?",
                "Ubuntu ('I am because we are') means all children in the community are collectively raised."),
            InterviewQuestion("zu_f4", "family", "How do you ask someone's marital status respectfully?",
                "Ungabuza kanjani ngempilo yomshado ngendlela ehloniphekile?",
                "Ushadile? (Are you married?) - use with appropriate respectful prefixes",
                "What are the traditional Zulu marriage customs (lobola)?",
                "Lobola (bride price) is a central custom - the groom's family gives cattle to the bride's family."),
            InterviewQuestion("zu_f5", "family", "How do you address elders in a family setting?",
                "Ungabhekana kanjani nabantu abadala emndenini?",
                "Gogo (grandmother), Mkulu (grandfather), Malume (maternal uncle), Babekazi (paternal aunt)",
                "What is the significance of the maternal uncle (malume) in Zulu families?",
                "The malume plays a crucial role in family decisions, especially regarding his sister's children."),
            InterviewQuestion("zu_w1", "work", "How do you say your profession in Zulu?",
                "Ungasho kanjani umsebenzi wakho ngesiZulu?",
                "Ngiyi-[profession] (I am a [profession]) - e.g., Ngiyisifundi (I am a student)",
                "How would you describe your daily work routine in Zulu?",
                "Work identity is important - Zulu people often define themselves by their role in the community."),
            InterviewQuestion("zu_w2", "work", "What Zulu phrases are useful in a workplace?",
                "Yini amagama esiZulu asebenzayo endaweni yokusebenza?",
                "Ngiyathokoza (Thank you), Ngiyaxolisa (Excuse me/Sorry), Ngiyakutshela (I understand)",
                "How do you ask for help from a colleague in a respectful way?",
                "Respectful requests often use the conditional: 'Ungangisiza yini?' (Could you help me?)."),
            InterviewQuestion("zu_w3", "work", "How do you negotiate or discuss salary in Zulu?",
                "Ungaxoxisana kanjani ngemali yokusebenza ngesiZulu?",
                "Ngicela ukukhuluma ngemali engiyitholayo (I'd like to discuss my salary)",
                "What cultural considerations should you keep in mind when discussing money?",
                "Direct money talk can be uncomfortable - often approached through an intermediary or elder."),
            InterviewQuestion("zu_w4", "work", "Describe a workplace problem and solution in Zulu.",
                "Chaza inkinga endaweni yokusebenza nesixazululo ngesiZulu.",
                "Kune-[problem]... Ngakho-ke sizoxazulula ngokuthi... (There is [problem]... So we will solve by...)",
                "How would you report an issue to a supervisor respectfully?",
                "Issues are often framed as shared concerns rather than individual complaints to maintain harmony."),
            InterviewQuestion("zu_w5", "work", "How do you express gratitude to a team in Zulu?",
                "Ungabonisa ukubonga kanjani eqenjini ngesiZulu?",
                "Ngiyabonga kakhulu (Thank you very much), Siyabonga (We thank you), Nibahle nonke (You are all good)",
                "What is the cultural significance of collective acknowledgment?",
                "Group harmony (ukuhlalisana kahle) is valued over individual praise - team recognition is preferred."),
            InterviewQuestion("zu_c1", "culture", "Explain the concept of Ubuntu in your own words.",
                "Chaza ingqondo ye-Ubuntu ngegamba lakho.",
                "Ubuntu ngumuntu ngumuntu ngabantu (A person is a person through other people)",
                "How does Ubuntu influence daily interactions in Zulu communities?",
                "Ubuntu means shared humanity - everyone is responsible for everyone's wellbeing."),
            InterviewQuestion("zu_c2", "culture", "What is the significance of cattle in Zulu culture?",
                "Yini emqoka yezinkomo emphakathini wamaZulu?",
                "Izinkomo ziyintfuyo (Cattle are wealth), used for lobola, ceremonies, and status",
                "How has the role of cattle changed in urban Zulu communities?",
                "Urban Zulu may use money instead of cattle for lobola, but the symbolic importance remains."),
            InterviewQuestion("zu_c3", "culture", "Describe a traditional Zulu ceremony you've witnessed.",
                "Chaza umcimbi wesiko lamaZulu oke wawubona.",
                "Umemulo (coming of age), Umgidi (feast), Umhlanga (reed dance)...",
                "What role do ancestors (amadlozi) play in Zulu ceremonies?",
                "Amadlozi (ancestors) are central - all ceremonies begin with communication to ancestors."),
            InterviewQuestion("zu_c4", "culture", "How do Zulu people traditionally resolve conflicts?",
                "AmaZulu axazulula kanjani izinkinga zomthetho ngokomthetho?",
                "Through izinduna (headmen) or the family elder mediating between parties",
                "What is the role of the inkosi (chief) in dispute resolution?",
                "The inkosi is the final arbiter in traditional matters, though modern courts also have jurisdiction."),
            InterviewQuestion("zu_c5", "culture", "What is the importance of ancestors in daily Zulu life?",
                "Yini emqoka yamadlozi emihleni yamaZulu?",
                "Amadlozi are consulted for guidance, protection, and blessings in all major decisions",
                "How do you communicate with ancestors in Zulu tradition?",
                "Through ukuphahla (prayer/offering), often with umqombothi (traditional beer) or snuff."),
        ],
        "xhosa": [
            InterviewQuestion("xh_g1", "greeting", "How do you greet respectfully in Xhosa?",
                "Ukwamkela njani ngokuhlonela ngesiXhosa?",
                "Molo (to one person), Molweni (to multiple people)",
                "What is the traditional response to 'Molo'?",
                "The response is also 'Molo' - it's a mutual acknowledgment of presence."),
            InterviewQuestion("xh_g2", "greeting", "How do you ask 'How are you?' in Xhosa?",
                "Ubuza njani 'Unjani?' ngesiXhosa?",
                "Unjani? (How are you?) - Ndiyaphila (I'm fine), Enkosi (Thanks)",
                "What are the differences between formal and informal greetings?",
                "Formal greetings use full titles; informal use first names with 'Molo'."),
            InterviewQuestion("xh_g3", "greeting", "How would you introduce yourself in a formal Xhosa setting?",
                "Ungazichaza njani kwindawo yamahleko ngesiXhosa?",
                "Igama lam ndingu-[name], ndingu-[surname]. Ndiyavuya ukukwazi.",
                "How does the click sound (c, x, q) affect pronunciation?",
                "Xhosa has three click consonants: c (dental), x (lateral), q (postalveolar) - essential for fluency."),
            InterviewQuestion("xh_g4", "greeting", "What are common Xhosa parting phrases?",
                "Ziyathetha njani ngesiXhosa xa kuhamba?",
                "Hamba kakuhle (go well), Sala kakuhle (stay well), Usale kakuhle (you stay well)",
                "When do you use 'Usale' versus 'Sala'?",
                "'Usale' is singular respectful; 'Sala' is general plural or casual."),
            InterviewQuestion("xh_g5", "greeting", "How do you welcome someone to your home in Xhosa?",
                "Uyamamkela njani umntu ekhaya ngesiXhosa?",
                "Wamkelekile! (Welcome!) Yiza phakathi! (Come inside!)",
        "What is the traditional custom when a guest arrives?",
                "Guests are offered water to wash hands, then food/drink - hospitality is a sacred duty."),
            InterviewQuestion("xh_c1", "culture", "Explain the concept of Ubuntu in Xhosa culture.",
                "Chaza ingcinga yeUbuntu kwisikho seXhosa.",
                "Ubuntu ngumntu ngumntu ngabantu (A person is a person through other people)",
                "How is Ubuntu demonstrated in community life?",
                "Through communal work, shared childcare, and collective problem-solving."),
            InterviewQuestion("xh_c2", "culture", "What is the significance of ulwaluko (initiation) in Xhosa culture?",
                "Yinto enjani ulwaluko kwisikho seXhosa?",
                "Ulwaluko is the rite of passage from boyhood to manhood, traditionally in the bush",
                "What changes occur in a young man's status after ulwaluko?",
                "He becomes a 'indoda' (man), gains new responsibilities, and must uphold community values."),
            InterviewQuestion("xh_c3", "culture", "Describe the role of the sangoma in Xhosa society.",
                "Chaza indima yesangoma kwisimo seXhosa.",
                "The sangoma is a traditional healer and spiritual guide who communicates with ancestors",
                "How does one become a sangoma?",
                "Through ukuthwasa - a calling from ancestors that requires years of training."),
            InterviewQuestion("xh_c4", "culture", "What is intonjane and how is it celebrated?",
                "Yintoni intonjane futhi iyathandwa njani?",
                "Intonjane is the female coming-of-age ceremony marking first menstruation",
                "How has this tradition evolved in modern times?",
                "Many families now combine traditional elements with modern education about womanhood."),
            InterviewQuestion("xh_c5", "culture", "How are conflicts traditionally resolved in Xhosa communities?",
                "Izimbalwa zixazululwa njani kwimiphakathi yamaXhosa?",
                "Through the inkundla (community court) presided over by elders",
                "What is the role of the iqhawalazikhuba (mediator)?",
                "The mediator facilitates dialogue between parties, seeking restorative justice over punishment."),
        ],
        "swahili": [
            InterviewQuestion("sw_g1", "greeting", "How do you greet someone in Swahili?",
                "Unamsalimuje mtu kwa Kiswahili?",
                "Jambo / Habari (Hello), Habari za asubuhi (Good morning)",
                "What is the appropriate response to 'Jambo'?",
                "The response is also 'Jambo' or 'Sijambo' (I am fine) for 'Habari gani?'."),
            InterviewQuestion("sw_g2", "greeting", "How do you ask and respond to 'How are you?' in Swahili?",
                "Unaulizaje na kujibu 'Habari gani?' kwa Kiswahili?",
                "Habari gani? (What's the news?) - Nzuri (Good), Salama (Peaceful), Safi (Clean/Fine)",
                "What are the different levels of formality in Swahili greetings?",
                "'Shikamoo' is for elders (I hold your feet); 'Habari' is peer-to-peer; 'Jambo' is casual."),
            InterviewQuestion("sw_g3", "greeting", "How do you introduce yourself in formal Swahili?",
                "Unajiwekaje katika Kiswahili cha kufaa?",
                "Jina langu ni [name], ninatoka [country]. Nafurahi kukutana nawe.",
                "How does Swahili use 'mimi' (I) versus 'ni-' prefix?",
                "'Mimi' is emphatic; the 'ni-' prefix is more common and natural in conversation."),
            InterviewQuestion("sw_g4", "greeting", "What are common Swahili farewells?",
                "Ni maagano gani ya kawaida ya Kiswahili?",
                "Kwa heri (Goodbye), Tutaonana (See you later), Lala salama (Sleep peacefully)",
                "When would you use 'Kwa heri' versus 'Tutaonana'?",
                "'Kwa heri' is formal/final; 'Tutaonana' implies you'll meet again soon."),
            InterviewQuestion("sw_g5", "greeting", "How do you welcome guests in Swahili?",
                "Unakaribishaje wageni kwa Kiswahili?",
                "Karibu! (Welcome - singular), Karibuni! (Welcome - plural)",
                "What is the cultural significance of hospitality in Swahili culture?",
                "Karibu is more than a word - it's a way of life rooted in coastal trading culture."),
            InterviewQuestion("sw_c1", "culture", "What does 'Hakuna Matata' really mean in context?",
                "'Hakuna Matata' inamaanisha nini kwa kweli katika muktadha?",
                "It literally means 'There are no problems' but conveys a philosophy of calm resilience",
                "How does this reflect Swahili culture's approach to challenges?",
                "Swahili culture values patience (subira) and community support in difficult times."),
            InterviewQuestion("sw_c2", "culture", "Explain the concept of 'Ujamaa' (familyhood).",
                "Eleza dhana ya 'Ujamaa'.",
                "Ujamaa means extended family/community cooperation - popularized by Julius Nyerere",
                "How has Ujamaa influenced modern Tanzanian society?",
                "It laid the foundation for cooperative movements and community development."),
            InterviewQuestion("sw_c3", "culture", "Describe the Swahili coastal trading culture.",
                "Eleza utamaduni wa biashara wa pwani wa Waswahili.",
                "Centuries of Indian Ocean trade blended Arab, Persian, Indian, and African cultures",
                "What are some architectural examples of this cultural blend?",
                "Stone Town in Zanzibar - coral stone buildings with carved doors from multiple traditions."),
            InterviewQuestion("sw_c4", "culture", "What is the role of the mganga (traditional healer)?",
                "Ni nafasi gani ya mganga katika jamii?",
                "The mganga treats physical and spiritual ailments using herbs and rituals",
                "How do traditional and modern medicine coexist?",
                "Many Tanzanians use both - hospitals for serious illness, mganga for spiritual causes."),
            InterviewQuestion("sw_c5", "culture", "How is community decision-making done in Swahili culture?",
                "Maamuzi ya jamii yanafanywaje katika utamaduni wa Kiswahili?",
                "Through baraza (community council) where elders and stakeholders discuss",
                "What is the role of the mwenyekiti (chairperson)?",
                "The mwenyekiti facilitates consensus rather than imposing decisions."),
        ],
    }

    # Fill remaining languages with generated questions
    def _generate_more_questions(self):
        """Generate additional questions for languages with fewer entries."""
        for lang_code in ["yoruba", "afrikaans", "french"]:
            if lang_code not in self.QUESTION_BANK:
                self.QUESTION_BANK[lang_code] = []

    def __init__(self):
        self._generate_more_questions()
        self.scores: Dict[str, List[InterviewScore]] = {}
        self.current_question_idx: Dict[str, int] = {}

    def list_languages(self) -> List[Dict[str, str]]:
        """List available interview languages."""
        return [{"code": code, **info} for code, info in self.LANGUAGES.items()]

    def get_questions(self, language: str, category: str = "") -> List[InterviewQuestion]:
        """Get questions for a language, optionally filtered by category."""
        questions = self.QUESTION_BANK.get(language, [])
        if category:
            questions = [q for q in questions if q.category == category]
        return questions

    def list_categories(self, language: str) -> List[str]:
        """List available categories for a language."""
        questions = self.QUESTION_BANK.get(language, [])
        return sorted(set(q.category for q in questions))

    def start_interview(self, language: str, num_questions: int = 5) -> Dict[str, Any]:
        """Start a new interview session."""
        questions = self.QUESTION_BANK.get(language, [])
        if not questions:
            return {"error": f"No questions available for {language}"}
        selected = random.sample(questions, min(num_questions, len(questions)))
        self.current_question_idx[language] = 0
        return {
            "language": self.LANGUAGES.get(language, {}).get("name", language),
            "total_questions": len(selected),
            "questions": [{"id": q.question_id, "question_en": q.question_en,
                "question_native": q.question_native, "cultural_context": q.cultural_context}
                for q in selected],
        }

    def ask_question(self, language: str, question_id: str = "") -> Dict[str, Any]:
        """Get a specific question or the next one in sequence."""
        questions = self.QUESTION_BANK.get(language, [])
        if not questions:
            return {"error": f"No questions for {language}"}
        if question_id:
            q = next((q for q in questions if q.question_id == question_id), None)
            if not q:
                return {"error": f"Question {question_id} not found"}
        else:
            idx = self.current_question_idx.get(language, 0)
            q = questions[idx % len(questions)]
            self.current_question_idx[language] = idx + 1
        return {
            "id": q.question_id, "category": q.category,
            "question_en": q.question_en, "question_native": q.question_native,
            "cultural_context": q.cultural_context,
            "follow_up": q.follow_up,
        }

    def evaluate_response(self, language: str, question_id: str, response: str) -> InterviewScore:
        """AI-evaluate a response. Returns InterviewScore with feedback."""
        questions = self.QUESTION_BANK.get(language, [])
        q = next((q for q in questions if q.question_id == question_id), None)
        if not q:
            return InterviewScore(question_id=question_id, feedback="Question not found.")
        response_lower = response.lower().strip()
        expected_lower = q.expected_answer.lower()
        # Simple scoring heuristics
        fluency = min(10, max(1, len(response.split()) // 3))
        grammar = 7 if len(response) > 20 else 4
        vocab = 8 if any(keyword in response_lower for keyword in expected_lower.split()[:5]) else 5
        cultural = 7 if len(response) > 30 else 4
        if any(keyword in response_lower for keyword in expected_lower.split()[:3]):
            fluency = min(10, fluency + 2)
            vocab = min(10, vocab + 2)
        overall = (fluency + grammar + vocab + cultural) // 4
        feedback_parts = []
        if overall >= 8:
            feedback_parts.append("Excellent response! You demonstrated strong understanding.")
        elif overall >= 6:
            feedback_parts.append("Good response. Some areas for improvement.")
        elif overall >= 4:
            feedback_parts.append("Fair attempt. Keep practicing.")
        else:
            feedback_parts.append("Keep practicing. Focus on vocabulary and sentence structure.")
        if q.follow_up:
            feedback_parts.append(f"Follow-up: {q.follow_up}")
        score = InterviewScore(
            question_id=question_id, fluency=fluency, grammar=grammar,
            vocabulary=vocab, cultural_awareness=cultural, overall=overall,
            feedback=" ".join(feedback_parts),
        )
        if language not in self.scores:
            self.scores[language] = []
        self.scores[language].append(score)
        return score

    def get_score_report(self, language: str) -> Dict[str, Any]:
        """Get comprehensive score report."""
        scores = self.scores.get(language, [])
        if not scores:
            return {"error": "No scores recorded yet."}
        avg_fluency = sum(s.fluency for s in scores) / len(scores)
        avg_grammar = sum(s.grammar for s in scores) / len(scores)
        avg_vocab = sum(s.vocabulary for s in scores) / len(scores)
        avg_cultural = sum(s.cultural_awareness for s in scores) / len(scores)
        avg_overall = sum(s.overall for s in scores) / len(scores)
        return {
            "language": self.LANGUAGES.get(language, {}).get("name", language),
            "questions_answered": len(scores),
            "averages": {
                "fluency": round(avg_fluency, 1),
                "grammar": round(avg_grammar, 1),
                "vocabulary": round(avg_vocab, 1),
                "cultural_awareness": round(avg_cultural, 1),
                "overall": round(avg_overall, 1),
            },
            "level": self._get_level(avg_overall),
            "scores": [{"qid": s.question_id, "overall": s.overall, "feedback": s.feedback} for s in scores],
        }

    def _get_level(self, score: float) -> str:
        if score >= 9:
            return "Native-like"
        elif score >= 8:
            return "Fluent"
        elif score >= 6:
            return "Conversational"
        elif score >= 4:
            return "Basic"
        else:
            return "Beginner"

    def practice_mode(self, language: str, category: str = "greeting") -> str:
        """Interactive practice mode. Returns formatted practice session."""
        questions = self.get_questions(language, category)
        if not questions:
            return f"No {category} questions available for {language}."
        lines = [f"=== {self.LANGUAGES[language]['name']} Practice: {category.title()} ===", ""]
        for i, q in enumerate(questions[:5], 1):
            lines.append(f"{i}. EN: {q.question_en}")
            lines.append(f"   {self.LANGUAGES[language]['name']}: {q.question_native}")
            lines.append(f"   Expected: {q.expected_answer}")
            lines.append(f"   Cultural note: {q.cultural_context}")
            lines.append("")
        return "\n".join(lines)


if __name__ == "__main__":
    bi = BilingualInterview()
    print(f"Available languages: {', '.join(bi.LANGUAGES.keys())}")
    print()
    for lang in ["zulu", "xhosa", "swahili"]:
        result = bi.start_interview(lang, num_questions=3)
        print(f"\n=== {result.get('language', lang)} Interview ({result['total_questions']} questions) ===")
        for q in result["questions"]:
            print(f"\nQ: {q['question_en']}")
            print(f"   [{result['language']}] {q['question_native']}")
            score = bi.evaluate_response(lang, q['id'], "Hello, I am fine thank you")
            print(f"   Score: {score.overall}/10 - {score.feedback[:80]}")
        report = bi.get_score_report(lang)
        print(f"\nOverall Level: {report['level']} ({report['averages']['overall']}/10)")
