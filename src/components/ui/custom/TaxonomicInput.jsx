import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { SearchIcon, CheckIcon, AlertCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTaxonomicValidation } from '@/hooks/useTaxonomicValidation';
import { cn } from '@/lib/utils';

/**
 * A taxonomic input field that validates and corrects names on blur
 * @param {Object} props
 * @param {string} props.value - Current field value
 * @param {Function} props.onChange - Change handler
 * @param {Function} props.onBlur - Blur handler (optional)
 * @param {Function} props.onCorrected - Called when a name is corrected with new value
 * @param {Function} props.onValidated - Called when validation is complete with full result
 * @param {string} props.placeholder - Input placeholder
 * @param {string} props.source - Data source for validation ('WSC', 'GNames', 'auto')
 * @param {boolean} props.autoCorrect - Whether to auto-correct on blur (default: true)
 * @param {string} props.validationMode - 'correctName' or 'fullTaxaInfo'
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {string} props.name - Input name attribute
 */
export const TaxonomicInput = ({
  value = '',
  onChange,
  onBlur,
  onCorrected,
  onValidated,
  placeholder = 'Enter taxonomic name',
  source = 'auto',
  autoCorrect = true,
  validationMode = 'correctName',
  className,
  disabled = false,
  name,
  ...props
}) => {
  const [validationStatus, setValidationStatus] = useState(null); // null, 'validating', 'valid', 'invalid'
  const [lastValidatedValue, setLastValidatedValue] = useState('');
  
  const { validateName, isValidating } = useTaxonomicValidation();

  const handleValidation = useCallback(async (inputValue) => {
    if (!inputValue || !inputValue.trim() || inputValue === lastValidatedValue) {
      setValidationStatus(null);
      return;
    }

    setValidationStatus('validating');
    
    try {
      const result = await validateName(inputValue.trim(), validationMode, source);
      
      if (result.success) {
        const correctedValue = validationMode === 'correctName' ? result.data : result.data.canonical_form;
        
        setValidationStatus('valid');
        setLastValidatedValue(correctedValue);
        
        // Call onValidated callback with full result for fullTaxaInfo mode
        if (validationMode === 'fullTaxaInfo') {
          onValidated?.(result);
        }
        
        // If the name was corrected and auto-correction is enabled
        if (autoCorrect && correctedValue !== inputValue.trim()) {
          toast.success(`Name corrected to: ${correctedValue}`);
          
          // Update the field value
          const syntheticEvent = {
            target: { value: correctedValue, name }
          };
          onChange?.(syntheticEvent);
          onCorrected?.(correctedValue, result.source);
        } else if (correctedValue === inputValue.trim()) {
          toast.success('Name validated successfully');
        }
      } else {
        setValidationStatus('invalid');
        toast.error(`Validation failed: ${result.error}`);
      }
    } catch (error) {
      setValidationStatus('invalid');
      toast.error('Failed to validate name');
      console.error('Validation error:', error);
    }
  }, [validateName, validationMode, source, autoCorrect, onChange, onCorrected, name, lastValidatedValue]);

  const handleBlur = useCallback(async (e) => {
    const inputValue = e.target.value;
    
    if (autoCorrect && inputValue && inputValue.trim()) {
      await handleValidation(inputValue);
    }
    
    onBlur?.(e);
  }, [handleValidation, autoCorrect, onBlur]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && autoCorrect) {
      e.preventDefault();
      handleValidation(value);
    }
  }, [handleValidation, autoCorrect, value]);

  const getStatusIcon = () => {
    if (isValidating || validationStatus === 'validating') {
      return <SearchIcon className="h-4 w-4 text-blue-500 animate-spin" />;
    }
    if (validationStatus === 'valid') {
      return <CheckIcon className="h-4 w-4 text-green-500" />;
    }
    if (validationStatus === 'invalid') {
      return <AlertCircleIcon className="h-4 w-4 text-red-500" />;
    }
    return <SearchIcon className="h-4 w-4 text-gray-400" />;
  };

  const getInputClassName = () => {
    const baseClasses = 'pr-8';
    
    if (validationStatus === 'valid') {
      return cn(baseClasses, 'border-green-300 focus:border-green-500', className);
    }
    if (validationStatus === 'invalid') {
      return cn(baseClasses, 'border-red-300 focus:border-red-500', className);
    }
    if (validationStatus === 'validating') {
      return cn(baseClasses, 'border-blue-300 focus:border-blue-500', className);
    }
    
    return cn(baseClasses, className);
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
        className={getInputClassName()}
        disabled={disabled || isValidating}
        name={name}
        {...props}
      />
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
        {getStatusIcon()}
      </div>
    </div>
  );
};

export default TaxonomicInput;
