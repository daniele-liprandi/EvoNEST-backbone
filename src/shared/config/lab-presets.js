import { DEFAULT_CONFIGS } from "./default-types";

// A lab preset is a partial override of DEFAULT_CONFIGS applied at first setup.
// It names only the config types that differ (usually sampletypes / traittypes);
// the rest falls back to the shipped default. Admins edit all of it afterwards.

// --- Per-type field and column layouts -----------------------------------
// `fields` is the type's data field list: built-in keys (see samples/fields.js)
// and custom { key, label, kind, options? } objects. It drives the create form
// and the row edit dialog. `columns` is the table layout: built-in column keys,
// this type's own field keys, and counter / progress widget objects. A field is
// defined once in `fields` and named by key in `columns`.

const STORAGE_FIELDS = ["parent", "responsible", "date", "box", "slot", "location"];
const SUBSAMPLE_FIELDS = ["parent", "taxonomy", "subsampletype", "box", "slot", "responsible", "date", "location"];
const SILK_FIELDS = ["parent", "responsible", "date", "location"];
const ANIMAL_FIELDS = ["taxonomy", "sex", "responsible", "date", "location"];

const IDENTITY = ["name", "responsible", "recentChange", "date", "location"];
const TAXONOMY = ["family", "genus", "species"];
const STORAGE_COLUMNS = ["name", "parent", "responsible", "recentChange", "date", "box", "slot", "location"];
const SUBSAMPLE_COLUMNS = ["name", "parent", "recentChange", "date", "subsampletype", "box", "slot", "location"];
const SILK_COLUMNS = ["name", "responsible", "parent", "recentChange", "date", "location"];
const ANIMAL_COLUMNS = [
  ...IDENTITY, ...TAXONOMY,
  "sex", "lifestage", "lifestatus", "hungry", "fed", "molted", "eggsac",
];

const OPT = (...values) => values.map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));
const GROWTH_STAGE = OPT("seedling", "vegetative", "flowering", "fruiting", "senescent");
const PHENOLOGY = OPT("sterile", "budding", "flowering", "fruiting");
const MOUNTING = OPT("pressed", "mounted", "filed");
const PREPARATION = OPT("skin", "skeleton", "fluid", "mount");
const LOAN = [
  { value: "in-collection", label: "In collection" },
  { value: "on-loan", label: "On loan" },
  { value: "missing", label: "Missing" },
];
const CONDITION = OPT("good", "fair", "poor");
const LIBPREP = OPT("queued", "prepped", "failed");
const QC = OPT("pending", "pass", "fail", "repeat");
const CONTAMINATION = OPT("clean", "suspect", "contaminated");

const CROP_FIELDS = [
  "taxonomy", "responsible", "date", "location",
  { key: "plot", label: "Plot", kind: "text" },
  { key: "treatment", label: "Treatment", kind: "text" },
  { key: "growthStage", label: "Growth stage", kind: "select", options: GROWTH_STAGE },
  { key: "sownDate", label: "Sown", kind: "date" },
  { key: "harvestDate", label: "Harvested", kind: "date" },
];
const CROP_COLUMNS = [
  "name", "responsible", "recentChange", "date", "location", "genus", "species",
  "plot", "treatment", "growthStage",
  { key: "watered", label: "Watered", kind: "counter", icon: "💧" },
  { key: "fertilised", label: "Fertilised", kind: "counter", icon: "🌱" },
  "sownDate",
  { key: "maturity", label: "To harvest", kind: "progress", field: "sownDate", days: 120 },
  "harvestDate",
];

const HERBARIUM_FIELDS = [
  "taxonomy", "responsible", "date", "location",
  { key: "collector", label: "Collector", kind: "text" },
  { key: "accession", label: "Accession", kind: "text" },
  { key: "collectedDate", label: "Collected", kind: "date" },
  { key: "phenology", label: "Phenology", kind: "select", options: PHENOLOGY },
  { key: "determiner", label: "Det. by", kind: "text" },
  { key: "mounting", label: "Mounting", kind: "select", options: MOUNTING },
];
const HERBARIUM_COLUMNS = [
  "name", "responsible", "recentChange", "date", "location", ...TAXONOMY,
  "collector", "accession", "collectedDate", "phenology", "determiner", "mounting",
];

