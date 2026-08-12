"""Livestock Manager — Farm livestock management system."""

import json
from typing import Dict, List


class LivestockManager:
    """Livestock management for South African farms."""

    def __init__(self):
        self.animals = []

    def add_animal(self, tag: str, species: str, breed: str, birth_date: str, health_status: str = "healthy") -> Dict:
        animal = {
            "tag": tag,
            "species": species,
            "breed": breed,
            "birth_date": birth_date,
            "health_status": health_status,
            "vaccinations": [],
            "weight_history": [],
        }
        self.animals.append(animal)
        return animal

    def record_vaccination(self, tag: str, vaccine: str, date: str):
        animal = next((a for a in self.animals if a["tag"] == tag), None)
        if animal:
            animal["vaccinations"].append({"vaccine": vaccine, "date": date})
            return True
        return False

    def record_weight(self, tag: str, weight: float, date: str):
        animal = next((a for a in self.animals if a["tag"] == tag), None)
        if animal:
            animal["weight_history"].append({"weight": weight, "date": date})
            return True
        return False

    def get_herd_summary(self) -> Dict:
        species_count = {}
        for a in self.animals:
            species_count[a["species"]] = species_count.get(a["species"], 0) + 1
        return {
            "total_animals": len(self.animals),
            "by_species": species_count,
            "healthy": len([a for a in self.animals if a["health_status"] == "healthy"]),
        }

    def breeding_schedule(self, species: str) -> Dict:
        schedules = {
            "cattle": {"gestation": "283 days", "calving_interval": "12-14 months", "weaning": "6-8 months"},
            "sheep": {"gestation": "150 days", "lambing_interval": "8 months", "weaning": "3-4 months"},
            "goats": {"gestation": "150 days", "kidding_interval": "8 months", "weaning": "3-4 months"},
        }
        return schedules.get(species.lower(), {"error": "Species not found"})


if __name__ == "__main__":
    livestock = LivestockManager()
    livestock.add_animal("C001", "cattle", "Nguni", "2023-01-15")
    livestock.record_vaccination("C001", "Lumpy Skin", "2024-03-01")
    livestock.record_weight("C001", 450, "2024-06-01")
    print(json.dumps(livestock.get_herd_summary(), indent=2))
    print(json.dumps(livestock.breeding_schedule("cattle"), indent=2))
