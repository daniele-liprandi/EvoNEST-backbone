// Import configuration from shared source to eliminate duplication
import { 
  sampletypes as defaultSampletypes,
  traittypes as defaultTraittypes,
  equipmenttypes as defaultEquipmenttypes,
  samplesubtypes as defaultSamplesubtypes,
  silkcategories as defaultSilkcategories,
  siprefixes as defaultSiprefixes,
  baseunits as defaultBaseunits
} from "@/shared/config/default-types";

// Define the template LabelType, which has value, label, description, and optionally unit
export type LabelType = {
    value: string,
    label: string,
    description?: string,
    unit?: string,
    shortened?: string,
    power?: number, // For SI prefixes
    category?: string, // For base units
};

// Export the default configurations (these are used as fallbacks when the API is not available)
export const sampletypes: LabelType[] = defaultSampletypes;
export const traittypes: LabelType[] = defaultTraittypes;
export const equipmenttypes: LabelType[] = defaultEquipmenttypes;
export const samplesubtypes: LabelType[] = defaultSamplesubtypes;
export const silkcategories: LabelType[] = defaultSilkcategories;
export const SIprefixes = defaultSiprefixes;
export const baseunits: LabelType[] = defaultBaseunits;

export function extractPowerFromPrefixBeforeText(fullUnit: string, suffixUnit: string ) {
    const prefix = fullUnit.endsWith(suffixUnit) ? fullUnit.slice(0, -suffixUnit.length) : fullUnit;
    const found = SIprefixes.find(p => p.value === prefix);
    return found ? found.power : 0;
}

export function putPrefixBeforeText(power: number, suffixUnit: string) {
    const found = SIprefixes.find(p => p.power === power);
    return found ? found.value + suffixUnit : suffixUnit;
}