const SPECIMEN_FIELDS = [
  "taxonomy", "sex", "responsible", "date", "location",
  { key: "catalogue", label: "Catalogue no.", kind: "text" },
  { key: "preparation", label: "Preparation", kind: "select", options: PREPARATION },
  { key: "collector", label: "Collector", kind: "text" },
  { key: "collectedDate", label: "Collected", kind: "date" },
  { key: "loan", label: "Loan", kind: "select", options: LOAN },
  { key: "condition", label: "Condition", kind: "select", options: CONDITION },
];
const SPECIMEN_COLUMNS = [
  "name", "responsible", "recentChange", "date", "location", ...TAXONOMY,
  "catalogue", "preparation", "collector", "collectedDate",
  "sex", "lifestage", "loan", "condition",
];

const SEQ_FIELDS = [
  "parent", "responsible", "date",
  { key: "extractionDate", label: "Extracted", kind: "date" },
  { key: "libPrep", label: "Library prep", kind: "select", options: LIBPREP },
  { key: "run", label: "Run", kind: "text" },
  { key: "qc", label: "QC", kind: "select", options: QC },
  { key: "barcode", label: "Index", kind: "text" },
  { key: "concentration", label: "ng/µl", kind: "number" },
];
const SEQ_COLUMNS = [
  "name", "responsible", "parent", "recentChange", "date",
  "extractionDate", "libPrep", "run", "qc", "barcode",
  { key: "turnaround", label: "Turnaround", kind: "progress", field: "extractionDate", days: 30 },
  "concentration",
];

const STRAIN_FIELDS = [
  "taxonomy", "responsible", "date", "location",
  { key: "strainId", label: "Strain ID", kind: "text" },
  { key: "medium", label: "Medium", kind: "text" },
  { key: "isolationSource", label: "Source", kind: "text" },
  { key: "contamination", label: "Contamination", kind: "select", options: CONTAMINATION },
  { key: "revivedDate", label: "Last revived", kind: "date" },
];
const STRAIN_COLUMNS = [
  "name", "responsible", "recentChange", "date", "location", "genus", "species",
  "strainId", "medium", "isolationSource",
  { key: "passage", label: "Passage", kind: "counter" },
  { key: "cryovials", label: "Cryovials", kind: "counter", icon: "🧊" },
  "contamination", "revivedDate",
];

const T = (value, label, description, shortened, fields, columns, cards) => ({
  value, label, description, shortened, fields, columns,
  ...(cards ? { cards } : {}),
});

const SAMPLE_TYPES = {
  animal: T("animal", "Animal", "Animal individual", "an", ANIMAL_FIELDS, ANIMAL_COLUMNS),
  subsample: T("subsample", "Subsample", "A part of another sample", "sub", SUBSAMPLE_FIELDS, SUBSAMPLE_COLUMNS),
  silk: T("silk", "Silk", "Silk fibre or structure", "si", SILK_FIELDS, SILK_COLUMNS),
  crop: T("crop", "Crop plant", "A crop plant or plot followed through a season", "cr", CROP_FIELDS, CROP_COLUMNS),
  blood: T("blood", "Blood", "Blood sample", "bl", STORAGE_FIELDS, STORAGE_COLUMNS),
  tissue: T("tissue", "Tissue", "Tissue sample", "ti", STORAGE_FIELDS, STORAGE_COLUMNS),
  dna_extract: T("dna_extract", "DNA extract", "DNA extract", "dna", STORAGE_FIELDS, STORAGE_COLUMNS),
  secretion: T("secretion", "Secretion", "Secretion sample", "se", STORAGE_FIELDS, STORAGE_COLUMNS),
  herbarium: T("herbarium", "Herbarium specimen", "A pressed, mounted plant specimen", "hb", HERBARIUM_FIELDS, HERBARIUM_COLUMNS),
  specimen: T("specimen", "Museum specimen", "A prepared, catalogued specimen", "sp", SPECIMEN_FIELDS, SPECIMEN_COLUMNS),
  seqsample: T("seqsample", "Sequencing sample", "An extract moving through library prep and sequencing", "seq", SEQ_FIELDS, SEQ_COLUMNS),
  strain: T("strain", "Strain", "A microbial strain or isolate", "st", STRAIN_FIELDS, STRAIN_COLUMNS),
};

