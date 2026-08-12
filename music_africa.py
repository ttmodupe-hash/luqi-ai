"""Music Africa — African music discovery and streaming guide."""

import json
from typing import Dict, List


class MusicAfrica:
    """African music discovery engine."""

    def __init__(self):
        self.genres = {
            "afrobeats": {"origin": "Nigeria/Ghana", "artists": ["Burna Boy", "WizKid", "Davido", "Tiwa Savage"], "tempo": "90-120 BPM"},
            "amapiano": {"origin": "South Africa", "artists": ["Kabza de Small", "DJ Maphorisa", "Focalistic"], "tempo": "110-125 BPM"},
            "gqom": {"origin": "South Africa (Durban)", "artists": ["Distruction Boyz", "DJ Tira", "Tipcee"], "tempo": "120-130 BPM"},
            "kwaito": {"origin": "South Africa", "artists": ["Mandoza", "Arthur Mafokate", "TKZee"], "tempo": "90-110 BPM"},
            "mbaqanga": {"origin": "South Africa", "artists": ["Mahlathini", "Mahotella Queens"], "tempo": "Varies"},
            "highlife": {"origin": "Ghana", "artists": ["E.T. Mensah", "Amakye Dede"], "tempo": "Varies"},
        }
        self.myuzik_platforms = [
            {"name": "Boomplay", "focus": "Africa", "catalog": "Large", "subscription": "R29.99/month"},
            {"name": "Spotify", "focus": "Global", "catalog": "Massive", "subscription": "R59.99/month"},
            {"name": "Apple Music", "focus": "Global", "catalog": "Massive", "subscription": "R59.99/month"},
            {"name": "YouTube Music", "focus": "Global", "catalog": "Large", "subscription": "R59.99/month"},
        ]

    def get_genre(self, name: str) -> Dict:
        return self.genres.get(name.lower(), {"error": "Genre not found"})

    def discover(self, mood: str = None) -> List[Dict]:
        mood_map = {
            "party": ["afrobeats", "amapiano", "gqom"],
            "chill": ["amapiano", "highlife"],
            "workout": ["gqom", "afrobeats"],
            "nostalgic": ["kwaito", "mbaqanga"],
        }
        genres = mood_map.get(mood.lower(), list(self.genres.keys())) if mood else list(self.genres.keys())
        return [self.genres[g] for g in genres if g in self.genres]

    def get_platforms(self) -> List[Dict]:
        return self.myuzik_platforms

    def artist_info(self, name: str) -> Dict:
        for genre, info in self.genres.items():
            if name.lower() in [a.lower() for a in info["artists"]]:
                return {"name": name, "genre": genre, "origin": info["origin"]}
        return {"error": "Artist not found"}


if __name__ == "__main__":
    music = MusicAfrica()
    print(json.dumps(music.get_genre("amapiano"), indent=2))
    print(json.dumps(music.discover("party"), indent=2))
    print(json.dumps(music.artist_info("Burna Boy"), indent=2))
