/**
 * Experiment Parser Hooks
 * 
 * Frontend hooks to interact with the experiment parser system
 */

import { useState, useEffect } from 'react';

interface ParserInfo {
    type: string;
    label: string;
    description: string;
    supportedTypes: string[];
    requiredFields: string[];
    generatedTraits: Array<{
        name: string;
        unit: string;
        description: string;
    }>;
    version: string;
    hasSupport: boolean;
}

export function useExperimentParsers() {
    const [parsers, setParsers] = useState<ParserInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchParsers = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/experiment-parsers');
                const data = await response.json();
                
                if (data.success) {
                    setParsers(data.parsers);
                } else {
                    setError(data.error || 'Failed to fetch parsers');
                    setParsers([]);
                }
            } catch (err) {
                console.error('Failed to load experiment parsers:', err);
                setError('Failed to load experiment parsers');
                setParsers([]);
            } finally {
                setLoading(false);
            }
        };

        fetchParsers();
    }, []);

    const getRegisteredTypes = (): string[] => {
        return parsers.flatMap(parser => parser.supportedTypes);
    };

    const checkParserSupport = (experimentType: string): boolean => {
        return parsers.some(parser => parser.supportedTypes.includes(experimentType));
    };

    const getParserInfo = (experimentType: string): ParserInfo | null => {
        return parsers.find(parser => parser.supportedTypes.includes(experimentType)) || null;
    };

    const getParserSupportedTypes = (): Array<{value: string, label: string}> => {
        const allTypes = getRegisteredTypes();
        return Array.from(new Set(allTypes)).map(type => {
            const parser = getParserInfo(type);
            return {
                value: type,
                label: parser?.label || type.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')
            };
        });
    };

    const getUniqueParserOptions = (): Array<{value: string, label: string}> => {
        // Return unique parsers based on registered types only
        const uniqueParsers = new Map<string, {value: string, label: string}>();
        
        // Get the registered types from the registry (what's actually available)
        const registeredTypes = getRegisteredTypes();
        
        registeredTypes.forEach(type => {
            const parser = getParserInfo(type);
            if (parser) {
                uniqueParsers.set(parser.label, {
                    value: type, // Use the registered type as value
                    label: parser.label
                });
            }
        });
        
        return Array.from(uniqueParsers.values());
    };

    const getAllParserOptions = (): Array<{value: string, label: string}> => {
        // Return all individual supported types if you want granular control
        const allTypes = getRegisteredTypes();
        return Array.from(new Set(allTypes)).map(type => {
            const parser = getParserInfo(type);
            return {
                value: type,
                label: `${parser?.label} (${type.replace('_', ' ')})`
            };
        });
    };

    return {
        parsers,
        registeredTypes: getRegisteredTypes(),
        loading,
        error,
        checkParserSupport,
        getParserInfo,
        getParserSupportedTypes,
        getUniqueParserOptions,
        getAllParserOptions
    };
}

export function useParserValidation() {
    const { parsers } = useExperimentParsers();

    const checkParserSupport = (experimentType: string): boolean => {
        return parsers.some(parser => parser.supportedTypes.includes(experimentType));
    };

    const validateExperimentType = (type: string, fileData: any): {valid: boolean, message?: string} => {
        const parser = parsers.find(p => p.supportedTypes.includes(type));
        
        if (!parser) {
            return {
                valid: false,
                message: `No parser available for experiment type: ${type}`
            };
        }

        // Check required fields if specified
        if (parser.requiredFields.length > 0) {
            const requiredFieldsCheck = parser.requiredFields.every(field => {
                // Handle OR conditions in required fields (e.g., "A OR B OR C")
                if (field.includes(' OR ')) {
                    const options = field.split(' OR ').map(f => f.trim());
                    return options.some(option => fileData?.includedData?.[option]);
                } else {
                    return fileData?.includedData?.[field];
                }
            });

            if (!requiredFieldsCheck) {
                return {
                    valid: false,
                    message: `${parser.label} requires: ${parser.requiredFields.join(', ')} (available fields: ${Object.keys(fileData?.includedData || {}).join(', ')})`
                };
            }
        }

        return { valid: true };
    };

    return { validateExperimentType };
}
