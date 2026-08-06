REFERENCE_DATA = {
    "fever": {
        "category": "Fever",
        "info": (
            "Paracetamol-based products are the commonly used first-line OTC "
            "option for mild fever in adults. Persistent fever (more than 2-3 "
            "days) or fever with other symptoms should be checked by a doctor."
        ),
        "salts": ["Paracetamol"],
    },
    "headache": {
        "category": "Headache",
        "info": (
            "Paracetamol is a commonly used OTC option for occasional mild "
            "headaches. Frequent or severe headaches should be evaluated by "
            "a doctor rather than self-treated."
        ),
        "salts": ["Paracetamol"],
    },
    "migraine": {
        "category": "Headache",
        "info": (
            "Mild headache/migraine pain is sometimes managed with OTC "
            "analgesics, but recurring migraines need a doctor's evaluation "
            "for proper management, not repeated self-medication."
        ),
        "salts": ["Paracetamol", "Ibuprofen"],
    },
    "body pain": {
        "category": "Body / muscle pain",
        "info": (
            "Mild body ache or muscle pain is commonly managed with OTC "
            "analgesics/anti-inflammatories. Persistent or severe pain, or "
            "pain after an injury, should be checked by a doctor."
        ),
        "salts": ["Paracetamol", "Ibuprofen", "Diclofenac"],
    },
    "joint pain": {
        "category": "Joint pain / inflammation",
        "info": (
            "Occasional joint pain is sometimes managed with OTC anti-"
            "inflammatories. Ongoing joint pain or swelling needs proper "
            "medical evaluation, not repeated self-medication."
        ),
        "salts": ["Diclofenac", "Ibuprofen"],
    },
    "sprain": {
        "category": "Sprain / minor injury pain",
        "info": (
            "Topical or oral anti-inflammatories are commonly used for minor "
            "sprains alongside rest and ice. See a doctor if swelling is "
            "severe or the joint can't bear weight."
        ),
        "salts": ["Diclofenac", "Ibuprofen"],
    },
    "cold": {
        "category": "Common cold",
        "info": (
            "Common cold symptoms are usually managed with rest, fluids, and "
            "OTC symptomatic relief for specific symptoms (runny nose, "
            "congestion). A pharmacist can advise based on your symptoms."
        ),
        "salts": ["Cetirizine", "Paracetamol"],
    },
    "allergy": {
        "category": "Allergy / allergic rhinitis",
        "info": (
            "Antihistamines are the commonly used OTC option for mild "
            "seasonal allergy symptoms (sneezing, itchy/runny nose). "
            "Persistent or severe allergic reactions need medical attention."
        ),
        "salts": ["Cetirizine", "Levocetirizine"],
    },
    "sneezing": {
        "category": "Allergy / allergic rhinitis",
        "info": (
            "Frequent sneezing and a runny nose from allergies is commonly "
            "managed with an antihistamine. See a doctor if it's persistent "
            "or affecting sleep/daily activity."
        ),
        "salts": ["Cetirizine", "Levocetirizine"],
    },
    "asthma": {
        "category": "Allergic asthma / wheeze",
        "info": (
            "Allergic asthma and wheeze are managed with prescription "
            "medication under a doctor's supervision -- this is not a "
            "self-treatable condition. Please see a doctor."
        ),
        "salts": ["Montelukast"],
    },
    "acidity": {
        "category": "Acidity / heartburn",
        "info": (
            "Antacids/PPIs are commonly used OTC for occasional acidity or "
            "heartburn. Frequent or worsening symptoms should be discussed "
            "with a doctor, as they may need investigation."
        ),
        "salts": ["Pantoprazole", "Omeprazole", "Rabeprazole"],
    },
    "gerd": {
        "category": "Acid reflux (GERD)",
        "info": (
            "Proton-pump inhibitors are commonly used for acid reflux "
            "symptoms. Ongoing or severe reflux needs a doctor's evaluation, "
            "not indefinite self-medication."
        ),
        "salts": ["Pantoprazole", "Omeprazole", "Rabeprazole"],
    },
    "heartburn": {
        "category": "Acidity / heartburn",
        "info": (
            "Antacids/PPIs are commonly used OTC for occasional heartburn. "
            "Frequent or worsening symptoms should be discussed with a doctor."
        ),
        "salts": ["Pantoprazole", "Omeprazole", "Rabeprazole"],
    },
    "throat infection": {
        "category": "Throat / respiratory infection",
        "info": (
            "Suspected bacterial throat or respiratory infections need a "
            "doctor's diagnosis before any antibiotic is used -- antibiotics "
            "should never be self-prescribed."
        ),
        "salts": ["Azithromycin", "Amoxicillin", "Cefixime"],
    },
    "throat pain": {
        "category": "Throat / respiratory infection",
        "info": (
            "Sore throat can be viral or bacterial. See a doctor before "
            "taking any antibiotic -- self-medicating with antibiotics can "
            "cause resistance and isn't safe without a diagnosis."
        ),
        "salts": ["Azithromycin", "Amoxicillin", "Cefixime"],
    },
    "urinary infection": {
        "category": "Urinary tract infection (UTI)",
        "info": (
            "UTIs need a doctor's diagnosis (often with a urine test) before "
            "antibiotics are prescribed. Please don't self-medicate with "
            "antibiotics for suspected UTI symptoms."
        ),
        "salts": ["Ciprofloxacin"],
    },
    "stomach infection": {
        "category": "Stomach / intestinal infection",
        "info": (
            "Stomach infections need a doctor's evaluation, especially with "
            "fever or persistent symptoms, before any antibiotic is used."
        ),
        "salts": ["Metronidazole"],
    },
    "diarrhea": {
        "category": "Diarrhea / dehydration",
        "info": (
            "Oral rehydration salts (ORS) are the first-line OTC response to "
            "diarrhea, to prevent dehydration. See a doctor if it persists "
            "beyond 1-2 days, or there's blood, high fever, or in a child."
        ),
        "salts": ["ORS"],
    },
    "dehydration": {
        "category": "Dehydration",
        "info": (
            "Oral rehydration salts (ORS) are the standard OTC option to "
            "restore fluids and electrolytes. Severe dehydration needs "
            "urgent medical attention."
        ),
        "salts": ["ORS"],
    },
    "vomiting": {
        "category": "Nausea / vomiting",
        "info": (
            "Occasional nausea is sometimes managed with OTC antiemetics. "
            "Persistent vomiting, especially with dehydration or in a child, "
            "needs medical attention."
        ),
        "salts": ["Domperidone", "Ondansetron"],
    },
    "nausea": {
        "category": "Nausea / vomiting",
        "info": (
            "Occasional nausea is sometimes managed with OTC antiemetics. "
            "Persistent or severe nausea needs medical evaluation."
        ),
        "salts": ["Domperidone", "Ondansetron"],
    },
    "diabetes": {
        "category": "Diabetes (Type 2)",
        "info": (
            "Diabetes management requires diagnosis, monitoring, and dosing "
            "by a doctor -- this is never a self-medicated condition. Shown "
            "here only as a reference to a commonly prescribed salt."
        ),
        "salts": ["Metformin"],
    },
    "high blood pressure": {
        "category": "Hypertension",
        "info": (
            "Blood pressure medication must be prescribed and monitored by "
            "a doctor -- dosing depends on individual readings and other "
            "conditions. This is not a self-medicated condition."
        ),
        "salts": ["Amlodipine", "Telmisartan"],
    },
    "hypertension": {
        "category": "Hypertension",
        "info": (
            "Blood pressure medication must be prescribed and monitored by "
            "a doctor. Shown here only as a reference to commonly "
            "prescribed salts, not a recommendation to self-medicate."
        ),
        "salts": ["Amlodipine", "Telmisartan"],
    },
    "cholesterol": {
        "category": "High cholesterol",
        "info": (
            "Cholesterol-lowering medication (statins) requires blood tests "
            "and a doctor's prescription -- dosing is individualized. This "
            "is not a self-medicated condition."
        ),
        "salts": ["Atorvastatin", "Rosuvastatin"],
    },
    "vitamin c deficiency": {
        "category": "Vitamin C supplementation",
        "info": (
            "Vitamin C supplements are commonly used OTC for general "
            "immunity support. A balanced diet is usually sufficient; "
            "consult a doctor for suspected deficiency."
        ),
        "salts": ["Ascorbic Acid"],
    },
    "weak immunity": {
        "category": "Immunity support",
        "info": (
            "Vitamin C is a commonly used OTC supplement for general "
            "immune support. Frequent infections should be evaluated by "
            "a doctor rather than self-treated with supplements."
        ),
        "salts": ["Ascorbic Acid"],
    },
    "weak bones": {
        "category": "Bone health / calcium deficiency",
        "info": (
            "Calcium + Vitamin D3 supplements are commonly used OTC to "
            "support bone health. Diagnosed osteoporosis or persistent bone "
            "pain needs a doctor's evaluation."
        ),
        "salts": ["Calcium + Vitamin D3"],
    },
    "calcium deficiency": {
        "category": "Bone health / calcium deficiency",
        "info": (
            "Calcium + Vitamin D3 supplements are commonly used OTC for "
            "calcium deficiency. A doctor can advise on dosage based on "
            "blood test results."
        ),
        "salts": ["Calcium + Vitamin D3"],
    },
}

