import { useState } from 'react';
import { prepend_path } from '@/lib/utils';

/**
 * Custom hook for taxonomic name validation and correction
 * Provides a clean interface to the checknames API
 */
export const useTaxonomicValidation = () => {
  const [isValidating, setIsValidating] = useState(false);

  /**
   * Validate and correct a single taxonomic name
   * @param {string} taxa - The taxonomic name to validate
   * @param {string} method - 'correctName' or 'fullTaxaInfo'
   * @param {string} source - 'WSC', 'GNames', or 'auto'
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  const validateName = async (taxa, method = 'correctName', source = 'auto') => {
    if (!taxa || !taxa.trim()) {
      return { success: false, error: 'No name provided' };
    }

    setIsValidating(true);
    
    try {
      const response = await fetch(`${prepend_path}/api/checknames`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxa: taxa.trim(), method, source })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.status === 'success') {
        return { success: true, data: result.data, source: result.source };
      } else {
        return { success: false, error: result.error || 'Unknown error' };
      }
    } catch (error) {
      console.error('Taxonomic validation error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Get full taxonomic information for a scientific name
   * @param {string} taxa - The taxonomic name
   * @param {string} source - Data source preference
   * @returns {Promise<{success: boolean, data?: {family, genus, species, class, order, canonical_form}, error?: string}>}
   */
  const getFullTaxonomicInfo = async (taxa, source = 'GNames') => {
    return await validateName(taxa, 'fullTaxaInfo', source);
  };

  /**
   * Correct a taxonomic name (returns just the corrected name string)
   * @param {string} taxa - The taxonomic name to correct
   * @param {string} source - Data source preference
   * @returns {Promise<{success: boolean, correctedName?: string, error?: string}>}
   */
  const correctName = async (taxa, source = 'auto') => {
    const result = await validateName(taxa, 'correctName', source);
    if (result.success) {
      return { 
        success: true, 
        correctedName: result.data,
        source: result.source
      };
    }
    return result;
  };

  /**
   * Validate taxonomic hierarchy (family, genus, species)
   * Constructs the full name and validates it, then returns corrected parts
   * @param {Object} taxonomy - {family, genus, species}
   * @param {string} source - Data source preference
   * @returns {Promise<{success: boolean, correctedTaxonomy?: Object, fullName?: string, error?: string}>}
   */
  const validateTaxonomicHierarchy = async ({ family, genus, species }, source = 'auto') => {
    // Construct the scientific name from genus and species
    if (!genus) {
      return { success: false, error: 'Genus is required' };
    }

    const scientificName = species ? `${genus} ${species}` : genus;
    
    // Always try to include family information in the request if available
    let result;
    
    if (family) {
      // Try with family context first
      try {
        const response = await fetch(`${prepend_path}/api/checknames`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            taxa: scientificName, 
            method: 'fullTaxaInfo', 
            source,
            family: family  // Include family as additional context
          })
        });

        if (response.ok) {
          const apiResult = await response.json();
          if (apiResult.status === 'success') {
            result = { success: true, data: apiResult.data, source: apiResult.source };
          } else {
            result = { success: false, error: apiResult.error || 'Unknown error' };
          }
        } else {
          result = { success: false, error: 'API request failed' };
        }
      } catch (error) {
        console.log('Family context validation failed:', error);
        result = { success: false, error: error.message };
      }
    } else {
      // If no family, use the standard validation
      result = await getFullTaxonomicInfo(scientificName, source);
    }
    
    // If the request with family context failed, try without family as fallback
    if (!result.success && family) {
      result = await getFullTaxonomicInfo(scientificName, source);
    }
    
    if (result.success) {
      const data = result.data;
      return {
        success: true,
        correctedTaxonomy: {
          family: data.family || family,
          genus: data.genus || genus,
          species: data.species || species
        },
        fullName: data.canonical_form,
        source: result.source
      };
    }
    
    return result;
  };

  return {
    validateName,
    correctName,
    getFullTaxonomicInfo,
    validateTaxonomicHierarchy,
    isValidating
  };
};
