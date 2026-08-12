"""Entertainment & Culture — Arts, music, and cultural events guide."""

import json
from typing import Dict, List


class EntertainmentCulture:
    """Entertainment and culture guide for South Africa."""

    def __init__(self):
        self.venues = [
            {"name": "National Arts Festival", "city": "Makhanda", "type": "festival"},
            {"name": "Joburg Theatre", "city": "Johannesburg", "type": "theatre"},
            {"name": "Artscape", "city": "Cape Town", "type": "theatre"},
            {"name": "Kirstenbosch Gardens", "city": "Cape Town", "type": "outdoor"},
        ]
        self.genres = {
            "jazz": ["Miriam Makeba", "Hugh Masekela", "Abdullah Ibrahim"],
            "kwaito": ["Arthur Mafokate", "Mandoza", "TKZee"],
            "afrobeat": ["Fela Kuti", "Burna Boy", "WizKid"],
            "classical": ["Soweto String Quartet", "Pretty Yende"],
        }

    def find_venues(self, city: str = None, type: str = None) -> List[Dict]:
        results = self.venues
        if city:
            results = [v for v in results if city.lower() in v["city"].lower()]
        if type:
            results = [v for v in results if v["type"] == type]
        return results

    def get_artists(self, genre: str) -> List[str]:
        return self.genres.get(genre.lower(), [])

    def cultural_events(self, month: str = "January") -> List[Dict]:
        events = [
            {"name": "Cape Town Minstrel Carnival", "month": "January", "city": "Cape Town"},
            {"name": "Durban July", "month": "July", "city": "Durban"},
            {"name": "Soweto Wine Festival", "month": "September", "city": "Soweto"},
        ]
        return [e for e in events if e["month"].lower() == month.lower()]


if __name__ == "__main__":
    culture = EntertainmentCulture()
    print(json.dumps(culture.find_venues("Cape Town"), indent=2))
    print(json.dumps(culture.get_artists("jazz"), indent=2))
    print(json.dumps(culture.cultural_events("January"), indent=2))
