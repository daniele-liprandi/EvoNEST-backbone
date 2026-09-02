import { DEFAULT_CONFIGS } from "./default-types";

// A lab preset is a partial override of DEFAULT_CONFIGS applied at first setup.
// It only names the config types that differ (usually sampletypes / traittypes);
// everything it does not name falls back to the shipped default. Admins edit all
// of it afterwards under Settings.

// --- Sample-table column layouts -------------------------------------------
// Each sample type carries the `columns` list its table shows (see
// buildSampleColumns). Entries are either a built-in palette key or a custom
// column object { key, label, kind, ... }. These lists are what makes a preset
// feel purpose-built rather than a bag of fields.

const IDENTITY = ["name", "responsible", "recentChange", "date", "location"];
const TAXONOMY = ["family", "genus", "species"];
const STORAGE_COLUMNS = ["name", "responsible", "parent", "recentChange", "date", "box", "slot", "location"];
const SUBSAMPLE_COLUMNS = ["name", "parent", "recentChange", "date", "subsampletype", "box", "slot", "location"];

const ANIMAL_COLUMNS = [
  ...IDENTITY, ...TAXONOMY,
  "sex", "lifestage", "lifestatus", "hungry", "fed", "molted", "eggsac",
];

const SILK_COLUMNS = ["name", "responsible", "parent", "recentChange", "date", "location"];

const PLANT_COLUMNS = [...IDENTITY, ...TAXONOMY];

const CROP_COLUMNS = [
  "name", "responsible", "recentChange", "date", "location",
  "genus", "species",
  { key: "plot", label: "Plot", kind: "text" },
  { key: "treatment", label: "Treatment", kind: "text" },
  {
    key: "growthStage",
    label: "Growth stage",
    kind: "toggle",
    options: [
      { value: "seedling", label: "Seedling" },
      { value: "vegetative", label: "Vegetative" },
      { value: "flowering", label: "Flowering" },
      { value: "fruiting", label: "Fruiting" },
      { value: "senescent", label: "Senescent" },
    ],
  },
  { key: "watered", label: "Watered", kind: "counter", icon: "💧" },
  { key: "fertilised", label: "Fertilised", kind: "counter", icon: "🌱" },
  { key: "sownDate", label: "Sown", kind: "date" },
  { key: "maturity", label: "To harvest", kind: "progress", field: "sownDate", days: 120 },
  { key: "harvestDate", label: "Harvested", kind: "date" },
];

const HERBARIUM_COLUMNS = [
  "name", "responsible", "recentChange", "date", "location",
  ...TAXONOMY,
  { key: "collector", label: "Collector", kind: "text" },
  { key: "accession", label: "Accession", kind: "text" },
  { key: "collectedDate", label: "Collected", kind: "date" },
  {
    key: "phenology",
    label: "Phenology",
    kind: "toggle",
    options: [
      { value: "sterile", label: "Sterile" },
      { value: "budding", label: "Budding" },
      { value: "flowering", label: "Flowering" },
      { value: "fruiting", label: "Fruiting" },
    ],
  },
  { key: "determiner", label: "Det. by", kind: "text" },
  {
    key: "mounting",
    label: "Mounting",
    kind: "toggle",
    options: [
      { value: "pressed", label: "Pressed" },
      { value: "mounted", label: "Mounted" },
      { value: "filed", label: "Filed" },
    ],
  },
];

const SPECIMEN_COLUMNS = [
  "name", "responsible", "recentChange", "date", "location",
  ...TAXONOMY,
  { key: "catalogue", label: "Catalogue no.", kind: "text" },
  {
    key: "preparation",
    label: "Preparation",
    kind: "toggle",
    options: [
      { value: "skin", label: "Skin" },
      { value: "skeleton", label: "Skeleton" },
      { value: "fluid", label: "Fluid" },
      { value: "mount", label: "Mount" },
    ],
  },
  { key: "collector", label: "Collector", kind: "text" },
  { key: "collectedDate", label: "Collected", kind: "date" },
  "sex", "lifestage",
  {
    key: "loan",
    label: "Loan",
    kind: "toggle",
    options: [
      { value: "in-collection", label: "In collection" },
      { value: "on-loan", label: "On loan" },
      { value: "missing", label: "Missing" },
    ],
  },
  {
    key: "condition",
    label: "Condition",
    kind: "toggle",
    options: [
      { value: "good", label: "Good" },
      { value: "fair", label: "Fair" },
      { value: "poor", label: "Poor" },
    ],
  },
];

const SEQ_COLUMNS = [
  "name", "responsible", "parent", "recentChange", "date",
  { key: "extractionDate", label: "Extracted", kind: "date" },
  {
    key: "libPrep",
    label: "Library prep",
    kind: "toggle",
    options: [
      { value: "queued", label: "Queued" },
      { value: "prepped", label: "Prepped" },
      { value: "failed", label: "Failed" },
    ],
  },
  { key: "run", label: "Run", kind: "text" },
  {
    key: "qc",
    label: "QC",
    kind: "toggle",
    options: [
      { value: "pending", label: "Pending" },
      { value: "pass", label: "Pass" },
      { value: "fail", label: "Fail" },
      { value: "repeat", label: "Repeat" },
    ],
  },
  { key: "barcode", label: "Index", kind: "text" },
  { key: "turnaround", label: "Turnaround", kind: "progress", field: "extractionDate", days: 30 },
  { key: "concentration", label: "ng/µl", kind: "number" },
];

