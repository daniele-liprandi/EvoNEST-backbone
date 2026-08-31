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

const SAMPLE_TYPES = {
  animal: { value: "animal", label: "Animal", description: "Animal individual", shortened: "an", columns: ANIMAL_COLUMNS },
  subsample: { value: "subsample", label: "Subsample", description: "A part of another sample", shortened: "sub", columns: SUBSAMPLE_COLUMNS },
  silk: { value: "silk", label: "Silk", description: "Silk fibre or structure", shortened: "si", columns: SILK_COLUMNS },
  plant: { value: "plant", label: "Plant", description: "Plant individual", shortened: "pl", columns: PLANT_COLUMNS },
  crop: { value: "crop", label: "Crop plant", description: "A crop plant or plot followed through a season", shortened: "cr", columns: CROP_COLUMNS },
  blood: { value: "blood", label: "Blood", description: "Blood sample", shortened: "bl", columns: STORAGE_COLUMNS },
  tissue: { value: "tissue", label: "Tissue", description: "Tissue sample", shortened: "ti", columns: STORAGE_COLUMNS },
  dna_extract: { value: "dna_extract", label: "DNA extract", description: "DNA extract", shortened: "dna", columns: STORAGE_COLUMNS },
  secretion: { value: "secretion", label: "Secretion", description: "Secretion sample", shortened: "se", columns: STORAGE_COLUMNS },
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
];

/** The full config set for a preset value, or null if the value is unknown. */
export function resolvePreset(value) {
  const preset = LAB_PRESETS.find((p) => p.value === value);
  if (!preset) return null;
  return { ...DEFAULT_CONFIGS, ...preset.overrides };
}
