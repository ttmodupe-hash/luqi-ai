"""Health Advisor — Medical and health information assistant."""

import json
from typing import Dict, List


class HealthAdvisor:
    """Health and medical information advisor."""

    def __init__(self):
        self.symptoms_db = {
            "headache": {"possible_causes": ["tension", "migraine", "dehydration"], "urgency": "low"},
            "chest_pain": {"possible_causes": ["angina", "heart attack", "anxiety"], "urgency": "high"},
            "fever": {"possible_causes": ["infection", "flu", "malaria"], "urgency": "medium"},
            "rash": {"possible_causes": ["allergy", "infection", "heat"], "urgency": "low"},
        }
        self.medications = {
            "paracetamol": {"dosage": "1-2 tablets every 4-6 hours", "max_daily": "8 tablets", "warnings": ["liver disease"]},
            "ibuprofen": {"dosage": "200-400mg every 6-8 hours", "max_daily": "1200mg", "warnings": ["stomach ulcers", "kidney disease"]},
        }

    def check_symptoms(self, symptoms: List[str]) -> Dict:
        results = []
        max_urgency = "low"
        for s in symptoms:
            info = self.symptoms_db.get(s.lower().replace(" ", "_"), {"possible_causes": ["unknown"], "urgency": "unknown"})
            results.append({"symptom": s, **info})
            if info["urgency"] == "high":
                max_urgency = "high"
            elif info["urgency"] == "medium" and max_urgency != "high":
                max_urgency = "medium"
        return {
            "symptoms": results,
            "max_urgency": max_urgency,
            "recommendation": "Seek immediate medical attention" if max_urgency == "high" else "Monitor symptoms",
        }

    def medication_info(self, name: str) -> Dict:
        return self.medications.get(name.lower(), {"error": "Medication not found"})

    def find_clinic(self, suburb: str) -> List[Dict]:
        clinics = [
            {"name": "Alexandra Clinic", "suburb": "Alexandra", "hours": "24h"},
            {"name": "Soweto Community Health", "suburb": "Soweto", "hours": "8am-5pm"},
            {"name": "Khayelitsha Clinic", "suburb": "Khayelitsha", "hours": "24h"},
        ]
        return [c for c in clinics if suburb.lower() in c["suburb"].lower()]

    def bmi_calculator(self, weight_kg: float, height_m: float) -> Dict:
        bmi = weight_kg / (height_m ** 2)
        category = "underweight" if bmi < 18.5 else "normal" if bmi < 25 else "overweight" if bmi < 30 else "obese"
        return {"bmi": round(bmi, 1), "category": category}


if __name__ == "__main__":
    health = HealthAdvisor()
    print(json.dumps(health.check_symptoms(["headache", "fever"]), indent=2))
    print(json.dumps(health.medication_info("paracetamol"), indent=2))
    print(json.dumps(health.bmi_calculator(70, 1.75), indent=2))
