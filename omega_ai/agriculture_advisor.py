"""
Agriculture & Farming Advisor Module
====================================
Provides crop guides, livestock guides, yield calculations,
pest and disease information, and market price data for South Africa.

All methods return dictionaries with 'result', 'data', and 'status' keys.
Data is SA-focused with realistic estimates for local conditions.
"""

from typing import Dict, List, Optional


class AgricultureAdvisor:
    """Agriculture and farming advisor for South African conditions.
    Covers major field crops, livestock, pest management, and market data."""

    # --- Crop guides (pre-seeded) ---
    _CROP_GUIDES: Dict[str, Dict] = {
        "maize": {
            "common_name": "Maize (Corn)",
            "scientific_name": "Zea mays",
            "optimal_planting_window": "October – December (summer rainfall areas)",
            "soil_requirements": {
                "type": "Well-drained loam to clay-loam",
                "ph": "5.5 – 7.0",
                "depth": "At least 600 mm deep, no restrictive layers",
            },
            "climate": {
                "rainfall": "500 – 750 mm per season",
                "temperature": "18 – 30°C during growing season",
                "frost_sensitivity": "Highly sensitive to frost — plant after last frost",
            },
            "planting": {
                "row_spacing": "0.9 – 1.5 m (mechanised); 0.75 – 1 m (hand-planting)",
                "plant_spacing": "150 – 250 mm within row",
                "seed_rate": "15 – 25 kg/ha depending on variety and spacing",
                "planting_depth": "25 – 50 mm",
            },
            "fertiliser": {
                "n": "100 – 250 kg/ha N (split application)",
                "p": "20 – 50 kg/ha P",
                "k": "20 – 50 kg/ha K",
                "note": "Soil analysis recommended for precise recommendations.",
            },
            "growth_stages": [
                "Germination (VE–V2): 7–14 days after planting",
                "Vegetative (V3–V12): Rapid leaf development",
                "Tasselling (VT): Male flower emergence",
                "Silking (R1): Female flower emergence — critical for yield",
                "Grain filling (R2–R5): Kernel development",
                "Maturity (R6): Black layer formation",
            ],
            "harvest": {
                "indicator": "Black layer formed at kernel base; moisture 20–25%",
                "method": "Mechanical combine harvesting",
                "yield_range_t_ha": "3 – 10 t/ha (dryland); 8 – 15 t/ha (irrigation)",
                "storage_moisture": "Below 13% for safe storage",
            },
            "major_regions_sa": [
                "Free State (large-scale production)",
                "North West",
                "Mpumalanga",
                "KwaZulu-Natal",
            ],
            "pests_and_diseases": ["Fall armyworm", "Maize stalk borer", "Rust", "Grey leaf spot"],
        },
        "wheat": {
            "common_name": "Wheat",
            "scientific_name": "Triticum aestivum",
            "optimal_planting_window": "April – July (winter rainfall: Western Cape); May – July (summer: Free State)",
            "soil_requirements": {
                "type": "Well-drained loam to clay-loam",
                "ph": "5.5 – 7.5",
                "depth": "At least 450 mm",
            },
            "climate": {
                "rainfall": "300 – 600 mm per season, or irrigation",
                "temperature": "15 – 25°C; vernalisation requires cool winter temperatures",
                "frost_sensitivity": "Moderate — young plants tolerate mild frost",
            },
            "planting": {
                "row_spacing": "150 – 250 mm",
                "seed_rate": "50 – 100 kg/ha depending on variety and seed size",
                "planting_depth": "25 – 50 mm",
            },
            "fertiliser": {
                "n": "60 – 150 kg/ha N (split application)",
                "p": "15 – 30 kg/ha P",
                "k": "15 – 30 kg/ha K",
                "note": "Top-dress N at tillering and stem elongation stages.",
            },
            "growth_stages": [
                "Germination: 5–10 days",
                "Tillering: Formation of side shoots",
                "Stem elongation: Rapid height increase",
                "Heading: Ear emergence",
                "Flowering: Pollination (6–8 days)",
                "Grain filling: Starch accumulation in grain",
                "Maturity: Grain hardens, moisture drops",
            ],
            "harvest": {
                "indicator": "Grain moisture below 14%; golden straw colour",
                "method": "Combine harvesting",
                "yield_range_t_ha": "2 – 6 t/ha (dryland); 6 – 10 t/ha (irrigation)",
                "storage_moisture": "Below 12–13%",
            },
            "major_regions_sa": [
                "Western Cape (Swartland, Overberg — winter rainfall)",
                "Free State (summer rainfall)",
                "Northern Cape (irrigation)",
            ],
            "pests_and_diseases": ["Russian wheat aphid", "Take-all", "Stripe rust", "Leaf rust"],
        },
        "soybeans": {
            "common_name": "Soybeans",
            "scientific_name": "Glycine max",
            "optimal_planting_window": "October – December (summer rainfall)",
            "soil_requirements": {
                "type": "Well-drained loam, free of root-restricting layers",
                "ph": "5.8 – 6.5 (acidic soils limit nitrogen fixation)",
                "depth": "At least 600 mm",
            },
            "climate": {
                "rainfall": "450 – 700 mm per season",
                "temperature": "20 – 30°C; sensitive to frost",
                "frost_sensitivity": "Highly sensitive — plant after frost risk has passed",
            },
            "planting": {
                "row_spacing": "380 – 500 mm",
                "seed_rate": "250 000 – 400 000 seeds/ha",
                "planting_depth": "25 – 40 mm",
                "inoculation": "Essential — inoculate seeds with Bradyrhizobium for nitrogen fixation",
            },
            "fertiliser": {
                "n": "0 – 20 kg/ha N (minimal if properly inoculated)",
                "p": "20 – 40 kg/ha P",
                "k": "20 – 40 kg/ha K",
                "note": "Soybeans fix atmospheric nitrogen — inoculation is critical.",
            },
            "growth_stages": [
                "VE–V2: Emergence and early vegetative",
                "V3–V6: Vegetative growth",
                "R1–R2: Beginning bloom",
                "R3–R5: Pod development and seed filling",
                "R6–R8: Full seed to maturity",
            ],
            "harvest": {
                "indicator": "Pods brown, leaves dropped, seeds at 13–15% moisture",
                "method": "Combine harvesting",
                "yield_range_t_ha": "1.5 – 3 t/ha (dryland); 3 – 5 t/ha (irrigation)",
                "storage_moisture": "Below 13%",
            },
            "major_regions_sa": [
                "Mpumalanga",
                "KwaZulu-Natal",
                "Free State",
                "Limpopo",
            ],
            "pests_and_diseases": ["Aphids", "Red spider mite", "Sclerotinia stem rot", "Charcoal rot"],
        },
        "sorghum": {
            "common_name": "Sorghum",
            "scientific_name": "Sorghum bicolor",
            "optimal_planting_window": "October – December",
            "soil_requirements": {
                "type": "Well-drained loam; tolerates poorer soils than maize",
                "ph": "5.0 – 7.5",
                "depth": "At least 450 mm",
            },
            "climate": {
                "rainfall": "400 – 600 mm per season",
                "temperature": "25 – 35°C; heat-tolerant",
                "frost_sensitivity": "Sensitive to frost when young",
            },
            "planting": {
                "row_spacing": "450 – 900 mm",
                "seed_rate": "8 – 15 kg/ha",
                "planting_depth": "25 – 50 mm",
            },
            "fertiliser": {
                "n": "50 – 120 kg/ha N",
                "p": "15 – 30 kg/ha P",
                "k": "15 – 30 kg/ha K",
                "note": "Sorghum is drought-tolerant once established.",
            },
            "growth_stages": [
                "Germination and emergence",
                "3–5 leaf stage",
                "Panicle initiation",
                "Flag leaf stage",
                "Flowering (anthesis)",
                "Soft dough to hard dough",
                "Maturity",
            ],
            "harvest": {
                "indicator": "Grain hard, moisture below 14%",
                "method": "Combine harvesting",
                "yield_range_t_ha": "2 – 6 t/ha (dryland); 5 – 10 t/ha (irrigation)",
                "storage_moisture": "Below 12–13%",
            },
            "major_regions_sa": [
                "Limpopo",
                "North West",
                "Free State",
                "Northern Cape",
            ],
            "pests_and_diseases": ["Sorghum midge", "Aphids", "Anthracnose", "Ergot"],
        },
        "citrus": {
            "common_name": "Citrus (Oranges, Lemons, Grapefruit)",
            "scientific_name": "Citrus spp.",
            "optimal_planting_window": "September – November (spring) or March – April (autumn)",
            "soil_requirements": {
                "type": "Well-drained sandy loam to loam",
                "ph": "5.5 – 7.0",
                "depth": "At least 1 m with no restrictive layers",
            },
            "climate": {
                "rainfall": "800 – 1 500 mm/year, or reliable irrigation",
                "temperature": "13 – 38°C; subtropical climate preferred",
                "frost_sensitivity": "Sensitive — young trees need frost protection",
            },
            "planting": {
                "tree_spacing": "6 × 3 m (high-density) to 7 × 5 m (conventional)",
                "trees_per_ha": "Approximately 250 – 550 trees/ha",
                "planting_hole": "0.5 × 0.5 × 0.5 m, enriched with compost",
                " irrigation": "Essential for commercial production",
            },
            "fertiliser": {
                "n": "200 – 400 g N/tree/year (young trees); 1 – 2 kg N/tree/year (bearing trees)",
                "p": "Based on soil analysis; typically 100 – 300 g P/tree/year",
                "k": "300 – 800 g K/tree/year",
                "micronutrients": "Zinc, manganese, boron, and magnesium commonly required",
                "note": "Leaf analysis guides fertiliser programme for mature orchards.",
            },
            "growth_stages": [
                "Year 1–2: Establishment and vegetative growth",
                "Year 3–4: First light crop",
                "Year 5+: Full commercial production",
                "Flowering: Spring (September–October)",
                "Fruit set and development",
                "Harvest: Varies by variety (May – November)",
            ],
            "harvest": {
                "indicator": "Brix/acid ratio reaches variety-specific standard; colour break",
                "method": "Hand-picking with clippers for export; mechanical aids for processing",
                "yield_range_t_ha": "20 – 60 t/ha (mature orchard, depending on variety and management)",
                "storage": "Cold storage at 4–8°C extends shelf life to 8–12 weeks",
            },
            "major_regions_sa": [
                "Limpopo (Tzaneen, Letsitele)",
                "Mpumalanga (Nelspruit, Hazyview)",
                "Eastern Cape (Kirkwood, Patensie)",
                "Western Cape (Citrusdal)",
            ],
            "pests_and_diseases": ["False codling moth", "Citrus black spot", "Greasy spot", "Citrus psylla"],
        },
        "grapes": {
            "common_name": "Wine and Table Grapes",
            "scientific_name": "Vitis vinifera",
            "optimal_planting_window": "July – September (winter dormancy)",
            "soil_requirements": {
                "type": "Well-drained; tolerates wide range from sandy loam to clay",
                "ph": "5.5 – 7.0",
                "depth": "At least 1 m; shallow soils restrict root development",
            },
            "climate": {
                "rainfall": "Winter rainfall regions preferred (Western Cape); 500 – 800 mm/year",
                "temperature": "15 – 25°C during growing season; 0 – 10°C chill units needed in winter",
                "frost_sensitivity": "Buds sensitive to late spring frost",
            },
            "planting": {
                "row_spacing": "2.7 – 3.5 m between rows",
                "vine_spacing": "1.2 – 1.8 m within row",
                "vines_per_ha": "1 500 – 3 000 vines/ha",
                "trellis_system": "Vertical shoot positioning (VSP) or pergola for table grapes",
            },
            "fertiliser": {
                "n": "30 – 80 kg/ha N (wine grapes — lower end for quality)",
                "p": "Based on soil and leaf analysis",
                "k": "Based on soil and leaf analysis",
                "note": "Over-fertilisation, especially N, reduces wine quality.",
            },
            "growth_stages": [
                "Bud break (September)",
                "Shoot growth (September–October)",
                "Flowering and fruit set (November)",
                "Berry development and veraison (colour change)",
                "Ripening (January–March)",
                "Harvest (February–April for wine; November–January for early table grapes)",
                "Post-harvest: Leaf fall and dormancy",
            ],
            "harvest": {
                "indicator": "Sugar content (°Brix), acid levels, pH, and taste for wine grapes; colour and firmness for table grapes",
                "method": "Hand-picking for quality wine and export table grapes; machine harvesting for bulk wine",
                "yield_range_t_ha": "8 – 20 t/ha (wine grapes); 20 – 40 t/ha (table grapes)",
                "storage": "Table grapes stored at -0.5 to 0°C with sulphur dioxide pads",
            },
            "major_regions_sa": [
                "Western Cape (Stellenbosch, Paarl, Franschhoek, Robertson, Worcester)",
                "Northern Cape (Orange River — table grapes)",
                "Eastern Cape (Douglas)",
            ],
            "pests_and_diseases": ["Mealybug", "Light brown apple moth", "Downy mildew", "Powdery mildew", "Botrytis"],
        },
    }

    # --- Livestock guides (pre-seeded) ---
    _LIVESTOCK_GUIDES: Dict[str, Dict] = {
        "cattle": {
            "type": "Cattle Farming",
            "breeds_common_sa": [
                "Nguni (hardy, disease-resistant, indigenous)",
                "Bonsmara (locally developed, excellent beef)",
                "Afrikaner (heat-tolerant, indigenous)",
                "Angus (premium beef, good marbling)",
                "Hereford (hardy, good feed conversion)",
                "Dairy: Holstein-Friesian, Jersey, Ayrshire",
            ],
            "housing": {
                "requirements": "Shelter from wind and rain; adequate space per animal",
                "space_per_head": "3 – 5 m² for feedlot; 10+ m² for pasture-based systems",
                "fencing": "Strong fencing required — cattle-proof (1.2–1.4 m)",
            },
            "feeding": {
                "grazing": "Natural pasture, planted pastures (kikuyu, ryegrass, Eragrostis)",
                "supplement": "Licks, molasses meal, silage in winter",
                "feedlot": "High-energy ration: maize, sorghum, protein supplement",
                "water": "40 – 100 litres per head per day",
            },
            "health": {
                "vaccinations": "Lumpy skin disease, botulism, blackquarter, three-day stiff sickness",
                "parasite_control": "Regular deworming; tick control (East Coast fever prevention)",
                "reproduction": "Bull fertility testing; AI programmes available",
            },
            "production": {
                "calving_rate_target": "75 – 85%",
                "weaning_age": "6 – 8 months",
                "weaning_weight": "180 – 250 kg",
                "market_weight": "220 – 280 kg (weaners); 400+ kg (feedlot finished)",
            },
        },
        "sheep": {
            "type": "Sheep Farming",
            "breeds_common_sa": [
                "Dorper (meat breed, hardy, hair sheep)",
                "Merino (fine wool production)",
                "South African Mutton Merino (dual-purpose)",
                "Dohne Merino (dual-purpose)",
                "White Dorper",
                "Damara (indigenous, hardy)",
            ],
            "housing": {
                "requirements": "Kraals for handling; shelters for lambing in cold areas",
                "space_per_head": "1 – 2 m² in kraals; 2 – 4 ha/100 sheep on natural veld",
                "fencing": "Sheep-proof fencing; jackal-proof fencing in predator areas",
            },
            "feeding": {
                "grazing": "Natural veld, planted pastures, crop residues",
                "supplement": "Maize, lucerne hay, protein licks during dry season",
                "water": "2 – 4 litres per head per day",
            },
            "health": {
                "vaccinations": "Enterotoxaemia (pulpy kidney), bluetongue, botulism",
                "parasite_control": "Regular deworming; internal and external parasites",
                "dipping": "Weekly during summer for tick and fly control",
            },
            "production": {
                "lambing_rate_target": "100 – 140% (1.0 – 1.4 lambs per ewe)",
                "weaning_age": "3 – 4 months",
                "weaning_weight": "25 – 35 kg",
                "market_weight": "35 – 45 kg (lambs)",
            },
        },
        "goats": {
            "type": "Goat Farming",
            "breeds_common_sa": [
                "Boer goat (premium meat goat)",
                "Kalahari Red (meat breed, good mothering)",
                "Savannah (white Boer variant)",
                "Angora (mohair production — Eastern Cape)",
                "Indigenous veld goats (hardy, disease-resistant)",
            ],
            "housing": {
                "requirements": "Simple shelters; goats tolerate heat but need rain protection",
                "space_per_head": "1 – 2 m²; minimum 500 m² per goat for browsing",
                "fencing": "Goat-proof fencing required — goats are excellent climbers and jumpers",
            },
            "feeding": {
                "grazing": "Browsers — shrubs, bushes, tree leaves; complement with grass",
                "supplement": "Licks, hay, grain during dry periods",
                "water": "2 – 5 litres per head per day",
            },
            "health": {
                "vaccinations": "Enterotoxaemia, pulpy kidney, tetanus",
                "parasite_control": "Regular deworming; coccidiosis control in kids",
                "foot_care": "Regular hoof trimming; foot rot prevention",
            },
            "production": {
                "kidding_rate_target": "150 – 200%",
                "weaning_age": "3 – 4 months",
                "weaning_weight": "15 – 25 kg",
                "market_weight": "30 – 45 kg (meat goats)",
            },
        },
        "poultry": {
            "type": "Poultry Farming (Broilers and Layers)",
            "systems": [
                "Intensive indoor (controlled environment)",
                "Free-range (outdoor access during day)",
                "Organic (no synthetic inputs, certified)",
            ],
            "breeds_common_sa": [
                "Broilers: Ross 308, Cobb 500 (fast-growing meat birds)",
                "Layers: Lohmann Brown, Hy-Line Brown, Novogen Brown",
                "Indigenous: Venda, Naked Neck, Ovambo (hardy, slower-growing)",
            ],
            "housing": {
                "requirements": "Well-ventilated, temperature-controlled housing",
                "space_per_bird": "Broilers: 15 – 20 birds/m²; Layers: 450 cm² per bird (cage); 6 – 10 birds/m² (free-range house)",
                "biosecurity": "Essential — foot baths, controlled access, all-in-all-out system",
            },
            "feeding": {
                "broiler_starter": "High protein (22–24%) for first 10 days",
                "broiler_grower": "18–20% protein until day 24",
                "broiler_finisher": "18% protein from day 24 to slaughter",
                "layer_rations": "16–18% protein with 3.5–4% calcium for shell formation",
                "water": "Broilers: 1.5 – 2× feed intake; Layers: 200 – 250 ml/bird/day",
            },
            "health": {
                "vaccinations": "Newcastle disease (mandatory in SA), Infectious Bronchitis, Gumboro (IBD), Avian Encephalomyelitis",
                "biosecurity": "Strict biosecurity is the most critical health measure",
                "coccidiosis": "Prevent via coccidiostats in feed or vaccination",
            },
            "production": {
                "broiler_cycle": "35 – 42 days to market (1.8 – 2.2 kg live weight)",
                "feed_conversion_ratio": "1.6 – 1.9 (kg feed per kg gain)",
                "layer_age_at_first_egg": "18 – 22 weeks",
                "peak_egg_production": "90 – 95% (weeks 28–40)",
                "eggs_per_hen_per_year": "280 – 320 eggs",
            },
        },
    }

    # --- Yield calculation lookup tables ---
    _YIELD_TABLES: Dict[str, Dict] = {
        "maize": {"base_yield_t_ha": 4.5, "water_factor": 0.008, "name": "Maize"},
        "wheat": {"base_yield_t_ha": 3.0, "water_factor": 0.006, "name": "Wheat"},
        "soybeans": {"base_yield_t_ha": 2.0, "water_factor": 0.005, "name": "Soybeans"},
        "sorghum": {"base_yield_t_ha": 3.5, "water_factor": 0.007, "name": "Sorghum"},
        "citrus": {"base_yield_t_ha": 25.0, "water_factor": 0.02, "name": "Citrus"},
        "grapes": {"base_yield_t_ha": 12.0, "water_factor": 0.01, "name": "Grapes"},
    }

    # --- Pest and disease info (pre-seeded) ---
    _PEST_DISEASE_INFO: Dict[str, List[Dict]] = {
        "maize": [
            {"name": "Fall armyworm", "type": "Pest", "symptoms": "Ragged holes in leaves, defoliation, damaged whorls", "control": "Early monitoring, registered insecticides, biological control (Trichogramma wasps)"},
            {"name": "Maize stalk borer", "type": "Pest", "symptoms": "Dead heart in young plants, holes in stems and cobs", "control": "Bt maize varieties, cultural control, chemical control"},
            {"name": "Maize rust", "type": "Disease", "symptoms": "Orange-brown pustules on leaves", "control": "Resistant varieties, fungicides if severe"},
            {"name": "Grey leaf spot", "type": "Disease", "symptoms": "Rectangular grey lesions on leaves", "control": "Resistant varieties, crop rotation, fungicides"},
        ],
        "wheat": [
            {"name": "Russian wheat aphid", "type": "Pest", "symptoms": "Rolled leaves, stunted growth, honeydew secretion", "control": "Resistant varieties, systemic insecticides"},
            {"name": "Stripe rust", "type": "Disease", "symptoms": "Yellow-orange stripes of pustules on leaves", "control": "Resistant varieties, timely fungicide application"},
            {"name": "Leaf rust", "type": "Disease", "symptoms": "Brown pustules on leaves reducing photosynthesis", "control": "Resistant varieties, fungicides"},
            {"name": "Take-all", "type": "Disease", "symptoms": "Blackened roots and stem base, white heads", "control": "Crop rotation, avoid consecutive wheat crops"},
        ],
        "soybeans": [
            {"name": "Aphids", "type": "Pest", "symptoms": "Clusters on new growth, curled leaves, stunted plants", "control": "Natural predators, threshold-based insecticide use"},
            {"name": "Red spider mite", "type": "Pest", "symptoms": "Yellow stippling on leaves, webbing on undersides", "control": "Miticides, adequate irrigation (mites thrive in dry conditions)"},
            {"name": "Sclerotinia stem rot", "type": "Disease", "symptoms": "White cottony growth on stems, wilting", "control": "Resistant varieties, crop rotation, fungicides"},
            {"name": "Charcoal rot", "type": "Disease", "symptoms": "Tiny black dots in stem tissue, plant death in dry conditions", "control": "Irrigation management, resistant varieties"},
        ],
        "sorghum": [
            {"name": "Sorghum midge", "type": "Pest", "symptoms": "Empty spikelets, damaged grain", "control": "Resistant varieties, synchronised planting, insecticides"},
            {"name": "Aphids", "type": "Pest", "symptoms": "Honeydew on leaves, sooty mould", "control": "Systemic insecticides, biological control"},
            {"name": "Anthracnose", "type": "Disease", "symptoms": "Sunken lesions on stalks and heads", "control": "Resistant varieties, seed treatment, crop rotation"},
            {"name": "Ergot", "type": "Disease", "symptoms": "Honeydew exuding from infected florets, hard sclerotia", "control": "Resistant varieties, clean seed"},
        ],
        "citrus": [
            {"name": "False codling moth", "type": "Pest", "symptoms": "Fruit drop, internal larval tunnels", "control": "SIT (sterile insect technique), mating disruption, orchard sanitation"},
            {"name": "Citrus black spot", "type": "Disease", "symptoms": "Black lesions on fruit, premature fruit drop", "control": "Fungicide sprays, orchard sanitation, resistant varieties"},
            {"name": "Greasy spot", "type": "Disease", "symptoms": "Yellow-brown blister spots on leaves", "control": "Fungicides, orchard floor management"},
            {"name": "Citrus psylla", "type": "Pest", "symptoms": "Twisted young leaves, honeydew, sooty mould", "control": "Systemic insecticides, biological control agents"},
        ],
        "grapes": [
            {"name": "Mealybug", "type": "Pest", "symptoms": "White fluffy masses in leaf axils, sooty mould", "control": "Biological control (Anagyrus wasp), selective insecticides"},
            {"name": "Light brown apple moth", "type": "Pest", "symptoms": "Bunched berries, webbing, larval feeding damage", "control": "Mating disruption, biological control, selective insecticides"},
            {"name": "Downy mildew", "type": "Disease", "symptoms": "Yellow oil spots on upper leaf surface, white growth below", "control": "Preventive fungicides, canopy management"},
            {"name": "Powdery mildew", "type": "Disease", "symptoms": "White powdery coating on leaves, fruit, and shoots", "control": "Sulphur sprays, systemic fungicides, resistant rootstocks"},
            {"name": "Botrytis (grey rot)", "type": "Disease", "symptoms": "Grey fuzzy mould on berries, especially in wet conditions", "control": "Canopy management, fungicides — 'noble rot' desired for some wines"},
        ],
    }

    # --- Market prices (realistic SA demo data) ---
    _MARKET_PRICES: Dict[str, Dict] = {
        "white_maize": {"commodity": "White Maize", "unit": "per tonne", "price_range_zar": "3 200 – 4 200", "typical_price_zar": 3700, "exchange": "JSE/Safex", "grade": "Grade 1"},
        "yellow_maize": {"commodity": "Yellow Maize", "unit": "per tonne", "price_range_zar": "3 000 – 3 900", "typical_price_zar": 3500, "exchange": "JSE/Safex", "grade": "Grade 1"},
        "wheat": {"commodity": "Wheat (Bread Grade)", "unit": "per tonne", "price_range_zar": "5 500 – 6 800", "typical_price_zar": 6200, "exchange": "JSE/Safex", "grade": "B1 Grade"},
        "soybeans": {"commodity": "Soybeans", "unit": "per tonne", "price_range_zar": "6 500 – 8 500", "typical_price_zar": 7500, "exchange": "JSE/Safex", "grade": "Grade SB1"},
        "sorghum": {"commodity": "Sorghum (Malt Grade)", "unit": "per tonne", "price_range_zar": "3 800 – 4 800", "typical_price_zar": 4300, "exchange": "JSE/Safex", "grade": "Grade M1"},
        "sunflower": {"commodity": "Sunflower Seed", "unit": "per tonne", "price_range_zar": "7 000 – 9 000", "typical_price_zar": 8000, "exchange": "JSE/Safex", "grade": "Grade 1"},
        "canola": {"commodity": "Canola", "unit": "per tonne", "price_range_zar": "6 500 – 8 000", "typical_price_zar": 7200, "exchange": "JSE/Safex", "grade": "Grade 1"},
        "beef": {"commodity": "Beef (A2/A3 carcass)", "unit": "per kg carcass weight", "price_range_zar": "52 – 62", "typical_price_zar": 57, "exchange": "SA Feedlot Association / Red Meat Abattoir Association", "grade": "A2/A3"},
        "lamb": {"commodity": "Lamb (C-grade carcass)", "unit": "per kg carcass weight", "price_range_zar": "78 – 95", "typical_price_zar": 86, "exchange": "National Lamb Committee", "grade": "C-grade"},
        "chicken": {"commodity": "Whole Chicken (fresh)", "unit": "per kg", "price_range_zar": "38 – 48", "typical_price_zar": 43, "exchange": "Retail / SAPA", "grade": "A-grade"},
        "eggs": {"commodity": "Large Eggs (dozen)", "unit": "per dozen", "price_range_zar": "28 – 36", "typical_price_zar": 32, "exchange": "Retail", "grade": "Jumbo"},
        "milk": {"commodity": "Fresh Milk (producer price)", "unit": "per litre", "price_range_zar": "5.50 – 6.80", "typical_price_zar": 6.20, "exchange": "Milk SA", "grade": "Class A"},
    }

    def get_crop_guide(self, crop_name: str, region: str = "south_africa") -> dict:
        """Return a detailed crop guide for planting, care, and harvest.

        Args:
            crop_name: Name of the crop (e.g., maize, wheat, soybeans, sorghum,
                       citrus, grapes).
            region: Geographic region (default: south_africa).

        Returns:
            Dictionary with comprehensive crop information.
        """
        key = crop_name.lower().strip()
        guide = self._CROP_GUIDES.get(key)

        if not guide:
            available = ", ".join(sorted(self._CROP_GUIDES.keys()))
            return {
                "result": f"Crop '{crop_name}' not found in database.",
                "data": {
                    "available_crops": available,
                    "note": "Try: maize, wheat, soybeans, sorghum, citrus, grapes.",
                },
                "status": "not_found",
            }

        return {
            "result": f"Crop Guide: {guide['common_name']}",
            "data": guide,
            "region": region,
            "status": "success",
        }

    def get_livestock_guide(self, animal_type: str) -> dict:
        """Return a livestock farming guide for a given animal type.

        Args:
            animal_type: One of: cattle, sheep, goats, poultry.

        Returns:
            Dictionary with livestock farming information.
        """
        key = animal_type.lower().strip()
        guide = self._LIVESTOCK_GUIDES.get(key)

        if not guide:
            available = ", ".join(sorted(self._LIVESTOCK_GUIDES.keys()))
            return {
                "result": f"Livestock guide for '{animal_type}' not found.",
                "data": {
                    "available_livestock": available,
                    "note": "Try: cattle, sheep, goats, poultry.",
                },
                "status": "not_found",
            }

        return {
            "result": f"Livestock Guide: {guide['type']}",
            "data": guide,
            "status": "success",
        }

    def calculate_yield(self, crop: str, hectares: float, rainfall_mm: float = None) -> dict:
        """Estimate expected crop yield based on crop type, area, and optional rainfall.

        Args:
            crop: Crop name (maize, wheat, soybeans, sorghum, citrus, grapes).
            hectares: Area planted in hectares.
            rainfall_mm: Optional seasonal rainfall in millimetres for adjustment.

        Returns:
            Dictionary with estimated yield in tonnes and revenue potential.
        """
        key = crop.lower().strip()
        crop_data = self._YIELD_TABLES.get(key)

        if not crop_data:
            available = ", ".join(sorted(self._YIELD_TABLES.keys()))
            return {
                "result": f"Crop '{crop}' not in yield database.",
                "data": {"available_crops": available},
                "status": "not_found",
            }

        if hectares <= 0:
            return {
                "result": "Invalid input",
                "data": {"error": "Hectares must be a positive value."},
                "status": "error",
            }

        base_yield = crop_data["base_yield_t_ha"]

        # Adjust yield based on rainfall if provided
        if rainfall_mm is not None:
            water_adjustment = min(rainfall_mm * crop_data["water_factor"], base_yield * 0.8)
            adjusted_yield_per_ha = base_yield * 0.6 + water_adjustment
        else:
            adjusted_yield_per_ha = base_yield

        # Clamp to realistic range
        adjusted_yield_per_ha = max(adjusted_yield_per_ha, base_yield * 0.3)
        total_yield = adjusted_yield_per_ha * hectares

        # Get price estimate if available
        market_data = self._MARKET_PRICES.get(key)
        if market_data:
            price_per_tonne = market_data.get("typical_price_zar", 0)
            estimated_revenue = total_yield * price_per_tonne
        else:
            price_per_tonne = 0
            estimated_revenue = 0

        return {
            "result": f"Estimated yield for {crop_data['name']}: {total_yield:.1f} tonnes",
            "data": {
                "crop": crop_data["name"],
                "hectares": hectares,
                "base_yield_t_ha": base_yield,
                "adjusted_yield_t_ha": round(adjusted_yield_per_ha, 2),
                "total_yield_tonnes": round(total_yield, 2),
                "rainfall_mm": rainfall_mm,
                "estimated_revenue_zar": round(estimated_revenue, 2) if estimated_revenue > 0 else "Price data not available",
                "price_per_tonne_zar": price_per_tonne if price_per_tonne > 0 else "N/A",
                "note": "Yield estimates are indicative and depend on management practices, soil fertility, and variety.",
            },
            "status": "success",
        }

    def get_pest_disease_info(self, crop: str) -> dict:
        """Return common pests and diseases for a specified crop with control measures.

        Args:
            crop: Crop name (maize, wheat, soybeans, sorghum, citrus, grapes).

        Returns:
            Dictionary with pest and disease information.
        """
        key = crop.lower().strip()
        info = self._PEST_DISEASE_INFO.get(key)

        if not info:
            available = ", ".join(sorted(self._PEST_DISEASE_INFO.keys()))
            return {
                "result": f"Pest/disease info for '{crop}' not found.",
                "data": {
                    "available_crops": available,
                    "note": "Try: maize, wheat, soybeans, sorghum, citrus, grapes.",
                },
                "status": "not_found",
            }

        return {
            "result": f"Pests and Diseases: {crop.title()}",
            "data": {
                "crop": crop,
                "pests_and_diseases": info,
                "general_recommendation": (
                    "Integrated Pest Management (IPM) is recommended: combine cultural, "
                    "biological, and chemical control methods. Always follow label instructions "
                    "and observe withholding periods. Consult an agricultural extension officer "
                    "for specific recommendations."
                ),
            },
            "status": "success",
        }

    def get_market_prices(self, commodity: str = None) -> dict:
        """Return market price information for South African agricultural commodities.

        Args:
            commodity: Specific commodity name (e.g., 'white_maize', 'beef').
                       If None, all commodities are returned.

        Returns:
            Dictionary with price data.
        """
        if commodity is None:
            return {
                "result": "SA Agricultural Market Prices — All Commodities",
                "data": self._MARKET_PRICES,
                "status": "success",
                "disclaimer": (
                    "Prices are indicative estimates for educational purposes. "
                    "Actual market prices fluctuate daily. Refer to JSE/Safex, Red Meat "
                    "Abattoir Association, or relevant commodity organisations for live prices."
                ),
            }

        key = commodity.lower().strip().replace(" ", "_")
        data = self._MARKET_PRICES.get(key)

        if not data:
            available = ", ".join(sorted(self._MARKET_PRICES.keys()))
            return {
                "result": f"Commodity '{commodity}' not found.",
                "data": {
                    "available_commodities": available,
                    "note": "Use the commodity key (e.g., 'white_maize', 'beef', 'lamb').",
                },
                "status": "not_found",
            }

        return {
            "result": f"Market Price: {data['commodity']}",
            "data": data,
            "status": "success",
            "disclaimer": (
                "Prices are indicative estimates for educational purposes. "
                "Actual market prices fluctuate daily."
            ),
        }
