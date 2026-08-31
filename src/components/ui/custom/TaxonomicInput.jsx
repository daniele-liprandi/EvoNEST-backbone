import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { SearchIcon, CheckIcon, AlertCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTaxonomicValidation } from '@/hooks/useTaxonomicValidation';
import { cn } from '@/lib/utils';

/**
 * A taxonomic input that verifies the name against GNames on blur / Enter.
 *
 * An unrecognised name is not treated as an error: the field shows a neutral
 * warning state and a toast offering the fallbacks ("Genus sp." or the entered
 * name). Nothing is rejected. `onCorrected(correctedValue, source)` fires on a
 * correction; `onValidated(result)` fires in `fullTaxaInfo` mode.
 */
export const TaxonomicInput = ({
  value = '',
  onChange,
  onBlur,
  onCorrected,
  onValidated,
  placeholder = 'Enter taxonomic name',
  autoCorrect = true,
  validationMode = 'correctName',
  className,
  disabled = false,
  name,
  ...props
}) => {
  const [status, setStatus] = useState(null); // null | 'validating' | 'valid' | 'unrecognised' | 'error'
  const [lastValidatedValue, setLastValidatedValue] = useState('');

  const { validateName, isValidating } = useTaxonomicValidation();

  const handleValidation = useCallback(async (inputValue) => {
    const trimmed = (inputValue ?? '').trim();
    if (!trimmed || trimmed === lastValidatedValue) {
      setStatus(null);
      return;
    }

    setStatus('validating');
    const result = await validateName(trimmed, validationMode);

    if (result.success) {
      const corrected = validationMode === 'correctName' ? result.data : result.data.canonical_form;
      setStatus('valid');
      setLastValidatedValue(corrected);

      if (validationMode === 'fullTaxaInfo') onValidated?.(result);

      if (autoCorrect && corrected !== trimmed) {
        toast.success(`Name corrected to: ${corrected}`);
        onChange?.({ target: { value: corrected, name } });
        onCorrected?.(corrected, result.source);
      } else if (corrected === trimmed) {
        toast.success('Name verified');
      }
      return;
    }

    if (result.unrecognised) {
      setStatus('unrecognised');
      const options = (result.suggestions ?? []).join('  ·  ');
      toast.warning(
        options
          ? `"${trimmed}" is not in the Global Names verifier. You can use: ${options}`
          : `"${trimmed}" is not in the Global Names verifier.`,
      );
      return;
    }

    setStatus('error');
    toast.error(result.error || 'Could not verify the name');
  }, [validateName, validationMode, autoCorrect, onChange, onCorrected, onValidated, name, lastValidatedValue]);

  const handleBlur = useCallback(async (e) => {
    if (autoCorrect && e.target.value?.trim()) {
      await handleValidation(e.target.value);
    }
    onBlur?.(e);
  }, [handleValidation, autoCorrect, onBlur]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && autoCorrect) {
      e.preventDefault();
      handleValidation(value);
    }
  }, [handleValidation, autoCorrect, value]);

  const statusIcon = () => {
    if (isValidating || status === 'validating') {
      return <SearchIcon className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    if (status === 'valid') return <CheckIcon className="h-4 w-4 text-primary" />;
    if (status === 'unrecognised') return <AlertCircleIcon className="h-4 w-4 text-amber-500" />;
    if (status === 'error') return <AlertCircleIcon className="h-4 w-4 text-destructive" />;
    return <SearchIcon className="h-4 w-4 text-muted-foreground/60" />;
  };

  const borderClass = () => {
    if (status === 'valid') return 'border-primary/50 focus-visible:border-primary';
    if (status === 'unrecognised') return 'border-amber-500/50 focus-visible:border-amber-500';
    if (status === 'error') return 'border-destructive/50 focus-visible:border-destructive';
    return '';
  };

  return (
    <div className="relative">
      <Input
        type="text"
        value={value}
        onChange={onChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn('pr-8', borderClass(), className)}
        disabled={disabled || isValidating}
        name={name}
        {...props}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2">{statusIcon()}</div>
    </div>
  );
};

export default TaxonomicInput;
