import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { NextResponse } from "next/server";
import { get_database_user, get_name_authuser } from "@/app/api/utils/get_database_user";

// Default configurations from types.ts
const DEFAULT_CONFIGS = {
  sampletypes: [
    { label: "Animal", value: "animal", description: "Animal individual", shortened: "an" },
    { label: "Blood", value: "blood", description: "Blood sample", shortened: "bl" },
    { label: "DNA extract", value: "dna_extract", description: "DNA extract", shortened: "dna" },
    { label: "Tissue", value: "tissue", description: "Tissue sample", shortened: "ti" },
    { label: "Secretion", value: "secretion", description: "Secretion sample", shortened: "se" }
  ],
  traittypes: [
    { value: "mass", label: "Mass", unit: "g", description: "Mass of the sample measured using a microbalance" },
    { value: "length", label: "Length", unit: "mm", description: "Length of the sample measured from maximum to minimum point along the longest symmetry axis" },
    { value: "width", label: "Width", unit: "mm", description: "Width of the sample measured from maximum to minimum point along the perpendicular to the longest symmetry axis" },
    { value: "dna_concentration", label: "DNA Concentration", unit: "ng/µl", description: "DNA concentration of the sample" },
    { value: "resting_metabolic_rate", label: "Resting Metabolic Rate", unit: "W", description: "Metabolic rate measured by respirometry at rest" }
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
    { value: "urine", label: "Urine", shortened: "ur", description: "Urine sample" }
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

/**
 * @swagger
 * /api/config/types/seed:
 *   post:
 *     summary: Seed database with default configurations
 *     description: Initialize the config collection with default type configurations
 *     tags:
 *       - Configuration
 *     responses:
 *       200:
 *         description: Database seeded successfully
 *       500:
 *         description: Server error
 */
export async function POST(req) {
  try {
    const client = await get_or_create_client();
    const authuser = await get_name_authuser() || "system";

    if (client == null) {
      return new NextResponse(JSON.stringify({ error: "Failed to connect to database" }), { status: 500 });
    }

    const dbname = await get_database_user();
    const db = client.db(dbname);
    const configs = db.collection("config");

    const results = [];

    for (const [configType, data] of Object.entries(DEFAULT_CONFIGS)) {
      // Check if config already exists
      const existingConfig = await configs.findOne({ type: configType });
      
      if (!existingConfig) {
        const configData = {
          type: configType,
          data: data,
          version: 1,
          lastModified: new Date().toISOString(),
          modifiedBy: authuser,
          isDefault: true
        };

        const result = await configs.insertOne(configData);
        results.push({ type: configType, created: !!result.insertedId });
      } else {
        results.push({ type: configType, created: false, message: "Already exists" });
      }
    }

    return NextResponse.json({ 
      message: "Seeding completed", 
      results: results 
    });

  } catch (error) {
    console.error('Config seed error:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