const TRAIT = (value, label, unit, description) => ({ value, label, unit, description });

const TRAIT_TYPES = {
  mass: TRAIT("mass", "Mass", "g", "Mass measured on a balance"),
  length: TRAIT("length", "Length", "mm", "Length along the longest axis"),
  width: TRAIT("width", "Width", "mm", "Width perpendicular to the longest axis"),
  fibre_diameter: TRAIT("fiber_diameter", "Fibre diameter", "μm", "Diameter of an individual fibre"),
  tensile_strength: TRAIT("tensile_strength", "Tensile strength", "MPa", "Maximum stress before failure"),
  youngs_modulus: TRAIT("youngs_modulus", "Young's modulus", "GPa", "Stiffness in the elastic region"),
  toughness: TRAIT("toughness", "Toughness", "MJ/m³", "Energy absorbed per unit volume to failure"),
  strain_at_break: TRAIT("strain_at_break", "Strain at break", "", "Extension at failure, as a fraction"),
  dna_concentration: TRAIT("dna_concentration", "DNA concentration", "ng/µl", "DNA concentration of the sample"),
  resting_metabolic_rate: TRAIT("resting_metabolic_rate", "Resting metabolic rate", "W", "Metabolic rate at rest"),
  bone_density: TRAIT("bone_density", "Bone density", "g/cm³", "Density of bone tissue"),
  cortical_thickness: TRAIT("cortical_thickness", "Cortical thickness", "mm", "Thickness of the cortical bone layer"),
  plant_height: TRAIT("plant_height", "Plant height", "cm", "Height from the soil to the highest point"),
  biomass: TRAIT("biomass", "Biomass", "g", "Dry aboveground biomass"),
  yield_mass: TRAIT("yield", "Yield", "g", "Harvested mass per plant or plot"),
  leaf_area: TRAIT("leaf_area", "Leaf area", "cm²", "Total leaf area"),
  chlorophyll: TRAIT("chlorophyll", "Chlorophyll content", "SPAD", "Relative chlorophyll in SPAD units"),
  leaf_length: TRAIT("leaf_length", "Leaf length", "mm", "Length of a representative leaf"),
  specific_leaf_area: TRAIT("specific_leaf_area", "Specific leaf area", "mm²/mg", "Leaf area per unit dry mass"),
  seed_mass: TRAIT("seed_mass", "Seed mass", "mg", "Mass of a single air-dried seed"),
  trichome_density: TRAIT("trichome_density", "Trichome density", "1/mm²", "Trichomes per unit leaf area"),
  total_length: TRAIT("total_length", "Total length", "mm", "Nose to tail tip"),
  tail_length: TRAIT("tail_length", "Tail length", "mm", "Base of tail to tip, excluding hair"),
  hindfoot_length: TRAIT("hindfoot_length", "Hind foot length", "mm", "Heel to tip of the longest claw"),
  ear_length: TRAIT("ear_length", "Ear length", "mm", "Notch to the tip of the pinna"),
  skull_length: TRAIT("skull_length", "Skull length", "mm", "Greatest length of the skull"),
  rin: TRAIT("rin", "RIN", "", "RNA integrity number"),
  fragment_size: TRAIT("fragment_size", "Fragment size", "bp", "Mean insert size of the library"),
  library_molarity: TRAIT("library_molarity", "Library molarity", "nM", "Molar concentration of the final library"),
  read_count: TRAIT("read_count", "Read count", "M reads", "Reads returned for the sample"),
  od600: TRAIT("od600", "OD₆₀₀", "", "Optical density at 600 nm"),
  doubling_time: TRAIT("doubling_time", "Doubling time", "min", "Time to double in exponential growth"),
  colony_diameter: TRAIT("colony_diameter", "Colony diameter", "mm", "Diameter of a single colony"),
  mic: TRAIT("mic", "Antibiotic MIC", "µg/ml", "Minimum inhibitory concentration"),
  biomass_yield: TRAIT("biomass_yield", "Biomass yield", "g/L", "Dry cell mass per litre of culture"),
};

