import { siprefixes, baseunits as defaultBaseUnits } from "@/shared/config/default-types";

/**
 * Extract SI prefix and base unit from a unit string
 * Returns { prefix: string, baseUnit: string, power: number }
 * 
 * Strategy:
 * - Units with length 1 cannot have a prefix (e.g., "g", "m")
 * - Try matching each SI prefix at the start of the unit
 * - Accept the match if the remaining base unit is either:
 *   a) A single-letter base unit from the baseunits configuration
 *   b) A compound unit with 2+ characters (Pa, Hz, Wb, etc.)
 * 
 * @param {string} unit - The unit string (e.g., "mm", "GPa", "μm")
 * @param {Array} baseUnits - Array of base unit configurations (optional, uses defaults if not provided)
 * @returns {{ prefix: string, baseUnit: string, power: number } | null}
 */
export function extractSIPrefix(unit, baseUnits = null) {
  if (!unit || unit.length <= 1) {
    // Single character units cannot have a prefix
    return { prefix: "", baseUnit: unit, power: 0 };
  }

  // Use provided baseUnits or fall back to defaults
  const units = baseUnits || defaultBaseUnits;
  // Extract just the unit values (e.g., ["m", "g", "Pa", "Hz", ...])
  const unitValues = units.map(u => u.value);

  // Sort prefixes by length (longest first) to match "da" before "d"
  const sortedPrefixes = [...siprefixes].sort((a, b) => b.value.length - a.value.length);

  for (const prefix of sortedPrefixes) {
    if (unit.startsWith(prefix.value)) {
      const baseUnit = unit.substring(prefix.value.length);
      
      // Accept if the remaining baseUnit is in our list of valid base units
      if (baseUnit.length > 0 && unitValues.includes(baseUnit)) {
        return {
          prefix: prefix.value,
          baseUnit: baseUnit,
          power: prefix.power
        };
      }
    }
  }

  // No prefix found
  return { prefix: "", baseUnit: unit, power: 0 };
}

/**
 * Check if two units are compatible (same base unit, different prefixes)
 * @param {string} unit1 
 * @param {string} unit2
 * @param {Array} baseUnits - Array of base unit configurations (optional)
 * @returns {boolean}
 */
export function areUnitsCompatible(unit1, unit2, baseUnits = null) {
  const parsed1 = extractSIPrefix(unit1, baseUnits);
  const parsed2 = extractSIPrefix(unit2, baseUnits);
  
  return parsed1.baseUnit === parsed2.baseUnit;
}

/**
 * Convert a measurement from one unit to another (with different SI prefixes)
 * @param {number} value - The measurement value
 * @param {string} fromUnit - Current unit
 * @param {string} toUnit - Target unit
 * @param {Array} baseUnits - Array of base unit configurations (optional)
 * @returns {number | null} - Converted value or null if units are incompatible
 */
export function convertMeasurement(value, fromUnit, toUnit, baseUnits = null) {
  if (!areUnitsCompatible(fromUnit, toUnit, baseUnits)) {
    return null;
  }

  const from = extractSIPrefix(fromUnit, baseUnits);
  const to = extractSIPrefix(toUnit, baseUnits);

  // Convert using power difference
  // Example: mm to m -> from.power = -3, to.power = 0 -> difference = -3
  // value_in_m = value_in_mm * 10^(-3)
  // Example: GPa to Pa -> from.power = 9, to.power = 0 -> difference = 9
  // value_in_Pa = value_in_GPa * 10^9
  const powerDifference = from.power - to.power;
  const convertedValue = value * Math.pow(10, powerDifference);

  return convertedValue;
}

/**
 * Get the default unit for a trait type from the configuration
 * @param {string} traitType - The trait type (e.g., "mass", "length")
 * @param {Array} traitTypesConfig - Array of trait type configurations
 * @returns {string | null} - The default unit or null if not found
 */
export function getDefaultUnitForTraitType(traitType, traitTypesConfig) {
  const config = traitTypesConfig.find(t => t.value === traitType);
  return config?.unit || null;
}

/**
 * Determine if a trait needs conversion and calculate the converted value
 * @param {Object} trait - Trait object with type, measurement, and unit
 * @param {Array} traitTypesConfig - Array of trait type configurations
 * @param {Array} baseUnits - Array of base unit configurations (optional)
 * @returns {{ needsConversion: boolean, newValue: number | null, newUnit: string | null, reason: string }}
 */
export function analyzeTraitConversion(trait, traitTypesConfig, baseUnits = null) {
  const defaultUnit = getDefaultUnitForTraitType(trait.type, traitTypesConfig);
  
  if (!defaultUnit) {
    return {
      needsConversion: false,
      newValue: null,
      newUnit: null,
      reason: "No default unit configured for this trait type"
    };
  }

  if (trait.unit === defaultUnit) {
    return {
      needsConversion: false,
      newValue: null,
      newUnit: null,
      reason: "Already in default unit"
    };
  }

  if (!areUnitsCompatible(trait.unit, defaultUnit, baseUnits)) {
    return {
      needsConversion: false,
      newValue: null,
      newUnit: null,
      reason: `Incompatible units: ${trait.unit} cannot be converted to ${defaultUnit}`
    };
  }

  const newValue = convertMeasurement(trait.measurement, trait.unit, defaultUnit, baseUnits);

  return {
    needsConversion: true,
    newValue: newValue,
    newUnit: defaultUnit,
    reason: `Converting from ${trait.unit} to ${defaultUnit}`
  };
}
