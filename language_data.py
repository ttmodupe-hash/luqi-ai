"""Language Data — South African language and linguistic data."""

import json
from typing import Dict, List


class LanguageData:
    """South African language data and utilities."""

    def __init__(self):
        self.languages = {
            "isiZulu": {"family": "Nguni", "speakers": "12m", "provinces": ["KZN", "Gauteng", "Mpumalanga"], "official": True},
            "isiXhosa": {"family": "Nguni", "speakers": "8m", "provinces": ["Eastern Cape", "Western Cape"], "official": True},
            "Afrikaans": {"family": "Germanic", "speakers": "7m", "provinces": ["Western Cape", "Northern Cape"], "official": True},
            "English": {"family": "Germanic", "speakers": "5m", "provinces": ["All"], "official": True},
            "Sepedi": {"family": "Sotho-Tswana", "speakers": "5m", "provinces": ["Limpopo", "Gauteng"], "official": True},
            "Setswana": {"family": "Sotho-Tswana", "speakers": "4m", "provinces": ["North West", "Northern Cape"], "official": True},
            "Sesotho": {"family": "Sotho-Tswana", "speakers": "4m", "provinces": ["Free State"], "official": True},
            "Xitsonga": {"family": "Tswa-Ronga", "speakers": "2m", "provinces": ["Limpopo", "Mpumalanga"], "official": True},
            "siSwati": {"family": "Nguni", "speakers": "1m", "provinces": ["Mpumalanga"], "official": True},
            "Tshivenda": {"family": "Venda", "speakers": "1m", "provinces": ["Limpopo"], "official": True},
            "isiNdebele": {"family": "Nguni", "speakers": "1m", "provinces": ["Mpumalanga", "Gauteng"], "official": True},
        }
        self.greetings = {
            "isiZulu": "Sawubona",
            "isiXhosa": "Molo",
            "Afrikaans": "Hallo",
            "English": "Hello",
            "Sepedi": "Dumela",
            "Setswana": "Dumela",
            "Sesotho": "Dumela",
            "Xitsonga": "Avuxeni",
            "siSwati": "Sawubona",
            "Tshivenda": "Ndaa / Aa",
            "isiNdebele": "Lotjhani",
        }

    def get_language(self, name: str) -> Dict:
        return self.languages.get(name, {"error": "Language not found"})

    def get_greeting(self, language: str) -> str:
        return self.greetings.get(language, "Hello")

    def list_official(self) -> List[str]:
        return [name for name, info in self.languages.items() if info["official"]]

    def speakers_by_province(self, province: str) -> List[Dict]:
        return [{"language": name, **info} for name, info in self.languages.items() if province.lower() in [p.lower() for p in info["provinces"]]]


if __name__ == "__main__":
    lang = LanguageData()
    print(json.dumps(lang.get_language("isiZulu"), indent=2))
    print(lang.get_greeting("isiXhosa"))
    print(json.dumps(lang.speakers_by_province("Western Cape"), indent=2))
