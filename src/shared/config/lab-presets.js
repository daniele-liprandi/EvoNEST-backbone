import { DEFAULT_CONFIGS } from "./default-types";

// A lab preset is a partial override of DEFAULT_CONFIGS applied at first setup.
// It only names the config types that differ (usually sampletypes / traittypes);
// everything it does not name falls back to the shipped default. Admins edit all
// of it afterwards under Settings.

const SAMPLE_TYPES = {
  animal: { value: "animal", label: "Animal", description: "Animal individual", shortened: "an", husbandry: true },
  subsample: { value: "subsample", label: "Subsample", description: "A part of another sample", shortened: "sub" },
  silk: { value: "silk", label: "Silk", description: "Silk fibre or structure", shortened: "si" },
  plant: { value: "plant", label: "Plant", description: "Plant individual", shortened: "pl" },
  blood: { value: "blood", label: "Blood", description: "Blood sample", shortened: "bl" },
  tissue: { value: "tissue", label: "Tissue", description: "Tissue sample", shortened: "ti" },
  dna_extract: { value: "dna_extract", label: "DNA extract", description: "DNA extract", shortened: "dna" },
  secretion: { value: "secretion", label: "Secretion", description: "Secretion sample", shortened: "se" },
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
];

/** The full config set for a preset value, or null if the value is unknown. */
export function resolvePreset(value) {
  const preset = LAB_PRESETS.find((p) => p.value === value);
  if (!preset) return null;
  return { ...DEFAULT_CONFIGS, ...preset.overrides };
}
