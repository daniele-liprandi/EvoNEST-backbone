import React, { useCallback, useEffect, useState } from 'react';
import { TaxonomicInput } from './TaxonomicInput';
import { useTaxonomicValidation } from '@/hooks/useTaxonomicValidation';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

/**
 * Component for managing taxonomic hierarchy (family, genus, species)
 * Validates the complete taxonomy when all three fields are filled
 * @param {Object} props
 * @param {Object} props.values - Current values {family, genus, species}
 * @param {Function} props.onChange - Called when any field changes
 * @param {Function} props.onValidated - Called when taxonomy is validated with corrected values
 * @param {string} props.source - Data source preference
 * @param {boolean} props.autoCorrect - Whether to auto-correct fields
 * @param {boolean} props.disabled - Whether inputs are disabled
 * @param {Object} props.fieldProps - Additional props for individual fields
 */
export const TaxonomicHierarchy = ({
  values = { family: '', genus: '', species: '' },
  onChange,
  onValidated,
  source = 'auto',
  autoCorrect = true,
  disabled = false,
  fieldProps = {},
  ...props
}) => {
  const [lastValidated, setLastValidated] = useState(null);
  const [validationStatus, setValidationStatus] = useState(null);
  const [validationSource, setValidationSource] = useState(null);
  
  const { validateTaxonomicHierarchy, isValidating } = useTaxonomicValidation();

  // Check if all three fields are filled
  const allFieldsFilled = values.family?.trim() && values.genus?.trim() && values.species?.trim();
  const minFieldsFilled = values.genus?.trim() && values.species?.trim();
  
  // Create a string representation for comparison
  const currentValues = `${values.family?.trim()}-${values.genus?.trim()}-${values.species?.trim()}`;

  const validateHierarchy = useCallback(async () => {
    if (!minFieldsFilled) {
      setValidationStatus(null);
      setLastValidated(null);
      return;
    }

    // Don't validate if nothing has changed
    if (currentValues === lastValidated) {
      return;
    }

    setValidationStatus('validating');
    
    try {
      const result = await validateTaxonomicHierarchy(values, source);
      
      if (result.success) {
        setValidationStatus('valid');
        setValidationSource(result.source);
        setLastValidated(currentValues);
        
        const corrected = result.correctedTaxonomy;
        
        // Check if any corrections were made
        const hasCorrections = 
          corrected.family !== values.family ||
          corrected.genus !== values.genus ||
          corrected.species !== values.species;

        if (hasCorrections && autoCorrect) {
          toast.success(`Taxonomy corrected: ${result.fullName}`);
          onChange?.(corrected);
          onValidated?.(corrected, result.source, result.fullName);
        } else {
          toast.success(`Taxonomy validated: ${result.fullName}`);
          onValidated?.(corrected, result.source, result.fullName);
        }
      } else {
        setValidationStatus('invalid');
        setValidationSource(null);
        toast.warning(`Could not validate taxonomy: ${result.error}`);
      }
    } catch (error) {
      setValidationStatus('invalid');
      setValidationSource(null);
      toast.error('Failed to validate taxonomy');
      console.error('Taxonomy validation error:', error);
    }
  }, [values, minFieldsFilled, currentValues, lastValidated, validateTaxonomicHierarchy, source, autoCorrect, onChange, onValidated]);

  // Manual validation trigger (ignores the lastValidated check)
  const handleManualValidation = useCallback(async () => {
    if (!minFieldsFilled) {
      toast.warning('Please fill all three fields (family, genus, species) before validating');
      return;
    }

    setValidationStatus('validating');
    
    try {
      const result = await validateTaxonomicHierarchy(values, source);
      
      if (result.success) {
        setValidationStatus('valid');
        setValidationSource(result.source);
        setLastValidated(currentValues);
        
        const corrected = result.correctedTaxonomy;
        
        // Check if any corrections were made
        const hasCorrections = 
          corrected.family !== values.family ||
          corrected.genus !== values.genus ||
          corrected.species !== values.species;

        if (hasCorrections && autoCorrect) {
          toast.success(`Taxonomy corrected: ${result.fullName}`);
          onChange?.(corrected);
          onValidated?.(corrected, result.source, result.fullName);
        } else {
          toast.success(`Taxonomy validated: ${result.fullName}`);
          onValidated?.(corrected, result.source, result.fullName);
        }
      } else {
        setValidationStatus('invalid');
        setValidationSource(null);
        toast.warning(`Could not validate taxonomy: ${result.error}`);
      }
    } catch (error) {
      setValidationStatus('invalid');
      setValidationSource(null);
      toast.error('Failed to validate taxonomy');
      console.error('Taxonomy validation error:', error);
    }
  }, [values, minFieldsFilled, currentValues, validateTaxonomicHierarchy, source, autoCorrect, onChange, onValidated]);

  // Validate when all fields are filled and user focuses out
  const handleFieldBlur = useCallback((fieldName) => {
    // Small delay to allow for rapid field changes
    setTimeout(() => {
      if (minFieldsFilled) {
        validateHierarchy();
      }
    }, 100);
  }, [validateHierarchy, minFieldsFilled]);

  const handleFieldChange = useCallback((fieldName, value) => {
    const newValues = { ...values, [fieldName]: value };
    onChange?.(newValues);
    
    // Reset validation status when any field changes
    if (validationStatus) {
      setValidationStatus(null);
      setValidationSource(null);
    }
  }, [values, onChange, validationStatus]);

  const getStatusBadge = () => {
    if (!minFieldsFilled) return null;
    
    if (isValidating || validationStatus === 'validating') {
      return <Badge variant="secondary" className="text-xs">Validating...</Badge>;
    }
    if (validationStatus === 'valid') {
      return (
        <Badge variant="default" className="text-xs bg-green-100 text-green-800">
          Validated {validationSource && `via ${validationSource}`}
        </Badge>
      );
    }
    if (validationStatus === 'invalid') {
      return <Badge variant="destructive" className="text-xs">Validation failed</Badge>;
    }
    
    return null;
  };

  return (
    <div className="space-y-4" {...props}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Taxonomic Classification</Label>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {minFieldsFilled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleManualValidation}
              disabled={isValidating}
              className="h-6 px-2"
            >
              <RefreshCw className={`h-3 w-3 ${isValidating ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="family" className="text-xs text-muted-foreground">Family</Label>
          <TaxonomicInput
            name="family"
            value={values.family}
            placeholder="Enter family name"
            onChange={(e) => handleFieldChange('family', e.target.value)}
            onBlur={() => handleFieldBlur('family')}
            autoCorrect={false} // Don't auto-correct individual fields
            disabled={disabled}
            {...fieldProps.family}
          />
        </div>
        <div>

        </div>
        
        <div className="space-y-2">
          <Label htmlFor="genus" className="text-xs text-muted-foreground">Genus</Label>
          <TaxonomicInput
            name="genus"
            value={values.genus}
            placeholder="Enter genus name"
            onChange={(e) => handleFieldChange('genus', e.target.value)}
            onBlur={() => handleFieldBlur('genus')}
            autoCorrect={false} // Don't auto-correct individual fields
            disabled={disabled}
            {...fieldProps.genus}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="species" className="text-xs text-muted-foreground">Species</Label>
          <TaxonomicInput
            name="species"
            value={values.species}
            placeholder="Enter species name"
            onChange={(e) => handleFieldChange('species', e.target.value)}
            onBlur={() => handleFieldBlur('species')}
            autoCorrect={false} // Don't auto-correct individual fields
            disabled={disabled}
            {...fieldProps.species}
          />
        </div>
      </div>
      
      {allFieldsFilled && (
        <div className="flex space-x-3 text-xs text-muted-foreground pt-2 border-t">
          {values.family && (
            <>
              <Separator orientation="vertical" />
              <span>Family: {values.family}</span>
            </>
          )}
          <span>Scientific name:</span>
          <span className="font-mono">{values.genus} {values.species}</span>
        </div>
      )}
    </div>
  );
};

export default TaxonomicHierarchy;
