"""Knowledge Base — Structured knowledge management system."""

import json
from typing import Dict, List


class KnowledgeBase:
    """Structured knowledge base for Omega AI."""

    def __init__(self, path: str = "data/kb_articles.json"):
        self.path = path
        self.articles = {}
        self.load()

    def load(self):
        try:
            with open(self.path, "r") as f:
                self.articles = json.load(f)
        except FileNotFoundError:
            self.articles = {}

    def save(self):
        with open(self.path, "w") as f:
            json.dump(self.articles, f, indent=2)

    def add_article(self, topic: str, content: str, tags: List[str] = None, source: str = None) -> Dict:
        article = {
            "topic": topic,
            "content": content,
            "tags": tags or [],
            "source": source,
            "created": json.dumps("now"),
        }
        self.articles[topic.lower()] = article
        self.save()
        return article

    def get_article(self, topic: str) -> Dict:
        return self.articles.get(topic.lower(), {"error": "Article not found"})

    def search(self, query: str) -> List[Dict]:
        results = []
        for topic, article in self.articles.items():
            if query.lower() in topic or query.lower() in article.get("content", "").lower():
                results.append(article)
        return results

    def get_by_tag(self, tag: str) -> List[Dict]:
        return [a for a in self.articles.values() if tag.lower() in [t.lower() for t in a.get("tags", [])]]


if __name__ == "__main__":
    kb = KnowledgeBase()
    kb.add_article("Python Basics", "Python is a programming language...", ["programming", "python"])
    print(json.dumps(kb.get_article("Python Basics"), indent=2))
    print(json.dumps(kb.search("programming"), indent=2))