const STRAIN_COLUMNS = [
  "name", "responsible", "recentChange", "date", "location",
  "genus", "species",
  { key: "strainId", label: "Strain ID", kind: "text" },
  { key: "medium", label: "Medium", kind: "text" },
  { key: "isolationSource", label: "Source", kind: "text" },
  { key: "passage", label: "Passage", kind: "counter" },
  { key: "cryovials", label: "Cryovials", kind: "counter", icon: "🧊" },
  {
    key: "contamination",
    label: "Contamination",
    kind: "toggle",
    options: [
      { value: "clean", label: "Clean" },
      { value: "suspect", label: "Suspect" },
      { value: "contaminated", label: "Contaminated" },
    ],
  },
  { key: "revivedDate", label: "Last revived", kind: "date" },
];

// --- Create-form field layouts -------------------------------------------
// The `fields` list a sample type shows in the create form (see
// buildSampleFields). It reuses the type's `columns` so a custom column and its
// form input stay in step: every typed-in custom column becomes a field.
// Counters and progress bars are computed or incremented from the table, so they
// are not asked for at creation.

const ANIMAL_FIELDS = ["taxonomy", "sex", "responsible", "date", "location"];
const SUBSAMPLE_FIELDS = ["parent", "taxonomy", "subsampletype", "box", "slot", "responsible", "date", "location"];
const STORAGE_FIELDS = ["parent", "responsible", "date", "box", "slot", "location"];
const SILK_FIELDS = ["parent", "responsible", "date", "location"];
const PLANT_FIELDS = ["taxonomy", "responsible", "date", "location"];

const FORM_KIND = { text: "text", number: "number", date: "date", toggle: "select" };

function formFields(builtins, columns) {
  const custom = columns
    .filter((c) => c && typeof c === "object" && FORM_KIND[c.kind])
    .map((c) => ({
      key: c.key,
      label: c.label,
      kind: FORM_KIND[c.kind],
      ...(c.options ? { options: c.options } : {}),
    }));
  return [...builtins, ...custom];
}

const SAMPLE_TYPES = {
  animal: { value: "animal", label: "Animal", description: "Animal individual", shortened: "an", columns: ANIMAL_COLUMNS, fields: ANIMAL_FIELDS },
  subsample: { value: "subsample", label: "Subsample", description: "A part of another sample", shortened: "sub", columns: SUBSAMPLE_COLUMNS, fields: SUBSAMPLE_FIELDS },
  silk: { value: "silk", label: "Silk", description: "Silk fibre or structure", shortened: "si", columns: SILK_COLUMNS, fields: SILK_FIELDS },
  plant: { value: "plant", label: "Plant", description: "Plant individual", shortened: "pl", columns: PLANT_COLUMNS, fields: PLANT_FIELDS },
  crop: { value: "crop", label: "Crop plant", description: "A crop plant or plot followed through a season", shortened: "cr", columns: CROP_COLUMNS, fields: formFields(PLANT_FIELDS, CROP_COLUMNS) },
  blood: { value: "blood", label: "Blood", description: "Blood sample", shortened: "bl", columns: STORAGE_COLUMNS, fields: STORAGE_FIELDS },
  tissue: { value: "tissue", label: "Tissue", description: "Tissue sample", shortened: "ti", columns: STORAGE_COLUMNS, fields: STORAGE_FIELDS },
  dna_extract: { value: "dna_extract", label: "DNA extract", description: "DNA extract", shortened: "dna", columns: STORAGE_COLUMNS, fields: STORAGE_FIELDS },
  secretion: { value: "secretion", label: "Secretion", description: "Secretion sample", shortened: "se", columns: STORAGE_COLUMNS, fields: STORAGE_FIELDS },
  herbarium: { value: "herbarium", label: "Herbarium specimen", description: "A pressed, mounted plant specimen", shortened: "hb", columns: HERBARIUM_COLUMNS, fields: formFields(PLANT_FIELDS, HERBARIUM_COLUMNS) },
  specimen: { value: "specimen", label: "Museum specimen", description: "A prepared, catalogued specimen", shortened: "sp", columns: SPECIMEN_COLUMNS, fields: formFields([...PLANT_FIELDS, "sex"], SPECIMEN_COLUMNS) },
  seqsample: { value: "seqsample", label: "Sequencing sample", description: "An extract moving through library prep and sequencing", shortened: "seq", columns: SEQ_COLUMNS, fields: formFields(["parent", "responsible", "date"], SEQ_COLUMNS) },
  strain: { value: "strain", label: "Strain", description: "A microbial strain or isolate", shortened: "st", columns: STRAIN_COLUMNS, fields: formFields(PLANT_FIELDS, STRAIN_COLUMNS) },
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
    overrides: {
      sampletypes: [SAMPLE_TYPES.animal, SAMPLE_TYPES.subsample, SAMPLE_TYPES.silk],
      traittypes: [TRAIT_TYPES.mass, TRAIT_TYPES.length, TRAIT_TYPES.width],
    },
  },
  {
    value: "silk-biomechanics",
    label: "Silk biomechanics",
    description: "Fibre mechanics: silk samples, tensile properties and diameter.",
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
