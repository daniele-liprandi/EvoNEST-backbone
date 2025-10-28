// Shared default configurations that can be used by both frontend and backend

export const DEFAULT_CONFIGS = {
  sampletypes: [
    { label: "Animal", value: "animal", description: "Animal individual", shortened: "an" },
    { label: "Plant", value: "plant", description: "Plant individual", shortened: "pl" },
    { label: "Blood", value: "blood", description: "Blood sample", shortened: "bl" },
    { label: "DNA extract", value: "dna_extract", description: "DNA extract", shortened: "dna" },
    { label: "Tissue", value: "tissue", description: "Tissue sample", shortened: "ti" },
    { label: "Secretion", value: "secretion", description: "Secretion sample", shortened: "se" }
  ],
  traittypes: [
    // Quantitative traits (numerical measurements)
    { value: "mass", label: "Mass", unit: "g", description: "Mass of the sample measured using a microbalance", dataType: "quantitative" },
    { value: "length", label: "Length", unit: "mm", description: "Length of the sample measured from maximum to minimum point along the longest symmetry axis", dataType: "quantitative" },
    { value: "width", label: "Width", unit: "mm", description: "Width of the sample measured from maximum to minimum point along the perpendicular to the longest symmetry axis", dataType: "quantitative" },
    { value: "dna_concentration", label: "DNA Concentration", unit: "ng/µl", description: "DNA concentration of the sample", dataType: "quantitative" },
    { value: "resting_metabolic_rate", label: "Resting Metabolic Rate", unit: "W", description: "Metabolic rate measured by respirometry at rest", dataType: "quantitative" },
    { value: "fiber_diameter", label: "Fiber Diameter", unit: "μm", description: "Diameter of individual fibers", dataType: "quantitative" },
    { value: "tensile_strength", label: "Tensile Strength", unit: "MPa", description: "Maximum stress material can withstand while being stretched", dataType: "quantitative" },
    { value: "bone_density", label: "Bone Density", unit: "g/cm³", description: "Density of bone tissue", dataType: "quantitative" },
    { value: "cortical_thickness", label: "Cortical Thickness", unit: "mm", description: "Thickness of cortical bone layer", dataType: "quantitative" },
    { value: "leaf_area", label: "Leaf Area", unit: "cm²", description: "Total surface area of leaf", dataType: "quantitative" },
    { value: "chlorophyll_content", label: "Chlorophyll Content", unit: "mg/g", description: "Chlorophyll concentration in leaf tissue", dataType: "quantitative" },
    { value: "wood_density", label: "Wood Density", unit: "g/cm³", description: "Density of wood tissue", dataType: "quantitative" },
    { value: "ring_width", label: "Ring Width", unit: "mm", description: "Width of annual growth rings", dataType: "quantitative" },
    { value: "stomatal_density", label: "Stomatal Density", unit: "stomata/mm²", description: "Number of stomata per unit area", dataType: "quantitative" },
    { value: "bark_thickness", label: "Bark Thickness", unit: "mm", description: "Thickness of bark layer", dataType: "quantitative" },

    // Categorical traits (predefined categories)
    { value: "sex", label: "Sex", description: "Biological sex of the specimen", dataType: "categorical", options: ["male", "female", "hermaphrodite", "unknown"] },
    { value: "life_stage", label: "Life Stage", description: "Developmental stage of the specimen", dataType: "categorical", options: ["egg", "embryo", "larva", "pupa", "nymph", "juvenile", "subadult", "adult", "senescent"] },
    { value: "color", label: "Color", description: "Primary coloration of the specimen or sample", dataType: "categorical", options: ["red", "orange", "yellow", "green", "blue", "purple", "brown", "black", "white", "grey", "transparent", "iridescent"] },
    { value: "habitat_type", label: "Habitat Type", description: "Type of habitat where specimen was found", dataType: "categorical", options: ["aquatic", "terrestrial", "arboreal", "fossorial", "aerial", "littoral", "benthic"] },
    { value: "preservation_method", label: "Preservation Method", description: "How the sample was preserved", dataType: "categorical", options: ["frozen", "ethanol", "formalin", "dried", "fresh", "RNAlater", "DMSO"] },

    // Boolean traits (yes/no observations)
    { value: "has_wings", label: "Has Wings", description: "Presence of wings", dataType: "boolean" },
    { value: "sexually_mature", label: "Sexually Mature", description: "Whether specimen is sexually mature", dataType: "boolean" },
    { value: "gravid", label: "Gravid", description: "Whether specimen is carrying eggs/offspring", dataType: "boolean" },
    { value: "molting", label: "Molting", description: "Whether specimen is in the process of molting", dataType: "boolean" },

    // Ordinal traits (ordered scales)
    { value: "condition_score", label: "Condition Score", description: "Overall physical condition (1=poor to 5=excellent)", dataType: "ordinal", min: 1, max: 5 },
    { value: "damage_level", label: "Damage Level", description: "Level of specimen damage (1=none to 5=severe)", dataType: "ordinal", min: 1, max: 5 },
    { value: "parasite_load", label: "Parasite Load", description: "Ectoparasite abundance (0=none to 5=heavy)", dataType: "ordinal", min: 0, max: 5 },

    // Multi-select traits (multiple simultaneous values)
    { value: "body_markings", label: "Body Markings", description: "Visible markings or patterns on the body", dataType: "multiselect", options: ["stripes", "spots", "bands", "patches", "reticulation", "mottling", "solid", "gradient"] },
    { value: "visible_features", label: "Visible Features", description: "Observable morphological features", dataType: "multiselect", options: ["antennae", "horns", "spines", "tubercles", "setae", "scales", "feathers", "fur", "claws", "suckers"] },
    { value: "behavioral_observations", label: "Behavioral Observations", description: "Observed behaviors during collection or handling", dataType: "multiselect", options: ["aggressive", "docile", "defensive_posture", "autotomy", "thanatosis", "vocalization", "burrowing", "climbing", "flying", "swimming"] }
  ],
  equipmenttypes: [
    { label: "Hematology analyzer", value: "hematology_analyzer", description: "Hematology analyzer" },
    { label: "Flow cytometer", value: "flow_cytometer", description: "Flow cytometer" },
    { label: "Optical microscope", value: "optical_microscope", description: "Optical microscope" },
    { label: "SEM", value: "SEM", description: "Scanning Electron Microscope" },
    { label: "TEM", value: "TEM", description: "Transmission Electron Microscope" },
    { label: "AFM", value: "AFM", description: "Atomic Force Microscope" },
    { label: "PCR machine", value: "PCR_machine", description: "Polymerase Chain Reaction machine" },
    { label: "Gel electrophoresis", value: "gel_electrophoresis", description: "Gel electrophoresis" },
    { label: "Raman", value: "Raman", description: "Raman Spectroscopy" },
    { label: "FTIR", value: "FTIR", description: "Fourier Transform Infrared Spectroscopy" },
    { label: "UV-Vis", value: "UV-Vis", description: "UV-Vis Spectroscopy" },
    { label: "Fluorescence", value: "Fluorescence", description: "Fluorescence Spectroscopy" }
  ],
  samplesubtypes: [
    { value: "whole_blood", label: "Whole Blood", shortened: "wb", description: "Whole blood sample" },
    { value: "serum", label: "Serum", shortened: "se", description: "Serum sample" },
    { value: "plasma", label: "Plasma", shortened: "pl", description: "Plasma sample" },
    { value: "buffy_coat", label: "Buffy Coat", shortened: "bc", description: "Buffy coat sample" },
    { value: "genomic_dna", label: "Genomic DNA", shortened: "gd", description: "Genomic DNA" },
    { value: "cdna", label: "cDNA", shortened: "cd", description: "Complementary DNA" },
    { value: "rna", label: "RNA", shortened: "rn", description: "Ribonucleic Acid" },
    { value: "muscle", label: "Muscle", shortened: "mu", description: "Muscle tissue" },
    { value: "fat", label: "Fat", shortened: "fa", description: "Fat tissue" },
    { value: "skin", label: "Skin", shortened: "sk", description: "Skin tissue" },
    { value: "bone", label: "Bone", shortened: "bo", description: "Bone tissue" },
    { value: "organ", label: "Organ", shortened: "or", description: "Organ tissue" },
    { value: "gland", label: "Gland", shortened: "gl", description: "Gland tissue" },
    { value: "nerve", label: "Nerve", shortened: "ne", description: "Nerve tissue" },
    { value: "eye", label: "Eye", shortened: "ey", description: "Eye tissue" },
    { value: "gut", label: "Gut", shortened: "gu", description: "Gut tissue" },
    { value: "reproductive", label: "Reproductive", shortened: "re", description: "Reproductive tissue" },
    { value: "generic_speciment_subsample", label: "Generic Specimen Subsample", shortened: "gs", description: "Generic specimen subsample, e.g. a leg" },
    { value: "saliva", label: "Saliva", shortened: "sa", description: "Saliva sample" },
    { value: "venom", label: "Venom", shortened: "ve", description: "Venom sample" },
    { value: "mucus", label: "Mucus", shortened: "mu", description: "Mucus sample" },
    { value: "silk", label: "Silk", shortened: "si", description: "Silk sample" },
    { value: "sperm", label: "Sperm", shortened: "sp", description: "Sperm sample" },
    { value: "faeces", label: "Faeces", shortened: "fa", description: "Faeces sample" },
    { value: "urine", label: "Urine", shortened: "ur", description: "Urine sample" },
    { value: "leaf", label: "Leaf", shortened: "lf", description: "Leaf tissue" },
    { value: "bark", label: "Bark", shortened: "bk", description: "Bark tissue" },
    { value: "wood", label: "Wood", shortened: "wd", description: "Wood tissue" },
    { value: "root", label: "Root", shortened: "rt", description: "Root tissue" },
    { value: "flower", label: "Flower", shortened: "fl", description: "Flower tissue" },
    { value: "fruit", label: "Fruit", shortened: "fr", description: "Fruit tissue" },
    { value: "seed", label: "Seed", shortened: "sd", description: "Seed tissue" },
    { value: "pollen", label: "Pollen", shortened: "po", description: "Pollen sample" },
    { value: "sap", label: "Sap", shortened: "sa", description: "Plant sap sample" }
  ],
  silkcategories: [
    { value: "dragline", label: "Dragline", shortened: "dl" },
    { value: "attachment", label: "Attachment", shortened: "at" },
    { value: "cribellar net", label: "Cribellar Net", shortened: "crn" },
    { value: "cribellar line", label: "Cribellar Line", shortened: "crl" },
    { value: "cribellar web", label: "Cribellar Web", shortened: "crw" },
    { value: "cocoon", label: "Cocoon", shortened: "cc" },
    { value: "eggsac", label: "Egg sac", shortened: "es" },
    { value: "flagelliform", label: "Flagelliform", shortened: "fl" },
    { value: "minor ampullate", label: "Minor", shortened: "mi" },
    { value: "major ampullate", label: "Major", shortened: "ma" },
    { value: "tubuliform", label: "Tubuliform", shortened: "tu" },
    { value: "aciniform", label: "Aciniform", shortened: "ac" },
    { value: "all fibres", label: "Fibres from all spinnerets", shortened: "al" },
    { value: "viscid", label: "Viscid", shortened: "vi" },
    { value: "unknown", label: "Unknown", shortened: "un" },
    { value: "prey wrap", label: "Prey Wrap", shortened: "pw" },
    { value: "intercepted prey wrap", label: "Intercepted Prey Wrap", shortened: "ipw" },
    { value: "gumfoot", label: "Gumfoot", shortened: "gf" },
    { value: "sheet web", label: "Sheet Web", shortened: "sw" },
    { value: "tangle web", label: "Tangle Web", shortened: "tw" },
    { value: "capture thread", label: "Capture Thread", shortened: "ct" },
    { value: "bridging line", label: "Bridging Line", shortened: "bl" },
    { value: "retreat", label: "Retreat", shortened: "rt" },
    { value: "nest", label: "Nest", shortened: "ne" },
    { value: "scaffold", label: "Scaffold", shortened: "sc" },
    { value: "escape jump", label: "escape jump", shortened: "ej" },
    { value: "manual collection", label: "Manual Collection", shortened: "mc" },
    { value: "walking", label: "Fibres from walking", shortened: "wlk" },
    { value: "other", label: "Other", shortened: "ot" }
  ],
  siprefixes: [
    { label: "Yotta", value: "Y", power: 24 },
    { label: "Zetta", value: "Z", power: 21 },
    { label: "Exa", value: "E", power: 18 },
    { label: "Peta", value: "P", power: 15 },
    { label: "Tera", value: "T", power: 12 },
    { label: "Giga", value: "G", power: 9 },
    { label: "Mega", value: "M", power: 6 },
    { label: "Kilo", value: "k", power: 3 },
    { label: "Hecto", value: "h", power: 2 },
    { label: "Deka", value: "da", power: 1 },
    { label: "Deci", value: "d", power: -1 },
    { label: "Centi", value: "c", power: -2 },
    { label: "Milli", value: "m", power: -3 },
    { label: "Micro", value: "µ", power: -6 },
    { label: "Nano", value: "n", power: -9 },
    { label: "Pico", value: "p", power: -12 },
    { label: "Femto", value: "f", power: -15 },
    { label: "Atto", value: "a", power: -18 },
    { label: "Zepto", value: "z", power: -21 },
    { label: "Yocto", value: "y", power: -24 }
  ]
};

// Individual exports for backward compatibility
export const sampletypes = DEFAULT_CONFIGS.sampletypes;
export const traittypes = DEFAULT_CONFIGS.traittypes;
export const equipmenttypes = DEFAULT_CONFIGS.equipmenttypes;
export const samplesubtypes = DEFAULT_CONFIGS.samplesubtypes;
export const silkcategories = DEFAULT_CONFIGS.silkcategories;
export const siprefixes = DEFAULT_CONFIGS.siprefixes;