export const LAB_PRESETS = [
  {
    value: "generic",
    label: "Generic",
    description: "Everything EvoNEST ships with. A good starting point if you are not sure.",
    overrides: {},
  },
  {
    value: "arthropod-husbandry",
    label: "Arthropod husbandry",
    description: "A live arthropod collection: animals, subsamples, silk, and the feeding / moulting controls.",
    keywords: [
      "arthropod", "arthropods", "insect", "insects", "spider", "spiders",
      "invertebrate", "invertebrates", "husbandry", "colony", "rearing",
      "feeding", "molt", "molting", "moult", "moulting", "terrarium",
    ],
    overrides: {
      sampletypes: [SAMPLE_TYPES.animal, SAMPLE_TYPES.subsample, SAMPLE_TYPES.silk],
      traittypes: [TRAIT_TYPES.mass, TRAIT_TYPES.length, TRAIT_TYPES.width],
    },
  },
  {
    value: "silk-biomechanics",
    label: "Silk biomechanics",
    description: "Fibre mechanics: silk samples, tensile properties and diameter.",
    keywords: [
      "silk", "spider silk", "web", "fibre", "fiber", "fibres", "fibers",
      "tensile", "biomechanics", "mechanical properties", "dragline", "spinning",
    ],
    overrides: {
      sampletypes: [SAMPLE_TYPES.silk, SAMPLE_TYPES.animal, SAMPLE_TYPES.subsample],
      traittypes: [
        TRAIT_TYPES.fibre_diameter,
        TRAIT_TYPES.tensile_strength,
        TRAIT_TYPES.youngs_modulus,
        TRAIT_TYPES.toughness,
        TRAIT_TYPES.strain_at_break,
      ],
    },
  },
  {
    value: "vertebrate-tissue",
    label: "Vertebrate tissue bank",
    description: "Tissue and fluid samples from vertebrates, with storage-oriented subtypes.",
    keywords: [
      "vertebrate", "vertebrates", "tissue bank", "biobank", "blood sample",
      "mammal", "mammals", "bird", "birds", "reptile", "reptiles",
      "amphibian", "amphibians", "necropsy",
    ],
    overrides: {
      sampletypes: [
        SAMPLE_TYPES.animal,
        SAMPLE_TYPES.blood,
        SAMPLE_TYPES.tissue,
        SAMPLE_TYPES.dna_extract,
        SAMPLE_TYPES.secretion,
      ],
      traittypes: [
        TRAIT_TYPES.mass,
        TRAIT_TYPES.length,
        TRAIT_TYPES.dna_concentration,
        TRAIT_TYPES.bone_density,
        TRAIT_TYPES.cortical_thickness,
        TRAIT_TYPES.resting_metabolic_rate,
      ],
    },
  },
  {
    value: "crop-field-trial",
    label: "Crop field trial",
    description:
      "Plots of a crop across a growing season: treatment and plot, growth stage, watering and fertiliser tallies, sowing and harvest dates.",
    keywords: [
      "crop", "crops", "agriculture", "agronomy", "field trial", "farming",
      "farm", "yield", "harvest", "sowing", "irrigation", "fertiliser",
      "fertilizer", "growth stage",
    ],
    overrides: {
      sampletypes: [SAMPLE_TYPES.crop, SAMPLE_TYPES.subsample, SAMPLE_TYPES.tissue],
      traittypes: [
        TRAIT_TYPES.plant_height,
        TRAIT_TYPES.biomass,
        TRAIT_TYPES.yield_mass,
        TRAIT_TYPES.leaf_area,
        TRAIT_TYPES.chlorophyll,
        TRAIT_TYPES.mass,
      ],
    },
  },
  {
    value: "herbarium",
    label: "Herbarium collection",
    description:
      "Pressed and mounted plant specimens: collector and accession, phenology, determination history, mounting status.",
    keywords: [
      "herbarium", "botany", "botanical", "pressed specimen", "flora",
      "voucher specimen", "phenology", "plant", "plants",
    ],
    overrides: {
      sampletypes: [SAMPLE_TYPES.herbarium, SAMPLE_TYPES.subsample, SAMPLE_TYPES.tissue],
      traittypes: [
        TRAIT_TYPES.leaf_length,
        TRAIT_TYPES.leaf_area,
        TRAIT_TYPES.specific_leaf_area,
        TRAIT_TYPES.seed_mass,
        TRAIT_TYPES.trichome_density,
      ],
    },
  },
  {
    value: "museum-specimens",
    label: "Natural history collection",
    description:
      "Prepared, catalogued specimens: preparation type, collector, loan status and condition, with the standard measurements.",
    keywords: [
      "museum", "natural history", "catalogued specimen", "taxidermy",
      "skeleton", "skin specimen", "voucher", "loan",
    ],
    overrides: {
      sampletypes: [SAMPLE_TYPES.specimen, SAMPLE_TYPES.tissue, SAMPLE_TYPES.subsample],
      traittypes: [
        TRAIT_TYPES.total_length,
        TRAIT_TYPES.tail_length,
        TRAIT_TYPES.hindfoot_length,
        TRAIT_TYPES.ear_length,
        TRAIT_TYPES.skull_length,
        TRAIT_TYPES.mass,
      ],
    },
  },
  {
    value: "sequencing-pipeline",
    label: "Sequencing pipeline",
    description:
      "Extracts moving through library prep and sequencing: prep and QC status, run and index, turnaround, concentration.",
    keywords: [
      "sequencing", "genomics", "library prep", "ngs", "next-generation sequencing",
      "dna library", "illumina", "nanopore", "genome", "transcriptome", "barcode",
    ],
    overrides: {
      sampletypes: [SAMPLE_TYPES.seqsample, SAMPLE_TYPES.tissue, SAMPLE_TYPES.animal],
      traittypes: [
        TRAIT_TYPES.dna_concentration,
        TRAIT_TYPES.rin,
        TRAIT_TYPES.fragment_size,
        TRAIT_TYPES.library_molarity,
        TRAIT_TYPES.read_count,
      ],
    },
  },
  {
    value: "microbial-culture",
    label: "Microbial culture collection",
    description:
      "Strains and isolates: medium and isolation source, passage and cryostock tallies, contamination status, revival date.",
    keywords: [
      "microbial", "microbe", "microbes", "bacteria", "bacterial", "fungus",
      "fungal", "yeast", "isolate", "isolates", "strain collection",
      "culture collection", "cryostock",
    ],
    overrides: {
      sampletypes: [SAMPLE_TYPES.strain, SAMPLE_TYPES.subsample],
      traittypes: [
        TRAIT_TYPES.od600,
        TRAIT_TYPES.doubling_time,
        TRAIT_TYPES.colony_diameter,
        TRAIT_TYPES.mic,
        TRAIT_TYPES.biomass_yield,
      ],
    },
  },
];

