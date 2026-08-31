import { useState } from 'react';
import { prepend_path } from '@/lib/utils';

/**
 * Thin client for /api/checknames (Global Names verifier).
 *
 * A verified name resolves as `{ success: true, data, canonical? }`.
 * An unrecognised name is NOT an error — it resolves as
 * `{ success: false, unrecognised: true, suggestions: [...] }` so the caller
 * can warn and offer the fallbacks ("Genus sp." or the entered name).
 */
export const useTaxonomicValidation = () => {
  const [isValidating, setIsValidating] = useState(false);

  const validateName = async (taxa, method = 'correctName') => {
    if (!taxa || !taxa.trim()) {
      return { success: false, error: 'No name provided' };
    }

    setIsValidating(true);
    try {
      const response = await fetch(`${prepend_path}/api/checknames`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxa: taxa.trim(), method }),
      });
      const result = await response.json().catch(() => ({}));

      if (result.status === 'success') {
        return { success: true, data: result.data, source: result.source };
      }
      if (result.status === 'unrecognised') {
        return {
          success: false,
          unrecognised: true,
          suggestions: result.suggestions ?? [],
          error: 'Not recognised by the Global Names verifier',
        };
      }
      return { success: false, error: result.error || `Request failed (${response.status})` };
    } catch (error) {
      console.error('Taxonomic validation error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsValidating(false);
    }
  };

  const getFullTaxonomicInfo = (taxa) => validateName(taxa, 'fullTaxaInfo');

  const correctName = async (taxa) => {
    const result = await validateName(taxa, 'correctName');
    return result.success ? { success: true, correctedName: result.data, source: result.source } : result;
  };

  /**
   * Verify family/genus/species together. Builds "Genus species" (or "Genus"),
   * verifies it, and returns the corrected parts. An unrecognised name comes
   * back with `unrecognised: true` and `suggestions`.
   */
  const validateTaxonomicHierarchy = async ({ family, genus, species }) => {
    if (!genus) {
      return { success: false, error: 'Genus is required' };
    }
    const scientificName = species ? `${genus} ${species}` : genus;
    const result = await getFullTaxonomicInfo(scientificName);

    if (!result.success) {
      return result; // carries `unrecognised` / `suggestions` when relevant
    }

    const info = result.data;
    return {
      success: true,
      correctedTaxonomy: {
        family: info.family || family,
        genus: info.genus || genus,
        species: info.species || species,
      },
      fullName: info.canonical_form,
      source: result.source,
    };
  };

  return {
    validateName,
    correctName,
    getFullTaxonomicInfo,
    validateTaxonomicHierarchy,
    isValidating,
  };
};
