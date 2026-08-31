import React, { useCallback, useState } from 'react';
import { TaxonomicInput } from './TaxonomicInput';
import { useTaxonomicValidation } from '@/hooks/useTaxonomicValidation';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

/**
 * Family / genus / species, verified together against GNames when genus and
 * species are filled. An unrecognised name warns and leaves the fields as
 * entered — it is never rejected. `onValidated(correctedTaxonomy, source,
 * fullName)` fires on a successful check.
 */
export const TaxonomicHierarchy = ({
  values = { family: '', genus: '', species: '' },
  onChange,
  onValidated,
  autoCorrect = true,
  disabled = false,
  fieldProps = {},
  ...props
}) => {
  const [status, setStatus] = useState(null); // null | 'validating' | 'valid' | 'unrecognised' | 'error'
  const [lastValidated, setLastValidated] = useState(null);

  const { validateTaxonomicHierarchy, isValidating } = useTaxonomicValidation();

  const minFieldsFilled = values.genus?.trim() && values.species?.trim();
  const allFieldsFilled = minFieldsFilled && values.family?.trim();
  const currentValues = `${values.family?.trim()}-${values.genus?.trim()}-${values.species?.trim()}`;

  const runValidation = useCallback(async ({ force = false } = {}) => {
    if (!minFieldsFilled) {
      if (force) toast.warning('Fill in genus and species before verifying');
      setStatus(null);
      setLastValidated(null);
      return;
    }
    if (!force && currentValues === lastValidated) return;

    setStatus('validating');
    const result = await validateTaxonomicHierarchy(values);

    if (result.success) {
      setStatus('valid');
      setLastValidated(currentValues);
      const corrected = result.correctedTaxonomy;
      const changed =
        corrected.family !== values.family ||
        corrected.genus !== values.genus ||
        corrected.species !== values.species;
      toast.success(changed ? `Taxonomy corrected: ${result.fullName}` : `Taxonomy verified: ${result.fullName}`);
      if (changed && autoCorrect) onChange?.(corrected);
      onValidated?.(corrected, result.source, result.fullName);
      return;
    }

    if (result.unrecognised) {
      setStatus('unrecognised');
      setLastValidated(currentValues);
      const options = (result.suggestions ?? []).join('  ·  ');
      toast.warning(
        options
          ? `Not in the Global Names verifier. You can use: ${options}`
          : 'Not in the Global Names verifier.',
      );
      return;
    }

    setStatus('error');
    toast.error(result.error || 'Could not verify the taxonomy');
  }, [values, minFieldsFilled, currentValues, lastValidated, validateTaxonomicHierarchy, autoCorrect, onChange, onValidated]);

  const handleFieldChange = (field, value) => {
    onChange?.({ ...values, [field]: value });
    if (status) setStatus(null);
  };

  const handleFieldBlur = () => {
    setTimeout(() => { if (minFieldsFilled) runValidation(); }, 100);
  };

  const statusBadge = () => {
    if (!minFieldsFilled) return null;
    if (isValidating || status === 'validating') return <Badge variant="secondary" className="text-xs">Verifying…</Badge>;
    if (status === 'valid') return <Badge className="text-xs">Verified</Badge>;
    if (status === 'unrecognised') return <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Not recognised</Badge>;
    if (status === 'error') return <Badge variant="destructive" className="text-xs">Check failed</Badge>;
    return null;
  };

  return (
    <div className="space-y-4" {...props}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Taxonomic classification</Label>
        <div className="flex items-center gap-2">
          {statusBadge()}
          {minFieldsFilled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => runValidation({ force: true })}
              disabled={isValidating}
              className="h-6 px-2"
            >
              <RefreshCw className={`h-3 w-3 ${isValidating ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="family" className="text-xs text-muted-foreground">Family</Label>
          <TaxonomicInput
            name="family"
            value={values.family}
            placeholder="Enter family name"
            onChange={(e) => handleFieldChange('family', e.target.value)}
            onBlur={handleFieldBlur}
            autoCorrect={false}
            disabled={disabled}
            {...fieldProps.family}
          />
        </div>
        <div />
        <div className="space-y-2">
          <Label htmlFor="genus" className="text-xs text-muted-foreground">Genus</Label>
          <TaxonomicInput
            name="genus"
            value={values.genus}
            placeholder="Enter genus name"
            onChange={(e) => handleFieldChange('genus', e.target.value)}
            onBlur={handleFieldBlur}
            autoCorrect={false}
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
            onBlur={handleFieldBlur}
            autoCorrect={false}
            disabled={disabled}
            {...fieldProps.species}
          />
        </div>
      </div>

      {allFieldsFilled && (
        <div className="flex space-x-3 border-t pt-2 text-xs text-muted-foreground">
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
