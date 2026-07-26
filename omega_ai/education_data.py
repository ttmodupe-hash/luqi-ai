"""
Educational Content Data Module
===============================
Comprehensive educational content covering 10 subjects with structured
study plans, practice questions, study tips, and resource recommendations.

Subjects: Mathematics, Physics, Chemistry, Biology, Programming,
          History, Geography, Economics, Literature, Art

Each subject includes:
- Beginner / Intermediate / Advanced study plans with weekly hours
- 5 practice questions per level (15 per subject, 150 total)
- Subject-specific study tips
- Resource recommendations (SA and international)

Usage:
    from education_data import SUBJECTS, PRACTICE_QUESTIONS, STUDY_TIPS
    math_questions = PRACTICE_QUESTIONS["mathematics"]
"""

from typing import Dict, List, Any


# =============================================================================
# SUBJECT METADATA AND STUDY PLANS
# =============================================================================

SUBJECTS: Dict[str, Dict[str, Any]] = {
    "mathematics": {
        "name": "Mathematics",
        "description": "The study of numbers, quantities, shapes, patterns, and structures.",
        "importance": "Foundation for STEM careers; develops logical reasoning and problem-solving skills.",
        "sa_curriculum": "CAPS Mathematics (Grade 10-12); Mathematical Literacy as alternative",
        "study_plans": {
            "beginner": {
                "level": "Beginner (Grades 8-9 / Foundation)",
                "duration_weeks": 12,
                "weekly_hours": 5,
                "topics": [
                    {"week": 1, "topic": "Number systems: integers, fractions, decimals"},
                    {"week": 2, "topic": "Basic algebra: variables, expressions, simple equations"},
                    {"week": 3, "topic": "Ratio, proportion, and percentages"},
                    {"week": 4, "topic": "Basic geometry: angles, triangles, quadrilaterals"},
                    {"week": 5, "topic": "Area and perimeter of 2D shapes"},
                    {"week": 6, "topic": "Volume and surface area of 3D shapes"},
                    {"week": 7, "topic": "Data handling: mean, median, mode, range"},
                    {"week": 8, "topic": "Probability basics"},
                    {"week": 9, "topic": "Number patterns and sequences"},
                    {"week": 10, "topic": "Functions: introduction to linear functions"},
                    {"week": 11, "topic": "Revision and mixed practice"},
                    {"week": 12, "topic": "Assessment and consolidation"}
                ]
            },
            "intermediate": {
                "level": "Intermediate (Grades 10-11 / NQF 4)",
                "duration_weeks": 16,
                "weekly_hours": 7,
                "topics": [
                    {"week": 1, "topic": "Exponents and surds"},
                    {"week": 2, "topic": "Algebraic expressions: factorisation, expansion"},
                    {"week": 3, "topic": "Algebraic equations and inequalities"},
                    {"week": 4, "topic": "Trigonometry: ratios in right triangles"},
                    {"week": 5, "topic": "Trigonometric identities and equations"},
                    {"week": 6, "topic": "Euclidean geometry: circles, triangles, proofs"},
                    {"week": 7, "topic": "Analytical geometry: straight lines"},
                    {"week": 8, "topic": "Functions: linear, quadratic, hyperbola, exponential"},
                    {"week": 9, "topic": "Number patterns: arithmetic and geometric sequences"},
                    {"week": 10, "topic": "Finance: simple and compound interest"},
                    {"week": 11, "topic": "Statistics: standard deviation, quartiles, ogives"},
                    {"week": 12, "topic": "Probability: Venn diagrams, tree diagrams"},
                    {"week": 13, "topic": "Measurement: sine rule, cosine rule, area formulae"},
                    {"week": 14, "topic": "Coordinate geometry"},
                    {"week": 15, "topic": "Revision: mixed problems"},
                    {"week": 16, "topic": "Mock assessment and consolidation"}
                ]
            },
            "advanced": {
                "level": "Advanced (Grade 12 / University First Year)",
                "duration_weeks": 20,
                "weekly_hours": 10,
                "topics": [
                    {"week": 1, "topic": "Algebra: polynomials, remainder and factor theorem"},
                    {"week": 2, "topic": "Algebra: complex numbers and De Moivre's theorem"},
                    {"week": 3, "topic": "Calculus: limits and continuity"},
                    {"week": 4, "topic": "Calculus: differentiation rules (chain, product, quotient)"},
                    {"week": 5, "topic": "Calculus: applications of differentiation"},
                    {"week": 6, "topic": "Calculus: integration techniques"},
                    {"week": 7, "topic": "Calculus: applications of integration (area, volume)"},
                    {"week": 8, "topic": "Trigonometry: compound and double angles"},
                    {"week": 9, "topic": "Trigonometry: solving 3D problems"},
                    {"week": 10, "topic": "Analytical geometry: circles, tangents"},
                    {"week": 11, "topic": "Statistics: normal distribution, confidence intervals"},
                    {"week": 12, "topic": "Probability: binomial, Poisson distributions"},
                    {"week": 13, "topic": "Euclidean geometry: advanced proofs"},
                    {"week": 14, "topic": "Linear algebra: matrices and determinants"},
                    {"week": 15, "topic": "Differential equations: first order"},
                    {"week": 16, "topic": "Sequences and series: convergence"},
                    {"week": 17, "topic": "Financial mathematics: annuities, bond pricing"},
                    {"week": 18, "topic": "Vectors and vector geometry"},
                    {"week": 19, "topic": "Revision: integration of all topics"},
                    {"week": 20, "topic": "Final assessment and exam preparation"}
                ]
            }
        }
    },

    "physics": {
        "name": "Physics",
        "description": "The study of matter, energy, motion, and force — the fundamental science of how the universe works.",
        "importance": "Essential for engineering, technology, medicine, and scientific research careers.",
        "sa_curriculum": "CAPS Physical Sciences (Physics component, Grades 10-12)",
        "study_plans": {
            "beginner": {
                "level": "Beginner (Grades 8-9 / Foundation)",
                "duration_weeks": 10,
                "weekly_hours": 4,
                "topics": [
                    {"week": 1, "topic": "Introduction to physics: scientific method, units (SI)"},
                    {"week": 2, "topic": "Matter: states of matter, phase changes"},
                    {"week": 3, "topic": "Forces: push and pull, balanced and unbalanced forces"},
                    {"week": 4, "topic": "Motion: speed, velocity, distance-time graphs"},
                    {"week": 5, "topic": "Energy: forms of energy, energy transfers"},
                    {"week": 6, "topic": "Heat and temperature: conduction, convection, radiation"},
                    {"week": 7, "topic": "Light: reflection, refraction, shadows"},
                    {"week": 8, "topic": "Sound: waves, pitch, volume"},
                    {"week": 9, "topic": "Electricity: circuits, conductors, insulators"},
                    {"week": 10, "topic": "Magnetism: magnets, magnetic fields, compasses"}
                ]
            },
            "intermediate": {
                "level": "Intermediate (Grades 10-11 / NQF 4)",
                "duration_weeks": 14,
                "weekly_hours": 6,
                "topics": [
                    {"week": 1, "topic": "Vectors and scalars; vector addition"},
                    {"week": 2, "topic": "Kinematics: equations of motion"},
                    {"week": 3, "topic": "Newton's Laws of Motion"},
                    {"week": 4, "topic": "Work, energy, and power"},
                    {"week": 5, "topic": "Momentum and impulse; conservation of momentum"},
                    {"week": 6, "topic": "Waves: transverse and longitudinal, wave equation"},
                    {"week": 7, "topic": "Sound: Doppler effect, ultrasound"},
                    {"week": 8, "topic": "Light: geometrical optics, lenses, mirrors"},
                    {"week": 9, "topic": "Electrostatics: Coulomb's law, electric fields"},
                    {"week": 10, "topic": "Electric circuits: Ohm's law, series and parallel"},
                    {"week": 11, "topic": "Electromagnetism: motors, generators"},
                    {"week": 12, "topic": "Heat and thermodynamics"},
                    {"week": 13, "topic": "Nuclear physics: atomic structure, radioactivity"},
                    {"week": 14, "topic": "Revision and problem-solving"}
                ]
            },
            "advanced": {
                "level": "Advanced (Grade 12 / University First Year)",
                "duration_weeks": 18,
                "weekly_hours": 8,
                "topics": [
                    {"week": 1, "topic": "Newtonian mechanics: advanced applications"},
                    {"week": 2, "topic": "Rotational motion: torque, angular momentum"},
                    {"week": 3, "topic": "Gravitation: Kepler's laws, orbital mechanics"},
                    {"week": 4, "topic": "Fluid mechanics: Bernoulli, viscosity"},
                    {"week": 5, "topic": "Thermodynamics: laws 0-3, entropy, heat engines"},
                    {"week": 6, "topic": "Kinetic theory of gases"},
                    {"week": 7, "topic": "Wave mechanics: interference, diffraction, standing waves"},
                    {"week": 8, "topic": "Physical optics: polarisation, dispersion"},
                    {"week": 9, "topic": "Electrostatics: Gauss's law, electric potential"},
                    {"week": 10, "topic": "DC circuits: Kirchhoff's laws, RC circuits"},
                    {"week": 11, "topic": "Magnetism: Biot-Savart, Ampere's law"},
                    {"week": 12, "topic": "Electromagnetic induction: Faraday, Lenz, AC circuits"},
                    {"week": 13, "topic": "Maxwell's equations introduction"},
                    {"week": 14, "topic": "Modern physics: special relativity basics"},
                    {"week": 15, "topic": "Quantum mechanics: photoelectric effect, Bohr model"},
                    {"week": 16, "topic": "Nuclear physics: binding energy, fission, fusion"},
                    {"week": 17, "topic": "Revision: advanced problem-solving"},
                    {"week": 18, "topic": "Final assessment and exam preparation"}
                ]
            }
        }
    },

    "chemistry": {
        "name": "Chemistry",
        "description": "The study of matter, its composition, properties, and the changes it undergoes.",
        "importance": "Foundation for medicine, pharmacy, engineering, environmental science, and materials science.",
        "sa_curriculum": "CAPS Physical Sciences (Chemistry component, Grades 10-12)",
        "study_plans": {
            "beginner": {
                "level": "Beginner (Grades 8-9 / Foundation)",
                "duration_weeks": 10,
                "weekly_hours": 4,
                "topics": [
                    {"week": 1, "topic": "Introduction to chemistry: matter, pure substances, mixtures"},
                    {"week": 2, "topic": "Elements and the periodic table"},
                    {"week": 3, "topic": "Atoms, molecules, and compounds"},
                    {"week": 4, "topic": "Chemical reactions: signs of reaction"},
                    {"week": 5, "topic": "Acids, bases, and pH"},
                    {"week": 6, "topic": "States of matter: solids, liquids, gases"},
                    {"week": 7, "topic": "Solutions and solubility"},
                    {"week": 8, "topic": "Common chemicals in everyday life"},
                    {"week": 9, "topic": "Safety in the laboratory"},
                    {"week": 10, "topic": "Environmental chemistry: pollution, recycling"}
                ]
            },
            "intermediate": {
                "level": "Intermediate (Grades 10-11 / NQF 4)",
                "duration_weeks": 14,
                "weekly_hours": 6,
                "topics": [
                    {"week": 1, "topic": "Atomic structure: protons, neutrons, electrons"},
                    {"week": 2, "topic": "Periodic table trends and classification"},
                    {"week": 3, "topic": "Chemical bonding: ionic, covalent, metallic"},
                    {"week": 4, "topic": "Molecular geometry and intermolecular forces"},
                    {"week": 5, "topic": "The mole concept and stoichiometry"},
                    {"week": 6, "topic": "Chemical equations and calculations"},
                    {"week": 7, "topic": "Solutions: concentration, dilution"},
                    {"week": 8, "topic": "Acids and bases: theories, titrations, pH calculations"},
                    {"week": 9, "topic": "Redox reactions: oxidation numbers, half-reactions"},
                    {"week": 10, "topic": "Electrochemistry: galvanic cells, electrolysis"},
                    {"week": 11, "topic": "Chemical equilibrium: Le Chatelier's principle"},
                    {"week": 12, "topic": "Reaction rates and factors affecting rates"},
                    {"week": 13, "topic": "Organic chemistry: hydrocarbons, functional groups"},
                    {"week": 14, "topic": "Revision and practical skills"}
                ]
            },
            "advanced": {
                "level": "Advanced (Grade 12 / University First Year)",
                "duration_weeks": 18,
                "weekly_hours": 8,
                "topics": [
                    {"week": 1, "topic": "Quantum chemistry: atomic orbitals, electron configuration"},
                    {"week": 2, "topic": "Periodic trends: detailed analysis"},
                    {"week": 3, "topic": "Advanced chemical bonding: VSEPR, hybridisation"},
                    {"week": 4, "topic": "Intermolecular forces: detailed analysis"},
                    {"week": 5, "topic": "Advanced stoichiometry: limiting reagents, yields"},
                    {"week": 6, "topic": "Gases: ideal gas law, kinetic molecular theory, real gases"},
                    {"week": 7, "topic": "Thermochemistry: enthalpy, Hess's law, calorimetry"},
                    {"week": 8, "topic": "Chemical kinetics: rate laws, activation energy, mechanisms"},
                    {"week": 9, "topic": "Chemical equilibrium: Kc, Kp, ICE tables"},
                    {"week": 10, "topic": "Acids and bases: Ka, Kb, buffers, hydrolysis"},
                    {"week": 11, "topic": "Electrochemistry: Nernst equation, standard potentials"},
                    {"week": 12, "topic": "Organic chemistry: reaction mechanisms, stereochemistry"},
                    {"week": 13, "topic": "Organic chemistry: alcohols, aldehydes, ketones, carboxylic acids"},
                    {"week": 14, "topic": "Organic chemistry: polymers, proteins, carbohydrates"},
                    {"week": 15, "topic": "Inorganic chemistry: transition metals, coordination compounds"},
                    {"week": 16, "topic": "Industrial chemistry: Haber process, Contact process"},
                    {"week": 17, "topic": "Revision and advanced problem-solving"},
                    {"week": 18, "topic": "Final assessment and exam preparation"}
                ]
            }
        }
    },

    "biology": {
        "name": "Biology",
        "description": "The study of living organisms, their structure, function, growth, evolution, and interactions.",
        "importance": "Essential for medicine, conservation, agriculture, biotechnology, and environmental science.",
        "sa_curriculum": "CAPS Life Sciences (Grades 10-12)",
        "study_plans": {
            "beginner": {
                "level": "Beginner (Grades 8-9 / Foundation)",
                "duration_weeks": 10,
                "weekly_hours": 4,
                "topics": [
                    {"week": 1, "topic": "Introduction to biology: characteristics of living things"},
                    {"week": 2, "topic": "Cells: structure and function (plant and animal)"},
                    {"week": 3, "topic": "Tissues, organs, and organ systems"},
                    {"week": 4, "topic": "Human body systems: digestive, circulatory"},
                    {"week": 5, "topic": "Human body systems: respiratory, excretory"},
                    {"week": 6, "topic": "Plants: structure, photosynthesis, transport"},
                    {"week": 7, "topic": "Ecosystems: food chains, food webs, energy flow"},
                    {"week": 8, "topic": "Biodiversity: classification of living things"},
                    {"week": 9, "topic": "Reproduction: sexual and asexual"},
                    {"week": 10, "topic": "Adaptation and survival"}
                ]
            },
            "intermediate": {
                "level": "Intermediate (Grades 10-11 / NQF 4)",
                "duration_weeks": 14,
                "weekly_hours": 6,
                "topics": [
                    {"week": 1, "topic": "Biochemistry: carbohydrates, lipids, proteins, enzymes"},
                    {"week": 2, "topic": "Cell structure: organelles, membrane transport"},
                    {"week": 3, "topic": "Cell division: mitosis and meiosis"},
                    {"week": 4, "topic": "DNA structure, replication, protein synthesis"},
                    {"week": 5, "topic": "Genetics: Mendelian inheritance, genetic crosses"},
                    {"week": 6, "topic": "Evolution: natural selection, evidence, speciation"},
                    {"week": 7, "topic": "Human physiology: nervous system and hormones"},
                    {"week": 8, "topic": "Human physiology: immune system and disease"},
                    {"week": 9, "topic": "Human reproduction and embryonic development"},
                    {"week": 10, "topic": "Plant responses and hormones"},
                    {"week": 11, "topic": "Ecology: populations, communities, ecosystems"},
                    {"week": 12, "topic": "Human impact on the environment"},
                    {"week": 13, "topic": "South African biomes: fynbos, savanna, karoo"},
                    {"week": 14, "topic": "Revision and practical skills"}
                ]
            },
            "advanced": {
                "level": "Advanced (Grade 12 / University First Year)",
                "duration_weeks": 18,
                "weekly_hours": 8,
                "topics": [
                    {"week": 1, "topic": "Molecular biology: DNA replication, transcription, translation in detail"},
                    {"week": 2, "topic": "Gene regulation and expression"},
                    {"week": 3, "topic": "Genetic engineering: PCR, gel electrophoresis, cloning"},
                    {"week": 4, "topic": "Biotechnology: CRISPR, GMOs, ethical considerations"},
                    {"week": 5, "topic": "Population genetics: Hardy-Weinberg equilibrium"},
                    {"week": 6, "topic": "Evolutionary mechanisms and phylogenetics"},
                    {"week": 7, "topic": "Animal physiology: homeostasis, thermoregulation"},
                    {"week": 8, "topic": "Endocrinology: detailed hormone study"},
                    {"week": 9, "topic": "Neurobiology: action potentials, synaptic transmission"},
                    {"week": 10, "topic": "Immunology: innate and adaptive immunity, vaccines"},
                    {"week": 11, "topic": "Ecology: community ecology, succession"},
                    {"week": 12, "topic": "Conservation biology: biodiversity hotspots, SA case studies"},
                    {"week": 13, "topic": "Microbiology: bacteria, viruses, fungi, protists"},
                    {"week": 14, "topic": "Plant physiology: transpiration, mineral nutrition"},
                    {"week": 15, "topic": "Developmental biology: embryology, stem cells"},
                    {"week": 16, "topic": "Bioinformatics introduction"},
                    {"week": 17, "topic": "Revision and practical examination skills"},
                    {"week": 18, "topic": "Final assessment and exam preparation"}
                ]
            }
        }
    },

    "programming": {
        "name": "Programming",
        "description": "The art and science of writing instructions for computers to solve problems and create software.",
        "importance": "Essential for software development, data science, automation, and digital innovation.",
        "sa_curriculum": "CAPS Information Technology (Grades 10-12); Computer Applications Technology",
        "study_plans": {
            "beginner": {
                "level": "Beginner (No prior experience)",
                "duration_weeks": 10,
                "weekly_hours": 5,
                "recommended_language": "Python",
                "topics": [
                    {"week": 1, "topic": "Introduction to programming: concepts, algorithms, flowcharts"},
                    {"week": 2, "topic": "Variables, data types (int, float, string, bool)"},
                    {"week": 3, "topic": "Input/output operations and string formatting"},
                    {"week": 4, "topic": "Conditional statements: if, elif, else"},
                    {"week": 5, "topic": "Loops: for loops and while loops"},
                    {"week": 6, "topic": "Functions: defining and calling functions"},
                    {"week": 7, "topic": "Lists: creation, indexing, methods"},
                    {"week": 8, "topic": "Dictionaries: key-value pairs"},
                    {"week": 9, "topic": "Basic file handling: reading and writing files"},
                    {"week": 10, "topic": "Mini project: build a simple calculator or quiz program"}
                ]
            },
            "intermediate": {
                "level": "Intermediate (Some programming experience)",
                "duration_weeks": 14,
                "weekly_hours": 7,
                "recommended_languages": ["Python", "JavaScript"],
                "topics": [
                    {"week": 1, "topic": "Object-oriented programming: classes and objects"},
                    {"week": 2, "topic": "OOP: inheritance, polymorphism, encapsulation"},
                    {"week": 3, "topic": "Error handling: exceptions, try/except/finally"},
                    {"week": 4, "topic": "Data structures: stacks, queues, linked lists"},
                    {"week": 5, "topic": "Algorithms: searching (linear, binary)"},
                    {"week": 6, "topic": "Algorithms: sorting (bubble, selection, merge, quick)"},
                    {"week": 7, "topic": "Recursion and recursive problem-solving"},
                    {"week": 8, "topic": "Working with APIs: HTTP requests, JSON"},
                    {"week": 9, "topic": "Databases: SQL basics (CREATE, SELECT, INSERT, UPDATE)"},
                    {"week": 10, "topic": "Database design: normalisation, relationships"},
                    {"week": 11, "topic": "Version control: Git and GitHub"},
                    {"week": 12, "topic": "Web basics: HTML, CSS, JavaScript introduction"},
                    {"week": 13, "topic": "Web framework: Flask or Django basics"},
                    {"week": 14, "topic": "Project: Build a CRUD web application"}
                ]
            },
            "advanced": {
                "level": "Advanced (Solid programming foundation)",
                "duration_weeks": 18,
                "weekly_hours": 10,
                "topics": [
                    {"week": 1, "topic": "Advanced OOP: design patterns (singleton, factory, observer)"},
                    {"week": 2, "topic": "Advanced data structures: trees, graphs, heaps"},
                    {"week": 3, "topic": "Graph algorithms: BFS, DFS, Dijkstra, A*"},
                    {"week": 4, "topic": "Dynamic programming: memoisation, tabulation"},
                    {"week": 5, "topic": "Time and space complexity analysis (Big O)"},
                    {"week": 6, "topic": "Functional programming concepts"},
                    {"week": 7, "topic": "Concurrency: threads, processes, async programming"},
                    {"week": 8, "topic": "RESTful API design and development"},
                    {"week": 9, "topic": "Database optimisation: indexing, query optimisation"},
                    {"week": 10, "topic": "Testing: unit tests, integration tests, TDD"},
                    {"week": 11, "topic": "DevOps basics: Docker, CI/CD pipelines"},
                    {"week": 12, "topic": "Cloud platforms: AWS/Azure/GCP fundamentals"},
                    {"week": 13, "topic": "Data science: NumPy, Pandas, Matplotlib"},
                    {"week": 14, "topic": "Machine learning: scikit-learn basics"},
                    {"week": 15, "topic": "Cybersecurity fundamentals"},
                    {"week": 16, "topic": "System design: scalability, architecture"},
                    {"week": 17, "topic": "Capstone project planning and development"},
                    {"week": 18, "topic": "Capstone project completion and presentation"}
                ]
            }
        }
    },

    "history": {
        "name": "History",
        "description": "The study of past events, particularly human affairs, to understand the present and inform the future.",
        "importance": "Develops critical thinking, research skills, and contextual understanding of current affairs.",
        "sa_curriculum": "CAPS History (Grades 10-12): focuses on South African, African, and World history",
        "study_plans": {
            "beginner": {
                "level": "Beginner (Grades 8-9 / Foundation)",
                "duration_weeks": 10,
                "weekly_hours": 4,
                "topics": [
                    {"week": 1, "topic": "What is history? Sources, evidence, bias"},
                    {"week": 2, "topic": "Ancient civilisations: Egypt, Mesopotamia"},
                    {"week": 3, "topic": "Ancient Greece: democracy, philosophy, wars"},
                    {"week": 4, "topic": "The Roman Empire: rise and fall"},
                    {"week": 5, "topic": "Early African kingdoms: Ghana, Mali, Great Zimbabwe"},
                    {"week": 6, "topic": "Pre-colonial South Africa: Khoisan, Nguni, Sotho-Tswana"},
                    {"week": 7, "topic": "The Renaissance and Reformation in Europe"},
                    {"week": 8, "topic": "Age of Exploration: voyages and encounters"},
                    {"week": 9, "topic": "The Atlantic slave trade"},
                    {"week": 10, "topic": "Introduction to historical writing and essays"}
                ]
            },
            "intermediate": {
                "level": "Intermediate (Grades 10-11 / NQF 4)",
                "duration_weeks": 14,
                "weekly_hours": 6,
                "topics": [
                    {"week": 1, "topic": "Colonialism in Africa: scramble and partition"},
                    {"week": 2, "topic": "Colonial South Africa: Dutch settlement, British colonisation"},
                    {"week": 3, "topic": "The Mineral Revolution: diamonds, gold, labour systems"},
                    {"week": 4, "topic": "The South African War (Anglo-Boer War) 1899-1902"},
                    {"week": 5, "topic": "Union of South Africa 1910 and early segregation"},
                    {"week": 6, "topic": "Apartheid: implementation 1948-1960"},
                    {"week": 7, "topic": "Resistance to apartheid: ANC, PAC, Sharpeville"},
                    {"week": 8, "topic": "Black Consciousness Movement: Steve Biko, Soweto 1976"},
                    {"week": 9, "topic": "International anti-apartheid struggle: sanctions, solidarity"},
                    {"week": 10, "topic": "Negotiations and transition: CODESA, 1994 election"},
                    {"week": 11, "topic": "World Wars I and II: causes, events, consequences"},
                    {"week": 12, "topic": "The Cold War: origins, proxy wars, end"},
                    {"week": 13, "topic": "Decolonisation in Africa and Asia"},
                    {"week": 14, "topic": "Essay writing and source analysis skills"}
                ]
            },
            "advanced": {
                "level": "Advanced (Grade 12 / University First Year)",
                "duration_weeks": 18,
                "weekly_hours": 8,
                "topics": [
                    {"week": 1, "topic": "Historiography: schools of historical thought"},
                    {"week": 2, "topic": "Pre-colonial African societies: state formation, trade"},
                    {"week": 3, "topic": "Slavery and the making of the Atlantic world"},
                    {"week": 4, "topic": "Industrial Revolution: causes, spread, social impact"},
                    {"week": 5, "topic": "Imperialism and colonial rule in Africa: comparative analysis"},
                    {"week": 6, "topic": "South African history: segregation to apartheid"},
                    {"week": 7, "topic": "Apartheid: grand apartheid, homeland system, forced removals"},
                    {"week": 8, "topic": "Resistance: armed struggle, trade unions, UDF"},
                    {"week": 9, "topic": "Negotiated settlement and Truth and Reconciliation Commission"},
                    {"week": 10, "topic": "Post-apartheid South Africa: challenges and progress"},
                    {"week": 11, "topic": "The Cold War in Africa: proxy conflicts, decolonisation"},
                    {"week": 12, "topic": "Genocide: Holocaust, Rwanda — comparative study"},
                    {"week": 13, "topic": "Globalisation: historical origins and contemporary debates"},
                    {"week": 14, "topic": "Environmental history: climate, disease, human impact"},
                    {"week": 15, "topic": "Gender and history: women's movements, patriarchy"},
                    {"week": 16, "topic": "Research methods: archives, oral history, digital humanities"},
                    {"week": 17, "topic": "Source criticism and historical interpretation"},
                    {"week": 18, "topic": "Research essay writing and examination preparation"}
                ]
            }
        }
    },

    "geography": {
        "name": "Geography",
        "description": "The study of Earth's physical features, climate, human populations, and the interactions between them.",
        "importance": "Essential for environmental management, urban planning, GIS careers, and understanding global issues.",
        "sa_curriculum": "CAPS Geography (Grades 10-12): physical and human geography",
        "study_plans": {
            "beginner": {
                "level": "Beginner (Grades 8-9 / Foundation)",
                "duration_weeks": 10,
                "weekly_hours": 4,
                "topics": [
                    {"week": 1, "topic": "Maps and map skills: scale, direction, coordinates"},
                    {"week": 2, "topic": "Globes and map projections"},
                    {"week": 3, "topic": "Weather and climate: temperature, rainfall, seasons"},
                    {"week": 4, "topic": "Climate types around the world"},
                    {"week": 5, "topic": "Rivers and water systems"},
                    {"week": 6, "topic": "Landforms: mountains, valleys, plains"},
                    {"week": 7, "topic": "Population: distribution, density, growth"},
                    {"week": 8, "topic": "Settlement types: rural and urban"},
                    {"week": 9, "topic": "Natural resources and their uses"},
                    {"week": 10, "topic": "Environmental issues: pollution, conservation"}
                ]
            },
            "intermediate": {
                "level": "Intermediate (Grades 10-11 / NQF 4)",
                "duration_weeks": 14,
                "weekly_hours": 6,
                "topics": [
                    {"week": 1, "topic": "GIS (Geographic Information Systems): basics and applications"},
                    {"week": 2, "topic": "Topographic mapwork: interpretation and analysis"},
                    {"week": 3, "topic": "Earth's energy balance and atmospheric circulation"},
                    {"week": 4, "topic": "Weather systems: mid-latitude cyclones, tropical cyclones"},
                    {"week": 5, "topic": "Climate of South Africa: factors, regions"},
                    {"week": 6, "topic": "Geomorphology: fluvial processes and landforms"},
                    {"week": 7, "topic": "Geomorphology: slope processes, mass movements"},
                    {"week": 8, "topic": "Population geography: structure, migration, policies"},
                    {"week": 9, "topic": "Settlement geography: urbanisation patterns"},
                    {"week": 10, "topic": "Economic geography: agriculture, mining, industry"},
                    {"week": 11, "topic": "South African agriculture: types, challenges"},
                    {"week": 12, "topic": "Water resources: dams, rivers, water scarcity in SA"},
                    {"week": 13, "topic": "Environmental management: sustainable development"},
                    {"week": 14, "topic": "Mapwork practice and revision"}
                ]
            },
            "advanced": {
                "level": "Advanced (Grade 12 / University First Year)",
                "duration_weeks": 18,
                "weekly_hours": 8,
                "topics": [
                    {"week": 1, "topic": "Advanced GIS: spatial analysis, remote sensing"},
                    {"week": 2, "topic": "Climatology: climate change, greenhouse effect, models"},
                    {"week": 3, "topic": "Geomorphology: tectonics, earthquakes, volcanoes"},
                    {"week": 4, "topic": "Geomorphology: coastal processes and landforms"},
                    {"week": 5, "topic": "Biogeography: ecosystems, biodiversity, conservation"},
                    {"week": 6, "topic": "Hydrology: drainage basins, flooding, water management"},
                    {"week": 7, "topic": "Soils: formation, classification, degradation"},
                    {"week": 8, "topic": "Population: demographic transition, ageing, policies"},
                    {"week": 9, "topic": "Urban geography: urban models, urban problems in SA"},
                    {"week": 10, "topic": "Economic geography: globalisation, development, inequality"},
                    {"week": 11, "topic": "South African development challenges: rural vs urban"},
                    {"week": 12, "topic": "Agriculture: food security, commercial vs subsistence"},
                    {"week": 13, "topic": "Mining and mineral resources in South Africa"},
                    {"week": 14, "topic": "Tourism geography: impacts, sustainability"},
                    {"week": 15, "topic": "Environmental management: climate adaptation, SDGs"},
                    {"week": 16, "topic": "Regional geography: SADC countries"},
                    {"week": 17, "topic": "Advanced mapwork and GIS practical"},
                    {"week": 18, "topic": "Revision and examination preparation"}
                ]
            }
        }
    },

    "economics": {
        "name": "Economics",
        "description": "The study of how individuals, businesses, and societies allocate scarce resources to satisfy unlimited wants.",
        "importance": "Essential for business, finance, policy-making, and understanding global and local economic issues.",
        "sa_curriculum": "CAPS Economics (Grades 10-12); also Business Studies",
        "study_plans": {
            "beginner": {
                "level": "Beginner (Grades 8-9 / Foundation)",
                "duration_weeks": 10,
                "weekly_hours": 4,
                "topics": [
                    {"week": 1, "topic": "What is economics? Needs vs wants, scarcity"},
                    {"week": 2, "topic": "Types of economic systems: traditional, command, market, mixed"},
                    {"week": 3, "topic": "Supply and demand: basic concepts"},
                    {"week": 4, "topic": "Money: functions, types, banking basics"},
                    {"week": 5, "topic": "Trade: why countries trade, imports and exports"},
                    {"week": 6, "topic": "South African economy: main sectors"},
                    {"week": 7, "topic": "Employment and unemployment"},
                    {"week": 8, "topic": "Inflation: what it means for everyday life"},
                    {"week": 9, "topic": "Personal finance: budgeting, saving"},
                    {"week": 10, "topic": "Globalisation and its effects"}
                ]
            },
            "intermediate": {
                "level": "Intermediate (Grades 10-11 / NQF 4)",
                "duration_weeks": 14,
                "weekly_hours": 6,
                "topics": [
                    {"week": 1, "topic": "Microeconomics: demand and supply analysis"},
                    {"week": 2, "topic": "Elasticity: price, income, cross elasticity"},
                    {"week": 3, "topic": "Market structures: perfect competition, monopoly, oligopoly"},
                    {"week": 4, "topic": "Production: costs, revenue, profit maximisation"},
                    {"week": 5, "topic": "Labour markets: wages, unions, unemployment types"},
                    {"week": 6, "topic": "Macroeconomics: circular flow of income"},
                    {"week": 7, "topic": "GDP: measurement, growth, limitations"},
                    {"week": 8, "topic": "Inflation: causes, types, measurement (CPI)"},
                    {"week": 9, "topic": "Monetary policy: SARB, repo rate, inflation targeting"},
                    {"week": 10, "topic": "Fiscal policy: government budget, taxation, spending"},
                    {"week": 11, "topic": "Exchange rates: determinants, impact on SA economy"},
                    {"week": 12, "topic": "Balance of payments and foreign trade"},
                    {"week": 13, "topic": "Economic development and inequality in South Africa"},
                    {"week": 14, "topic": "Revision: data response and essay writing"}
                ]
            },
            "advanced": {
                "level": "Advanced (Grade 12 / University First Year)",
                "duration_weeks": 18,
                "weekly_hours": 8,
                "topics": [
                    {"week": 1, "topic": "Consumer theory: utility, indifference curves, budget constraints"},
                    {"week": 2, "topic": "Producer theory: isoquants, cost minimisation"},
                    {"week": 3, "topic": "Market failures: externalities, public goods, information asymmetry"},
                    {"week": 4, "topic": "Game theory: Nash equilibrium, prisoner's dilemma"},
                    {"week": 5, "topic": "National income accounting: GDP, GNP, NNP, disposable income"},
                    {"week": 6, "topic": "Keynesian vs Classical macroeconomics"},
                    {"week": 7, "topic": "Aggregate demand and aggregate supply analysis"},
                    {"week": 8, "topic": "Monetary policy: money supply, transmission mechanism, quantitative easing"},
                    {"week": 9, "topic": "Fiscal policy: multipliers, crowding out, public debt sustainability"},
                    {"week": 10, "topic": "International trade: comparative advantage, tariffs, trade agreements"},
                    {"week": 11, "topic": "South African economic policy: NDP, industrial policy"},
                    {"week": 12, "topic": "Development economics: growth vs development, HDI, poverty traps"},
                    {"week": 13, "topic": "Labour markets in SA: unemployment crisis, minimum wage"},
                    {"week": 14, "topic": "Financial markets: JSE, banking sector, regulation"},
                    {"week": 15, "topic": "Environmental economics: sustainable growth, carbon pricing"},
                    {"week": 16, "topic": "Behavioural economics: biases, nudges, prospect theory"},
                    {"week": 17, "topic": "Economic data analysis and interpretation"},
                    {"week": 18, "topic": "Revision and examination preparation"}
                ]
            }
        }
    },

    "literature": {
        "name": "Literature",
        "description": "The study of written works including poetry, prose, drama, and literary criticism.",
        "importance": "Develops critical thinking, empathy, communication skills, and cultural understanding.",
        "sa_curriculum": "CAPS Home Language and First Additional Language (Grades 10-12)",
        "study_plans": {
            "beginner": {
                "level": "Beginner (Grades 8-9 / Foundation)",
                "duration_weeks": 10,
                "weekly_hours": 4,
                "topics": [
                    {"week": 1, "topic": "Introduction to literature: genres (poetry, prose, drama)"},
                    {"week": 2, "topic": "Elements of a story: plot, setting, character"},
                    {"week": 3, "topic": "Narrative perspective: first, second, third person"},
                    {"week": 4, "topic": "Introduction to poetry: rhyme, rhythm, stanza"},
                    {"week": 5, "topic": "Poetic devices: simile, metaphor, personification"},
                    {"week": 6, "topic": "Introduction to drama: dialogue, stage directions"},
                    {"week": 7, "topic": "Reading comprehension strategies"},
                    {"week": 8, "topic": "South African short stories"},
                    {"week": 9, "topic": "Oral literature: folktales, proverbs, praise poetry"},
                    {"week": 10, "topic": "Writing a basic literary essay"}
                ]
            },
            "intermediate": {
                "level": "Intermediate (Grades 10-11 / NQF 4)",
                "duration_weeks": 14,
                "weekly_hours": 6,
                "topics": [
                    {"week": 1, "topic": "Literary analysis: theme, symbolism, motif"},
                    {"week": 2, "topic": "Character analysis: flat vs round, static vs dynamic"},
                    {"week": 3, "topic": "Advanced poetic devices: imagery, alliteration, assonance, enjambment"},
                    {"week": 4, "topic": "Poetry movements: Romanticism, Modernism"},
                    {"week": 5, "topic": "Shakespeare: introduction to language and context"},
                    {"week": 6, "topic": "Shakespeare text study: character and theme analysis"},
                    {"week": 7, "topic": "South African literature: apartheid-era writing"},
                    {"week": 8, "topic": "African literature: post-colonial themes"},
                    {"week": 9, "topic": "Drama study: context, themes, staging"},
                    {"week": 10, "topic": "Novel study: plot structure, narrative voice"},
                    {"week": 11, "topic": "Literary criticism: different critical approaches"},
                    {"week": 12, "topic": "Context and intertextuality"},
                    {"week": 13, "topic": "Essay writing: argumentative literary essay"},
                    {"week": 14, "topic": "Unseen poetry and prose analysis"}
                ]
            },
            "advanced": {
                "level": "Advanced (Grade 12 / University First Year)",
                "duration_weeks": 18,
                "weekly_hours": 8,
                "topics": [
                    {"week": 1, "topic": "Literary theory: formalism, structuralism"},
                    {"week": 2, "topic": "Literary theory: Marxism, feminism, post-colonialism"},
                    {"week": 3, "topic": "Literary theory: postmodernism, ecocriticism, queer theory"},
                    {"week": 4, "topic": "Poetry: close reading and analysis techniques"},
                    {"week": 5, "topic": "Poetry across periods: from Renaissance to contemporary"},
                    {"week": 6, "topic": "South African poetry: township poetry, protest poetry"},
                    {"week": 7, "topic": "Shakespeare in depth: critical interpretations"},
                    {"week": 8, "topic": "Modern drama: Ibsen, Miller, Fugard"},
                    {"week": 9, "topic": "Novel: bildungsroman, historical fiction, magical realism"},
                    {"week": 10, "topic": "African literature: Chinua Achebe, Ngugi wa Thiong'o, Chimamanda Ngozi Adichie"},
                    {"week": 11, "topic": "South African literature: Coetzee, Gordimer, Mda"},
                    {"week": 12, "topic": "Comparative literature: cross-cultural analysis"},
                    {"week": 13, "topic": "Adaptation: literature to film"},
                    {"week": 14, "topic": "Creative writing: fiction and non-fiction"},
                    {"week": 15, "topic": "Research methods for literary studies"},
                    {"week": 16, "topic": "Academic writing: literature essays and dissertations"},
                    {"week": 17, "topic": "Unseen analysis and timed writing"},
                    {"week": 18, "topic": "Revision and examination preparation"}
                ]
            }
        }
    },

    "art": {
        "name": "Art",
        "description": "The study and practice of visual arts including drawing, painting, sculpture, and design.",
        "importance": "Develops creativity, visual literacy, critical thinking, and cultural appreciation.",
        "sa_curriculum": "CAPS Visual Arts (Grades 10-12)",
        "study_plans": {
            "beginner": {
                "level": "Beginner (Grades 8-9 / Foundation)",
                "duration_weeks": 10,
                "weekly_hours": 4,
                "topics": [
                    {"week": 1, "topic": "Elements of art: line, shape, form, colour, texture, space"},
                    {"week": 2, "topic": "Principles of design: balance, contrast, emphasis, rhythm"},
                    {"week": 3, "topic": "Drawing fundamentals: observation, proportion, shading"},
                    {"week": 4, "topic": "Colour theory: primary, secondary, tertiary; warm and cool"},
                    {"week": 5, "topic": "Painting techniques: watercolour basics"},
                    {"week": 6, "topic": "Painting techniques: acrylic basics"},
                    {"week": 7, "topic": "Printmaking: simple relief printing"},
                    {"week": 8, "topic": "Sculpture: clay modelling basics"},
                    {"week": 9, "topic": "Art history: cave paintings to ancient art"},
                    {"week": 10, "topic": "South African art: traditional and contemporary introduction"}
                ]
            },
            "intermediate": {
                "level": "Intermediate (Grades 10-11 / NQF 4)",
                "duration_weeks": 14,
                "weekly_hours": 6,
                "topics": [
                    {"week": 1, "topic": "Advanced drawing: perspective (one-point, two-point)"},
                    {"week": 2, "topic": "Advanced drawing: figure drawing, portraiture"},
                    {"week": 3, "topic": "Colour theory advanced: colour mixing, colour harmony"},
                    {"week": 4, "topic": "Painting: oil painting techniques (glazing, impasto)"},
                    {"week": 5, "topic": "Painting: acrylic techniques and mixed media"},
                    {"week": 6, "topic": "Printmaking: lino cut, etching basics"},
                    {"week": 7, "topic": "Sculpture: construction methods, assemblage"},
                    {"week": 8, "topic": "Photography: composition, lighting, basic editing"},
                    {"week": 9, "topic": "Art history: Renaissance and Baroque"},
                    {"week": 10, "topic": "Art history: Impressionism to Modernism"},
                    {"week": 11, "topic": "South African art history: colonial to democratic"},
                    {"week": 12, "topic": "Visual culture analysis: advertising, film, digital media"},
                    {"week": 13, "topic": "Art criticism: writing about art"},
                    {"week": 14, "topic": "Developing a personal art project"}
                ]
            },
            "advanced": {
                "level": "Advanced (Grade 12 / University First Year)",
                "duration_weeks": 18,
                "weekly_hours": 8,
                "topics": [
                    {"week": 1, "topic": "Conceptual art: idea-based practice, contemporary approaches"},
                    {"week": 2, "topic": "Advanced painting: personal style development"},
                    {"week": 3, "topic": "Advanced drawing: experimental mark-making"},
                    {"week": 4, "topic": "Sculpture and installation art"},
                    {"week": 5, "topic": "Digital art: Photoshop, digital painting, illustration"},
                    {"week": 6, "topic": "Photography: conceptual and documentary approaches"},
                    {"week": 7, "topic": "Video art and time-based media"},
                    {"week": 8, "topic": "Art history: postmodernism and contemporary art"},
                    {"week": 9, "topic": "African art history: Ndebele painting, beadwork, woodcarving"},
                    {"week": 10, "topic": "South African art: resistance art, township art, contemporary scene"},
                    {"week": 11, "topic": "Curatorial practice: exhibition design, art writing"},
                    {"week": 12, "topic": "Professional practice: portfolio development, art market"},
                    {"week": 13, "topic": "Art theory: semiotics, representation, identity"},
                    {"week": 14, "topic": "Art and society: public art, community engagement"},
                    {"week": 15, "topic": "Environmental art and sustainability"},
                    {"week": 16, "topic": "Research project: art historical or studio-based"},
                    {"week": 17, "topic": "Final portfolio development and curation"},
                    {"week": 18, "topic": "Exhibition and assessment preparation"}
                ]
            }
        }
    }
}