/** The full config set for a preset value, or null if the value is unknown. */
export function resolvePreset(value) {
  const preset = LAB_PRESETS.find((p) => p.value === value);
  if (!preset) return null;
  return { ...DEFAULT_CONFIGS, ...preset.overrides };
}

const escapeRegExp = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

/** How many of a preset's keywords appear (whole-word) in the free text. */
const keywordHits = (text, keywords) =>
  keywords.reduce((count, keyword) => {
    const pattern = new RegExp(`\\b${escapeRegExp(keyword).replace(/\s+/g, "\\s+")}\\b`, "i");
    return pattern.test(text) ? count + 1 : count;
  }, 0);

/**
 * Best-matching preset value for a free-text lab description, or null if
 * nothing scores (the wizard then leaves the default "generic" selected).
 * Deterministic keyword matching, not an LLM call — a simple, fast first
 * pass. Ties keep whichever preset is listed first in LAB_PRESETS.
 */
export function suggestPreset(description) {
  const text = (description || "").trim();
  if (!text) return null;

  let bestValue = null;
  let bestScore = 0;
  for (const preset of LAB_PRESETS) {
    if (!preset.keywords?.length) continue;
    const score = keywordHits(text, preset.keywords);
    if (score > bestScore) {
      bestScore = score;
      bestValue = preset.value;
    }
  }
  return bestValue;
}
