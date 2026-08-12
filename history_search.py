"""History Search — African history and heritage search engine."""

import json
from typing import Dict, List


class HistorySearch:
    """African history and heritage search engine."""

    def __init__(self):
        self.events = [
            {"year": -3000, "event": "Ancient Egyptian civilization emerges", "region": "North Africa"},
            {"year": 1220, "event": "Great Zimbabwe reaches peak", "region": "Southern Africa"},
            {"year": 1652, "event": "Dutch East India Company establishes Cape Colony", "region": "South Africa"},
            {"year": 1816, "event": "Shaka Zulu becomes king", "region": "KwaZulu-Natal"},
            {"year": 1912, "event": "ANC founded", "region": "South Africa"},
            {"year": 1948, "event": "Apartheid policy implemented", "region": "South Africa"},
            {"year": 1990, "event": "Nelson Mandela released", "region": "South Africa"},
            {"year": 1994, "event": "First democratic elections", "region": "South Africa"},
        ]
        self.figures = [
            {"name": "Nelson Mandela", "role": "President", "period": "1994-1999", "legacy": "Reconciliation"},
            {"name": "Oliver Tambo", "role": "ANC Leader", "period": "1967-1991", "legacy": "Diplomacy"},
            {"name": "Winnie Madikizela-Mandela", "role": "Activist", "period": "1958-2018", "legacy": "Resistance"},
            {"name": "Steve Biko", "role": "Activist", "period": "1946-1977", "legacy": "Black Consciousness"},
        ]

    def search_events(self, query: str = None, year_range: tuple = None) -> List[Dict]:
        results = self.events
        if query:
            results = [e for e in results if query.lower() in e["event"].lower() or query.lower() in e["region"].lower()]
        if year_range:
            results = [e for e in results if year_range[0] <= e["year"] <= year_range[1]]
        return results

    def search_figures(self, query: str = None) -> List[Dict]:
        results = self.figures
        if query:
            results = [f for f in results if query.lower() in f["name"].lower() or query.lower() in f["legacy"].lower()]
        return results

    def timeline(self, region: str = None) -> List[Dict]:
        events = self.events
        if region:
            events = [e for e in events if region.lower() in e["region"].lower()]
        return sorted(events, key=lambda x: x["year"])

    def heritage_sites(self) -> List[Dict]:
        return [
            {"name": "Cradle of Humankind", "location": "Gauteng", "unesco": True},
            {"name": "Robben Island", "location": "Western Cape", "unesco": True},
            {"name": "Mapungubwe", "location": "Limpopo", "unesco": True},
            {"name": "Great Zimbabwe", "location": "Zimbabwe", "unesco": True},
        ]


if __name__ == "__main__":
    history = HistorySearch()
    print(json.dumps(history.search_events("Mandela"), indent=2))
    print(json.dumps(history.timeline("South Africa"), indent=2))
    print(json.dumps(history.heritage_sites(), indent=2))
