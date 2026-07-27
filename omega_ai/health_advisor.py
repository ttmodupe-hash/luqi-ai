"""
Health & Wellness Advisor Module
================================
Provides BMI/BMR calculations, medication reference (educational),
first aid guides, and nutrition advice.

All methods return dictionaries with 'result', 'data', and 'status' keys.
Educational purposes only — not a substitute for professional medical advice.
"""

from typing import Dict, Optional


class HealthAdvisor:
    """Health and wellness advisor with BMI, BMR, medication info,
    first aid guides, and nutrition planning."""

    # --- First aid guides (pre-seeded) ---
    _FIRST_AID_GUIDES: Dict[str, Dict] = {
        "choking": {
            "title": "Choking — First Aid",
            "steps": [
                "Encourage the person to cough if they can still breathe.",
                "If coughing fails, stand behind the person and wrap your arms around their waist.",
                "Make a fist with one hand and place it thumb-side inward above the navel.",
                "Grasp the fist with your other hand and pull inward and upward sharply.",
                "Repeat thrusts until the object is expelled or the person becomes unconscious.",
                "If unconscious, call emergency services and begin CPR.",
            ],
            "warning_signs": [
                "Inability to speak or cough",
                "Blue lips or skin (cyanosis)",
                "High-pitched wheezing sounds",
            ],
            "when_to_call_ems": "Immediately if the person cannot breathe, cough, or speak.",
        },
        "burns": {
            "title": "Burns — First Aid",
            "steps": [
                "Remove the person from the source of heat immediately.",
                "Cool the burn under cool (not cold) running water for at least 10–20 minutes.",
                "Remove jewellery and loose clothing near the burn — do not remove stuck clothing.",
                "Cover the burn loosely with a sterile, non-stick bandage or clean cloth.",
                "Do NOT apply ice, butter, oils, or ointments to the burn.",
                "For severe burns (large area, face, hands, genitals), seek emergency care.",
            ],
            "classifications": {
                "first_degree": "Red, painful, no blisters (e.g., mild sunburn).",
                "second_degree": "Red, blistered, very painful.",
                "third_degree": "White, charred, or leathery; may be painless due to nerve damage.",
            },
            "when_to_call_ems": "Burns larger than 3 inches, on face/hands/genitals, or caused by chemicals/electricity.",
        },
        "bleeding": {
            "title": "Bleeding — First Aid",
            "steps": [
                "Apply direct pressure to the wound with a clean cloth or sterile bandage.",
                "Maintain steady pressure for at least 10–15 minutes without lifting the dressing.",
                "If blood soaks through, add more layers — do not remove the original dressing.",
                "Elevate the injured area above heart level if possible.",
                "If bleeding is severe and does not stop, apply pressure to the nearest pressure point.",
                "Once bleeding stops, secure the dressing with a bandage.",
            ],
            "types": {
                "capillary": "Slow oozing; usually minor cuts.",
                "venous": "Steady flow; darker red blood.",
                "arterial": "Spurting, bright red; life-threatening — call EMS immediately.",
            },
            "when_to_call_ems": "Arterial bleeding, bleeding that won't stop after 10 minutes, or signs of shock.",
        },
        "cpr": {
            "title": "CPR (Cardiopulmonary Resuscitation)",
            "steps": [
                "Check scene safety and responsiveness. Tap the person's shoulder and shout.",
                "Call emergency services (10177 in SA or 112) or send someone to do so.",
                "Check breathing for no more than 10 seconds.",
                "If not breathing normally, begin chest compressions.",
                "Place heel of one hand on the centre of the chest, other hand on top.",
                "Push hard and fast — at least 5–6 cm deep, at 100–120 compressions per minute.",
                "Allow the chest to recoil fully between compressions.",
                "If trained, give 2 rescue breaths after every 30 compressions (30:2 ratio).",
                "Continue until emergency services arrive or the person recovers.",
            ],
            "compression_only_cpr": "If untrained, perform hands-only CPR — continuous compressions at 100–120/min.",
            "aed_use": "If an AED is available, turn it on and follow the voice prompts immediately.",
            "when_to_call_ems": "Before starting CPR; if alone, call first for adults, do 1 min CPR first for children.",
        },
        "fracture": {
            "title": "Fracture — First Aid",
            "steps": [
                "Encourage the person to stay as still as possible.",
                "Do not try to straighten or realign the bone.",
                "Immobilise the injured area using a splint or sling if you have training.",
                "Apply ice wrapped in a cloth to reduce swelling — never directly on skin.",
                "Elevate the limb if possible and if it does not cause pain.",
                "Check circulation beyond the injury (warmth, colour, pulse).",
                "For open fractures, cover the wound with a sterile dressing — do not push bone back in.",
            ],
            "signs": [
                "Deformity or unnatural angle",
                "Swelling and bruising",
                "Inability to bear weight or move the limb",
                "Bone protruding through skin (open/compound fracture)",
            ],
            "when_to_call_ems": "All suspected fractures should be evaluated at a hospital; call EMS for open fractures or severe pain.",
        },
        "poisoning": {
            "title": "Poisoning — First Aid",
            "steps": [
                "Check the person's level of consciousness and breathing.",
                "Call emergency services (10177 in SA) or the Poison Information Helpline (0861 555 777).",
                "Do NOT induce vomiting unless instructed by a poison control professional.",
                "If the poison is on the skin, remove contaminated clothing and rinse skin for 15–20 minutes.",
                "If inhaled, move the person to fresh air immediately.",
                "If in the eyes, flush with lukewarm water for at least 15 minutes.",
                "Try to identify the poison and keep the container for medical personnel.",
            ],
            "common_sources": [
                "Household cleaning products",
                "Medication overdose",
                "Pesticides and insecticides",
                "Carbon monoxide (poor ventilation)",
                "Certain plants (e.g., oleander, poison ivy)",
            ],
            "when_to_call_ems": "Immediately for any suspected poisoning — time is critical.",
        },
    }

    # --- Nutrition guides (pre-seeded) ---
    _NUTRITION_GUIDES: Dict[str, Dict] = {
        "general": {
            "title": "General Healthy Eating Guide",
            "principles": [
                "Eat a variety of foods from all food groups.",
                "Include at least 5 servings of fruits and vegetables daily.",
                "Choose whole grains over refined carbohydrates.",
                "Include lean proteins (fish, poultry, legumes, lean meats).",
                "Limit added sugars, saturated fats, and sodium.",
                "Stay hydrated — aim for 6–8 glasses of water per day.",
            ],
            "daily_targets": {
                "calories": "Individualised (average adult: 2000 kcal)",
                "protein": "0.8–1.0 g per kg body weight",
                "fibre": "25–30 g",
                "water": "2–3 litres",
            },
            "sample_day": {
                "breakfast": "Oats with banana, nuts, and low-fat milk",
                "lunch": "Grilled chicken salad with whole-grain bread",
                "supper": "Steamed fish, brown rice, and mixed vegetables",
                "snacks": "Fruit, unsalted nuts, or yoghurt",
            },
        },
        "weight_loss": {
            "title": "Weight Loss Nutrition Plan",
            "principles": [
                "Create a moderate calorie deficit (300–500 kcal below maintenance).",
                "Prioritise high-protein foods to preserve muscle mass.",
                "Eat plenty of vegetables for volume and fibre with fewer calories.",
                "Limit liquid calories — avoid sugary drinks and excessive alcohol.",
                "Choose low-GI carbohydrates to maintain stable blood sugar.",
                "Practise portion control and mindful eating.",
            ],
            "daily_targets": {
                "calories": "1200–1800 kcal (individualised)",
                "protein": "1.2–1.6 g per kg body weight",
                "fibre": "30+ g",
                "water": "2.5–3 litres",
            },
            "foods_to_emphasise": [
                "Leafy greens", "Lean meats", "Eggs", "Legumes",
                "Greek yoghurt", "Berries", "Whole grains", "Vegetables",
            ],
            "foods_to_limit": [
                "Sugary snacks and drinks", "Fried foods", "Refined carbs",
                "Processed meats", "High-fat dairy", "Alcohol",
            ],
        },
        "muscle_gain": {
            "title": "Muscle Gain Nutrition Plan",
            "principles": [
                "Eat in a slight calorie surplus (200–500 kcal above maintenance).",
                "Consume adequate protein spread across 4–5 meals.",
                "Include complex carbohydrates for energy and recovery.",
                "Time protein intake around workouts (within 2 hours).",
                "Stay well-hydrated to support performance.",
                "Prioritise sleep — muscle repair happens during rest.",
            ],
            "daily_targets": {
                "calories": "2500–3500+ kcal (highly individualised)",
                "protein": "1.6–2.2 g per kg body weight",
                "carbohydrates": "4–6 g per kg body weight",
                "water": "3–4 litres",
            },
            "sample_meals": {
                "breakfast": "4 eggs, 2 slices whole-grain toast, avocado",
                "pre_workout": "Oats with whey protein and banana",
                "post_workout": "Chicken breast, rice, and broccoli",
                "dinner": "Salmon, sweet potato, and asparagus",
                "snack": "Cottage cheese with nuts",
            },
        },
        "diabetes": {
            "title": "Diabetes-Friendly Nutrition Guide",
            "principles": [
                "Choose low-GI carbohydrates to manage blood sugar spikes.",
                "Control portion sizes — especially carbohydrate portions.",
                "Eat regular, balanced meals at consistent times.",
                "Include healthy fats (avocado, nuts, olive oil, fatty fish).",
                "Limit refined sugars, sugary drinks, and processed foods.",
                "Monitor blood glucose and work with a dietitian.",
            ],
            "recommended_foods": [
                "Non-starchy vegetables (spinach, broccoli, peppers)",
                "Whole grains (oats, brown rice, quinoa)",
                "Legumes (beans, lentils, chickpeas)",
                "Lean proteins (fish, chicken, tofu)",
                "Nuts and seeds in moderation",
            ],
            "foods_to_avoid": [
                "Sugary beverages", "White bread and pastries",
                "Sweets and candy", "Fried foods", "Processed snacks",
            ],
            "portion_guide": "Use the plate method: ½ non-starchy veg, ¼ lean protein, ¼ starchy carbs.",
        },
        "heart_health": {
            "title": "Heart-Healthy Nutrition Guide",
            "principles": [
                "Follow a Mediterranean-style eating pattern.",
                "Reduce sodium intake to less than 5 g of salt per day (WHO guideline).",
                "Limit saturated fats — replace with unsaturated fats.",
                "Increase omega-3 fatty acids (fatty fish, flaxseed, walnuts).",
                "Eat plenty of fibre-rich foods (oats, beans, vegetables).",
                "Limit alcohol and avoid trans fats entirely.",
            ],
            "recommended_foods": [
                "Fatty fish (salmon, mackerel, sardines) — 2+ servings/week",
                "Oats and barley (beta-glucan for cholesterol)",
                "Nuts (almonds, walnuts) — a handful daily",
                "Olive oil as primary fat source",
                "Fruits and vegetables — variety of colours",
                "Legumes — at least 3 servings per week",
            ],
            "foods_to_limit": [
                "Processed meats (sausages, bacon)",
                "Full-fat dairy and cheese (limit quantities)",
                "Foods high in trans fats (some baked goods, margarine)",
                "High-sodium processed foods",
                "Excessive alcohol",
            ],
            "lifestyle_tips": [
                "Aim for 150 minutes of moderate exercise per week.",
                "Maintain a healthy weight.",
                "Manage stress through relaxation techniques.",
                "Quit smoking if applicable.",
            ],
        },
    }

    # --- Common medication reference (educational) ---
    _MEDICATION_REFERENCE: Dict[str, Dict] = {
        "paracetamol": {
            "generic_name": "Paracetamol (Acetaminophen)",
            "common_brands": "Panado, Calpol, Tylenol",
            "uses": "Mild to moderate pain relief; fever reduction.",
            "typical_dosage_adult": "500 mg – 1 g every 4–6 hours (max 4 g/day).",
            "typical_dosage_child": "10–15 mg/kg every 4–6 hours (max 60 mg/kg/day).",
            "warnings": "Do not exceed recommended dose — risk of severe liver damage. Avoid alcohol.",
            "side_effects": "Generally well-tolerated; rare allergic reactions.",
        },
        "ibuprofen": {
            "generic_name": "Ibuprofen",
            "common_brands": "Advil, Nurofen, Brufen",
            "uses": "Pain relief, inflammation reduction, fever reduction.",
            "typical_dosage_adult": "200–400 mg every 4–6 hours (max 1.2 g/day OTC).",
            "typical_dosage_child": "5–10 mg/kg every 6–8 hours.",
            "warnings": "Take with food. Avoid if you have stomach ulcers, kidney disease, or are in late pregnancy.",
            "side_effects": "Stomach upset, heartburn, dizziness; long-term use may affect kidneys.",
        },
        "amoxicillin": {
            "generic_name": "Amoxicillin",
            "common_brands": "Amoxil, Trimox, Moxypen",
            "uses": "Bacterial infections — respiratory, ear, urinary tract, skin.",
            "typical_dosage_adult": "250–500 mg every 8 hours (severity-dependent).",
            "warnings": "Complete full course. Do not use for viral infections. Avoid if allergic to penicillin.",
            "side_effects": "Nausea, diarrhoea, rash; seek help for severe allergic reaction (anaphylaxis).",
        },
        "metformin": {
            "generic_name": "Metformin",
            "common_brands": "Glucophage, Diabex",
            "uses": "Type 2 diabetes management; improves insulin sensitivity.",
            "typical_dosage_adult": "Starting 500 mg twice daily with meals; titrated up.",
            "warnings": "Take with food to reduce GI upset. Regular kidney function monitoring required.",
            "side_effects": "Nausea, diarrhoea, abdominal discomfort, metallic taste.",
        },
        "lisinopril": {
            "generic_name": "Lisinopril",
            "common_brands": "Zestril, Prinivil",
            "uses": "High blood pressure (hypertension); heart failure; post-heart attack care.",
            "typical_dosage_adult": "5–40 mg once daily.",
            "warnings": "Can cause dizziness. Avoid in pregnancy. Monitor potassium and kidney function.",
            "side_effects": "Dry cough, dizziness, elevated potassium, fatigue.",
        },
        "aspirin": {
            "generic_name": "Aspirin (Acetylsalicylic Acid)",
            "common_brands": "Disprin, Bayer Aspirin",
            "uses": "Pain relief, anti-inflammatory, blood thinner (low-dose for heart protection).",
            "typical_dosage_adult": "300–900 mg every 4–6 hours for pain; 75–100 mg daily for cardio-protection.",
            "warnings": "Not for children under 16 (Reye's syndrome risk). Avoid with bleeding disorders or before surgery.",
            "side_effects": "Stomach irritation, bleeding risk, tinnitus at high doses.",
        },
        "loratadine": {
            "generic_name": "Loratadine",
            "common_brands": "Clarityne, Allergex Non-Drowsy",
            "uses": "Allergic rhinitis (hay fever), urticaria (hives).",
            "typical_dosage_adult": "10 mg once daily.",
            "warnings": "Non-drowsy but may still cause mild sedation in some. Caution with liver/kidney impairment.",
            "side_effects": "Headache, dry mouth, mild drowsiness.",
        },
        "omeprazole": {
            "generic_name": "Omeprazole",
            "common_brands": "Losec, Ultak",
            "uses": "Acid reflux, GERD, stomach ulcers, Zollinger-Ellison syndrome.",
            "typical_dosage_adult": "20–40 mg once daily before breakfast.",
            "warnings": "Long-term use may affect B12 and magnesium absorption. Consult a doctor for prolonged use.",
            "side_effects": "Headache, nausea, diarrhoea, vitamin B12 deficiency with long-term use.",
        },
    }

    # --- BMI category thresholds (WHO) ---
    _BMI_CATEGORIES = [
        (0, 18.5, "Underweight", "Moderate nutritional deficiency risk."),
        (18.5, 25.0, "Normal weight", "Low health risk."),
        (25.0, 30.0, "Overweight", "Increased risk of cardiovascular disease."),
        (30.0, 35.0, "Obese Class I", "High risk — weight management recommended."),
        (35.0, 40.0, "Obese Class II", "Very high risk — medical intervention advised."),
        (40.0, float("inf"), "Obese Class III", "Extremely high risk — immediate medical attention."),
    ]

    def calculate_bmi(self, height_m: float, weight_kg: float) -> dict:
        """Calculate Body Mass Index (BMI) and return category + health risk.

        Args:
            height_m: Height in metres (e.g., 1.75).
            weight_kg: Weight in kilograms (e.g., 70).

        Returns:
            Dictionary with keys: result, data, status.
        """
        if height_m <= 0 or weight_kg <= 0:
            return {
                "result": "Invalid input",
                "data": {"error": "Height and weight must be positive values."},
                "status": "error",
            }

        bmi = weight_kg / (height_m ** 2)
        category = "Unknown"
        risk = "Unknown"
        for low, high, cat, rsk in self._BMI_CATEGORIES:
            if low <= bmi < high:
                category = cat
                risk = rsk
                break

        return {
            "result": f"BMI: {bmi:.1f} — {category}",
            "data": {
                "bmi": round(bmi, 2),
                "category": category,
                "health_risk": risk,
                "height_m": height_m,
                "weight_kg": weight_kg,
                "ideal_weight_range_kg": {
                    "min": round(18.5 * (height_m ** 2), 1),
                    "max": round(24.9 * (height_m ** 2), 1),
                },
            },
            "status": "success",
        }

    def calculate_bmr(self, weight_kg: float, height_cm: float, age: int, gender: str) -> dict:
        """Calculate Basal Metabolic Rate (BMR) using the Mifflin-St Jeor equation.

        Args:
            weight_kg: Weight in kilograms.
            height_cm: Height in centimetres.
            age: Age in years.
            gender: 'male' or 'female' (case-insensitive).

        Returns:
            Dictionary with BMR value and estimated daily calorie needs by activity level.
        """
        if weight_kg <= 0 or height_cm <= 0 or age <= 0:
            return {
                "result": "Invalid input",
                "data": {"error": "Weight, height, and age must be positive values."},
                "status": "error",
            }

        gender_lower = gender.lower().strip()
        if gender_lower not in ("male", "female"):
            return {
                "result": "Invalid gender",
                "data": {"error": "Gender must be 'male' or 'female'."},
                "status": "error",
            }

        if gender_lower == "male":
            bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
        else:
            bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

        activity_multipliers = {
            "sedentary": 1.2,
            "lightly_active": 1.375,
            "moderately_active": 1.55,
            "very_active": 1.725,
            "extra_active": 1.9,
        }

        tdee_estimates = {
            level: round(bmr * mult) for level, mult in activity_multipliers.items()
        }

        return {
            "result": f"BMR: {bmr:.0f} kcal/day",
            "data": {
                "bmr_kcal": round(bmr, 1),
                "weight_kg": weight_kg,
                "height_cm": height_cm,
                "age": age,
                "gender": gender_lower,
                "tdee_estimates_kcal": tdee_estimates,
                "note": "TDEE = Total Daily Energy Expenditure based on activity level.",
            },
            "status": "success",
        }

    def get_medication_info(self, medication_name: str) -> dict:
        """Return educational information about a common medication.

        Args:
            medication_name: Common or generic name of the medication.

        Returns:
            Dictionary with medication details and a medical disclaimer.
        """
        key = medication_name.lower().strip()
        info = self._MEDICATION_REFERENCE.get(key)

        if not info:
            available = ", ".join(sorted(self._MEDICATION_REFERENCE.keys()))
            return {
                "result": f"'{medication_name}' not found in reference database.",
                "data": {
                    "available_medications": available,
                    "note": "Search using generic names (e.g., 'paracetamol', 'ibuprofen').",
                },
                "status": "not_found",
            }

        return {
            "result": f"Medication info: {info['generic_name']}",
            "data": {**info},
            "status": "success",
            "disclaimer": (
                "This information is for educational purposes only and is not a substitute "
                "for professional medical advice, diagnosis, or treatment. Always consult a "
                "qualified healthcare provider before taking any medication."
            ),
        }

    def get_first_aid_guide(self, emergency_type: str) -> dict:
        """Return first aid steps for a given emergency type.

        Args:
            emergency_type: One of: choking, burns, bleeding, cpr, fracture, poisoning.

        Returns:
            Dictionary with step-by-step first aid instructions.
        """
        key = emergency_type.lower().strip()
        guide = self._FIRST_AID_GUIDES.get(key)

        if not guide:
            available = ", ".join(sorted(self._FIRST_AID_GUIDES.keys()))
            return {
                "result": f"'{emergency_type}' not found in first aid database.",
                "data": {
                    "available_guides": available,
                    "note": "Try: choking, burns, bleeding, cpr, fracture, poisoning.",
                },
                "status": "not_found",
            }

        return {
            "result": guide["title"],
            "data": guide,
            "status": "success",
            "disclaimer": (
                "This first aid guide is for educational purposes only. In a medical emergency, "
                "call emergency services immediately (10177 in South Africa or 112). "
                "Consider taking a certified first aid course."
            ),
        }

    def get_nutrition_guide(self, goal: str = "general") -> dict:
        """Return a nutrition guide tailored to a specific health goal.

        Args:
            goal: One of: general, weight_loss, muscle_gain, diabetes, heart_health.

        Returns:
            Dictionary with nutrition principles, targets, and sample meals.
        """
        key = goal.lower().strip().replace(" ", "_")
        guide = self._NUTRITION_GUIDES.get(key)

        if not guide:
            available = ", ".join(sorted(self._NUTRITION_GUIDES.keys()))
            return {
                "result": f"'{goal}' nutrition guide not found.",
                "data": {
                    "available_goals": available,
                    "note": "Try: general, weight_loss, muscle_gain, diabetes, heart_health.",
                },
                "status": "not_found",
            }

        return {
            "result": guide["title"],
            "data": guide,
            "status": "success",
            "disclaimer": (
                "This nutrition guide is for educational purposes only. Consult a registered "
                "dietitian or healthcare provider for personalised dietary advice, especially "
                "if you have existing health conditions."
            ),
        }
