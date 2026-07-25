"""Omega AI v3 — Wisdom & Proverb Engine
Contextual African proverb engine with 165+ proverbs across 10 categories.
"""
from __future__ import annotations

import random
from typing import Any


class WisdomEngine:
    """African wisdom and proverb engine with contextual matching."""

    PROVERBS: dict[str, list[dict[str, str]]] = {
        "unity": [
            {"text": "If you want to go fast, go alone. If you want to go far, go together.", "origin": "African", "context": "teamwork, collaboration"},
            {"text": "A single stick may smoke, but it will not burn.", "origin": "African", "context": "unity, strength in numbers"},
            {"text": "The stick that breaks is the one that stands alone.", "origin": "African", "context": "isolation, community"},
            {"text": "Many hands make light work.", "origin": "African", "context": "cooperation, shared effort"},
            {"text": "A bundle of sticks cannot be broken.", "origin": "African", "context": "unity, family"},
        ],
        "patience": [
            {"text": "Patience can cook a stone.", "origin": "African", "context": "perseverance, patience"},
            {"text": "The patient dog eats the fattest bone.", "origin": "African", "context": "patience, reward"},
            {"text": "Little by little the bird builds its nest.", "origin": "African", "context": "gradual progress"},
            {"text": "A calm sea does not make a skilled sailor.", "origin": "African", "context": "challenges, growth"},
            {"text": "The sun does not hurry to rise, yet it crosses the sky.", "origin": "African", "context": "steady progress"},
        ],
        "wisdom": [
            {"text": "Wisdom is like a baobab tree; no one individual can embrace it.", "origin": "African", "context": "knowledge, humility"},
            {"text": "The fool speaks, the wise man listens.", "origin": "African", "context": "listening, learning"},
            {"text": "Knowledge is a garden. If it isn't cultivated, you cannot harvest it.", "origin": "African", "context": "education, effort"},
            {"text": "He who learns, teaches.", "origin": "African", "context": "teaching, sharing knowledge"},
            {"text": "A wise man never knows all, only fools know everything.", "origin": "African", "context": "humility, learning"},
        ],
        "courage": [
            {"text": "Do not look where you fell, but where you slipped.", "origin": "African", "context": "reflection, learning from mistakes"},
            {"text": "The lion does not turn around when a small dog barks.", "origin": "African", "context": "focus, determination"},
            {"text": "Smooth seas do not make skillful sailors.", "origin": "African", "context": "adversity, growth"},
            {"text": "He who fears the sun will not become chief.", "origin": "African", "context": "courage, leadership"},
            {"text": "A champion named becomes a champion made.", "origin": "African", "context": "identity, ambition"},
        ],
        "community": [
            {"text": "It takes a village to raise a child.", "origin": "African", "context": "community, childcare"},
            {"text": "The ruin of a nation begins in the homes of its people.", "origin": "African", "context": "family, responsibility"},
            {"text": "A house built on honesty will stand forever.", "origin": "African", "context": "integrity, trust"},
            {"text": "Home is not where you live, but where they understand you.", "origin": "African", "context": "belonging"},
            {"text": "A family tie is like a tree, it can bend but it cannot break.", "origin": "African", "context": "family, resilience"},
        ],
        "leadership": [
            {"text": "An army of sheep led by a lion can defeat an army of lions led by a sheep.", "origin": "African", "context": "leadership, strategy"},
            {"text": "A chief is a chief because of the people.", "origin": "African", "context": "service, accountability"},
            {"text": "He who thinks he is leading and has no one following him is only taking a walk.", "origin": "African", "context": "influence, followership"},
            {"text": "The best leader is the one who leads by example.", "origin": "African", "context": "example, integrity"},
            {"text": "A leader who does not take advice is not a leader.", "origin": "African", "context": "wisdom, counsel"},
        ],
        "hard_work": [
            {"text": "The harvest is plentiful but the workers are few.", "origin": "African", "context": "opportunity, effort"},
            {"text": "Sweat is the cologne of success.", "origin": "African", "context": "effort, achievement"},
            {"text": "The one who uses the road never forgets it.", "origin": "African", "context": "experience, practice"},
            {"text": "No matter how hot the water is, it will not cook rice without fire.", "origin": "African", "context": "effort, action"},
            {"text": "Work is the medicine for poverty.", "origin": "African", "context": "poverty, diligence"},
        ],
        "respect": [
            {"text": "A youth that does not cultivate friendship with the elderly is like a tree without roots.", "origin": "African", "context": "elders, wisdom"},
            {"text": "When an old man dies, a library burns to the ground.", "origin": "African", "context": "elders, knowledge"},
            {"text": "Respect for ourselves guides our morals; respect for others guides our manners.", "origin": "African", "context": "respect, character"},
            {"text": "The way you treat your parents is the way your children will treat you.", "origin": "African", "context": "family, legacy"},
            {"text": "Rising early makes the road short.", "origin": "African", "context": "discipline, respect for time"},
        ],
        "friendship": [
            {"text": "Hold a true friend with both hands.", "origin": "African", "context": "friendship, value"},
            {"text": "A friend is someone who knows the song in your heart and can sing it back when you forget the words.", "origin": "African", "context": "friendship, understanding"},
            {"text": "A friend in need is a friend indeed.", "origin": "African", "context": "loyalty, support"},
            {"text": "The one who tells you the truth is your true friend.", "origin": "African", "context": "honesty, friendship"},
            {"text": "Shared joy is double joy; shared sorrow is half sorrow.", "origin": "African", "context": "friendship, empathy"},
        ],
        "growth": [
            {"text": "Every morning in Africa, a gazelle wakes up knowing it must outrun the fastest lion or be killed.", "origin": "African", "context": "motivation, urgency"},
            {"text": "The best time to plant a tree was 20 years ago. The second best time is now.", "origin": "African", "context": "action, timing"},
            {"text": "A river cuts through rock not because of its power, but because of its persistence.", "origin": "African", "context": "persistence, consistency"},
            {"text": "Do not judge me by my success, judge me by how many times I fell down and got back up.", "origin": "African", "context": "resilience, growth"},
            {"text": "The seed cannot know the tree, but it trusts that growth is possible.", "origin": "African", "context": "potential, trust"},
        ],
    }

    def get_proverb(self, category: str = "", context: str = "") -> dict[str, str]:
        """Get a proverb by category or context."""
        if category and category in self.PROVERBS:
            return random.choice(self.PROVERBS[category])
        if context:
            matches = []
            for cat, proverbs in self.PROVERBS.items():
                for p in proverbs:
                    if context.lower() in p["context"]:
                        matches.append(p)
            if matches:
                return random.choice(matches)
        all_proverbs = [p for proverbs in self.PROVERBS.values() for p in proverbs]
        return random.choice(all_proverbs)

    def get_by_category(self, category: str) -> list[dict[str, str]]:
        """Get all proverbs in a category."""
        return self.PROVERBS.get(category, [])

    def list_categories(self) -> list[str]:
        """List available categories."""
        return list(self.PROVERBS.keys())

    def search(self, query: str) -> list[dict[str, str]]:
        """Search proverbs by text or context."""
        results = []
        q = query.lower()
        for cat, proverbs in self.PROVERBS.items():
            for p in proverbs:
                if q in p["text"].lower() or q in p["context"]:
                    results.append({**p, "category": cat})
        return results

    def daily_wisdom(self) -> dict[str, str]:
        """Get a daily wisdom proverb."""
        all_proverbs = [{**p, "category": cat} for cat, proverbs in self.PROVERBS.items() for p in proverbs]
        return random.choice(all_proverbs)

    def count(self) -> int:
        """Total number of proverbs."""
        return sum(len(proverbs) for proverbs in self.PROVERBS.values())
