"""Citation Engine — Academic and legal citation formatter."""

from typing import Dict, List


class CitationEngine:
    """Citation formatting engine."""

    def __init__(self):
        self.styles = {
            "apa": self._apa,
            "mla": self._mla,
            "harvard": self._harvard,
            "chicago": self._chicago,
            "bluebook": self._bluebook,
        }

    def format(self, source: Dict, style: str = "apa") -> str:
        formatter = self.styles.get(style.lower())
        if not formatter:
            return f"Unknown style: {style}"
        return formatter(source)

    def _apa(self, s: Dict) -> str:
        authors = s.get("authors", ["Unknown"])
        author_str = ", ".join(authors[:-1]) + f", & {authors[-1]}" if len(authors) > 1 else authors[0]
        return f"{author_str} ({s.get('year', 'n.d.')}). {s.get('title', '')}. {s.get('publisher', '')}."

    def _mla(self, s: Dict) -> str:
        authors = s.get("authors", ["Unknown"])
        return f"{authors[0]}. \"{s.get('title', '')}.\" {s.get('publisher', '')}, {s.get('year', 'n.d.')}."

    def _harvard(self, s: Dict) -> str:
        authors = s.get("authors", ["Unknown"])
        return f"{authors[0]} ({s.get('year', 'n.d.')}) '{s.get('title', '')}', {s.get('publisher', '')}."

    def _chicago(self, s: Dict) -> str:
        authors = s.get("authors", ["Unknown"])
        return f"{authors[0]}. {s.get('title', '')}. {s.get('publisher', '')}, {s.get('year', 'n.d.')}."

    def _bluebook(self, s: Dict) -> str:
        return f"{s.get('title', '')}, {s.get('volume', '')} {s.get('reporter', '')} {s.get('page', '')} ({s.get('year', 'n.d.')})."

    def bibliography(self, sources: List[Dict], style: str = "apa") -> str:
        return "\n".join(self.format(s, style) for s in sources)


if __name__ == "__main__":
    engine = CitationEngine()
    source = {
        "authors": ["Smith, J.", "Doe, A."],
        "title": "AI in Africa",
        "year": 2024,
        "publisher": "Journal of African Tech",
    }
    print(engine.format(source, "apa"))
    print(engine.format(source, "mla"))