# Common Indian-English phrasing that maps unambiguously onto an existing
# entry above -- kept as plain aliases (no AI needed) rather than duplicated
# entries, so this still works even without a GEMINI_API_KEY configured.
REFERENCE_DATA["loose motion"] = REFERENCE_DATA["diarrhea"]
REFERENCE_DATA["loose motions"] = REFERENCE_DATA["diarrhea"]
REFERENCE_DATA["stomach ache"] = REFERENCE_DATA["stomach infection"]
REFERENCE_DATA["stomach pain"] = REFERENCE_DATA["stomach infection"]
REFERENCE_DATA["stomachache"] = REFERENCE_DATA["stomach infection"]
REFERENCE_DATA["abdominal pain"] = REFERENCE_DATA["stomach infection"]
REFERENCE_DATA["washroom"] = REFERENCE_DATA["diarrhea"]
REFERENCE_DATA["toilet"] = REFERENCE_DATA["diarrhea"]
REFERENCE_DATA["motion"] = REFERENCE_DATA["diarrhea"]

DISCLAIMER = (
    "This is general information, not a diagnosis or a medical recommendation. "
    "Please consult a pharmacist or doctor before taking any medicine -- "
    "especially if you have existing health conditions, are pregnant, are on "
    "other medication, or symptoms persist or worsen."
)
