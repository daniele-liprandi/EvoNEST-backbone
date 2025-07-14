"use client"

/**
 * Sample Import Page
 * 
 * Features:
 * - CSV file upload and parsing
 * - Automatic field mapping with fuzzy matching
 * - Special field mappings (e.g., nomenclature → genus + species)
 * - Data validation and error reporting
 * - Batch import with progress tracking
 * 
 * Special Mappings:
 * - Nomenclature: Parses "Genus species" format into separate genus and species fields
 *   Supports formats like "Homo sapiens", "Quercus robur subsp. pedunculiflora"
 *   Handles common prefixes like "cf.", "aff.", "sp.", "spp."
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertTriangle, Check, X, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { DataTable } from "@/components/tables/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useFieldTypes } from "@/hooks/useFieldTypes";
import { useUserData } from "@/hooks/useUserData";
import { getUserIdByName } from "@/hooks/userHooks";
import { prepend_path } from "@/lib/utils";

const REQUIRED_FIELDS = ['family', 'genus', 'species', 'type', 'responsible'];

// Special mapping options for combined fields
const SPECIAL_MAPPINGS = {
    'nomenclature': {
        label: 'Nomenclature (Genus Species)',
        description: 'Split into genus and species',
        targetFields: ['genus', 'species'],
        parser: (value) => {
            if (!value || typeof value !== 'string') return {};
            const trimmed = value.trim();
            
            // Remove common prefixes/suffixes that might interfere
            const cleaned = trimmed.replace(/^(cf\.|aff\.|sp\.|spp\.)?\s*/i, '').trim();
            
            const parts = cleaned.split(/\s+/);
            if (parts.length >= 2) {
                return {
                    genus: parts[0],
                    species: parts.slice(1).join(' ') // Handle subspecies or multiple words
                };
            } else if (parts.length === 1 && parts[0]) {
                return {
                    genus: parts[0],
                    species: '' // Genus only
                };
            }
            return {};
        },
        // Validation function for nomenclature format
        validate: (value) => {
            if (!value) return { valid: true };
            const trimmed = value.trim();
            // Basic validation: should have at least one word, genus should start with capital
            const parts = trimmed.split(/\s+/);
            if (parts.length === 0) return { valid: false, error: 'Empty nomenclature' };
            if (parts[0] && !parts[0].match(/^[A-Z][a-z]+$/)) {
                return { valid: false, error: 'Genus should start with capital letter and contain only letters' };
            }
            return { valid: true };
        }
    },
    // Add more special mappings as needed
    'family': {
        label: 'Family',
        description: 'Family of the sample',
        targetFields: ['family'],
        parser: (value) => {
            return { family: value ? value.trim() : '' };
        },
        validate: (value) => {
            if (!value) return { valid: true };
            const trimmed = value.trim();
            if (trimmed.length === 0) return { valid: false, error: 'Family cannot be empty' };
            return { valid: true };
        }
    },
    'type': {
        label: 'Type',
        description: 'Type of the sample (e.g., specimen, observation)',
        targetFields: ['type'],
        parser: (value) => {
            return { type: value ? value.trim() : '' };
        },
        validate: (value) => {
            if (!value) return { valid: true };
            const trimmed = value.trim();
            if (trimmed.length === 0) return { valid: false, error: 'Type cannot be empty' };
            return { valid: true };
        }
    },
    'responsible': {
        label: 'Responsible Person (Name/Email/ID)',
        description: 'Person responsible for the sample - accepts name, email, or user ID',
        targetFields: ['responsible'],
        parser: (value, users) => {
            if (!value) return { responsible: '' };
            
            const trimmed = value.trim();
            
            // If users data is not available, return the original value
            if (!users || !Array.isArray(users)) {
                return { responsible: trimmed };
            }
            
            // Try to find user by exact name match first
            let user = users.find(u => u.name === trimmed);
            
            // If not found by name, try by email
            if (!user) {
                user = users.find(u => u.email === trimmed);
            }
            
            // If not found, try by _id (in case it's already an ID)
            if (!user) {
                user = users.find(u => u._id === trimmed);
            }
            
            // If still not found, try partial matches for name (case insensitive)
            if (!user) {
                user = users.find(u => 
                    u.name && u.name.toLowerCase().includes(trimmed.toLowerCase())
                );
            }
            
            return {
                responsible: user ? user._id : trimmed // Return user ID if found, otherwise original value
            };
        },
        validate: (value, users) => {
            if (!value) return { valid: true };
            
            const trimmed = value.trim();
            if (trimmed.length === 0) return { valid: false, error: 'Responsible cannot be empty' };
            
            // If users data is not available, we can't validate but don't block
            if (!users || !Array.isArray(users)) {
                return { valid: true }; // Allow import to proceed
            }
            
            // Check if user exists by name, email, or ID
            const user = users.find(u => 
                u.name === trimmed || 
                u.email === trimmed ||
                u._id === trimmed ||
                (u.name && u.name.toLowerCase().includes(trimmed.toLowerCase()))
            );
            
            if (!user) {
                return { 
                    valid: false, 
                    error: `User "${trimmed}" not found. Please check name, email, or user ID.` 
                };
            }
            
            return { valid: true };
        }
    },
    'animal_id': {
        label: 'Animal ID (Specimen Identifier)',
        description: 'Unique identifier for the animal/specimen - used for hierarchical import',
        targetFields: ['name'], // Maps to the "name" field which is the specimen identifier
        parser: (value) => {
            return { name: value ? value.trim() : '' };
        },
        validate: (value) => {
            if (!value) return { valid: true };
            const trimmed = value.trim();
            if (trimmed.length === 0) return { valid: false, error: 'Animal ID cannot be empty' };
            return { valid: true };
        },
        isHierarchical: true, // Flag to indicate this is used for hierarchical imports
        level: 'parent' // This creates parent records
    },
    'subsample_id': {
        label: 'Subsample ID (Sample Identifier)',
        description: 'Unique identifier for individual subsamples - used for hierarchical import',
        targetFields: ['name'], // Maps to the "name" field
        parser: (value) => {
            return { name: value ? value.trim() : '' };
        },
        validate: (value) => {
            if (!value) return { valid: true };
            const trimmed = value.trim();
            if (trimmed.length === 0) return { valid: false, error: 'Subsample ID cannot be empty' };
            return { valid: true };
        },
        isHierarchical: true, // Flag to indicate this is used for hierarchical imports
        level: 'child' // This creates child records
    }
};

const levenshteinDistance = (str1, str2) => {
    const track = Array(str2.length + 1).fill(null).map(() =>
        Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i += 1) {
        track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
        track[j][0] = j;
    }
    for (let j = 1; j <= str2.length; j += 1) {
        for (let i = 1; i <= str1.length; i += 1) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1,
                track[j - 1][i] + 1,
                track[j - 1][i - 1] + indicator
            );
        }
    }
    return track[str2.length][str1.length];
};

const getSimilarity = (str1, str2) => {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    return 1 - distance / maxLength;
};

const ImportPage = () => {
    const { standardFields, fieldTypes, isLoading: schemaLoading } = useFieldTypes();
    const { usersData, usersError, isLoading: usersLoading } = useUserData(prepend_path);
    const [data, setData] = useState([]);
    const [validationErrors, setValidationErrors] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [fieldMappings, setFieldMappings] = useState({});
    const [specialMappings, setSpecialMappings] = useState({}); // Track special field mappings
    const [cellErrors, setCellErrors] = useState({});
    const [customFields, setCustomFields] = useState(new Set());
    const [importProgress, setImportProgress] = useState(0);
    const [importStatus, setImportStatus] = useState(null);
    const [idMapping, setIdMapping] = useState({}); // Track old -> new IDs
    const [isHierarchicalImport, setIsHierarchicalImport] = useState(false); // Track if this is hierarchical import
    const [hierarchicalData, setHierarchicalData] = useState({ animals: [], subsamples: [] }); // Processed hierarchical data

    // Re-validate data whenever field mappings or special mappings change
    useEffect(() => {
        if (data.length > 0) {
            // Check if hierarchical import is being used
            const hasHierarchicalMappings = Object.values(specialMappings).some(mapping => 
                SPECIAL_MAPPINGS[mapping]?.isHierarchical
            );
            
            if (hasHierarchicalMappings) {
                setIsHierarchicalImport(true);
                processHierarchicalData(data, fieldMappings, specialMappings);
            } else {
                setIsHierarchicalImport(false);
                setHierarchicalData({ animals: [], subsamples: [] });
            }
            
            const errors = validateData(data, fieldMappings, specialMappings);
            setValidationErrors(errors);
        }
    }, [fieldMappings, specialMappings, data, customFields]);

    const getFuzzyMatches = useCallback((csvField) => {
        const matches = standardFields.map(stdField => ({
            field: stdField,
            similarity: getSimilarity(csvField, stdField)
        }));

        // Also check for special mapping matches
        const specialMatches = Object.entries(SPECIAL_MAPPINGS).map(([key, config]) => ({
            field: key,
            similarity: getSimilarity(csvField, key),
            isSpecial: true,
            config
        }));

        // Check for nomenclature-like patterns in field names
        const nomenclatureKeywords = ['nomenclature', 'scientific_name', 'scientific name', 'binomial', 'taxon', 'name', "determination"];
        const nomenclatureMatch = nomenclatureKeywords.some(keyword => 
            csvField.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (nomenclatureMatch) {
            specialMatches.push({
                field: 'nomenclature',
                similarity: 0.95, // High similarity for nomenclature-like fields
                isSpecial: true,
                config: SPECIAL_MAPPINGS.nomenclature
            });
        }

        // Check for responsible-like patterns in field names
        const responsibleKeywords = ['responsible', 'person', 'researcher', 'collector', 'author', 'user'];
        const responsibleMatch = responsibleKeywords.some(keyword => 
            csvField.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (responsibleMatch) {
            specialMatches.push({
                field: 'responsible',
                similarity: 0.90, // High similarity for responsible-like fields
                isSpecial: true,
                config: SPECIAL_MAPPINGS.responsible
            });
        }

        // Combine all matches
        const allMatches = [...matches, ...specialMatches];

        // Sort by similarity and filter for good matches
        return allMatches
            .filter(match => match.similarity > 0.7) // Threshold for suggesting matches
            .sort((a, b) => b.similarity - a.similarity);
    }, [standardFields]);

    /// Update getExpectedType function
    const getExpectedType = (field) => {
        if (customFields.has(field)) return 'string';
        return fieldTypes[field] || 'string';
    };

    // Process hierarchical data - separate animals from subsamples
    const processHierarchicalData = (records, currentMappings, currentSpecialMappings) => {
        let animalIdField = null;
        let subsampleIdField = null;
        
        // Find which fields are mapped to animal_id and subsample_id
        Object.entries(currentSpecialMappings).forEach(([csvField, specialType]) => {
            if (specialType === 'animal_id') animalIdField = csvField;
            if (specialType === 'subsample_id') subsampleIdField = csvField;
        });
        
        if (!animalIdField || !subsampleIdField) {
            setHierarchicalData({ animals: [], subsamples: [] });
            return;
        }
        
        // Group records by animal ID and take first occurrence for animal data
        const animalGroups = {};
        const subsampleRecords = [];
        
        records.forEach(record => {
            const animalId = record[animalIdField];
            const subsampleId = record[subsampleIdField];
            
            if (animalId && subsampleId) {
                // Store first occurrence of each animal
                if (!animalGroups[animalId]) {
                    animalGroups[animalId] = { ...record };
                }
                
                // All records are potential subsamples
                subsampleRecords.push({
                    ...record,
                    _animalId: animalId,
                    _subsampleId: subsampleId
                });
            }
        });
        
        setHierarchicalData({
            animals: Object.values(animalGroups),
            subsamples: subsampleRecords
        });
    };

    // Validate a single value
    const validateValue = (value, expectedType) => {
        if (!value) return true; // Empty values are handled by required field validation

        switch (expectedType) {
            case 'number':
                return !isNaN(Number(value));
            case 'date':
                return !isNaN(Date.parse(value));
            case 'boolean':
                return typeof value === 'boolean' || ['true', 'false', '1', '0'].includes(value.toLowerCase());
            default:
                return true;
        }
    };

    // Column definition with validation visualization
    const columns = useMemo(() => {
        if (data.length === 0) return [];

        return Object.keys(data[0]).map(key => ({
            accessorKey: key,
            header: () => (
                <div className="flex items-center gap-2">
                    {key}
                    <Select
                        value={fieldMappings[key] || specialMappings[key] || ''}
                        onValueChange={(value) => {
                            let newFieldMappings = { ...fieldMappings };
                            let newSpecialMappings = { ...specialMappings };

                            if (value === 'custom') {
                                setCustomFields(prev => new Set([...prev, key]));
                                newFieldMappings[key] = key;
                                // Clear any special mapping
                                delete newSpecialMappings[key];
                            } else if (SPECIAL_MAPPINGS[value]) {
                                // Handle special mappings
                                newSpecialMappings[key] = value;
                                // Clear regular field mapping
                                delete newFieldMappings[key];
                            } else {
                                // Regular field mapping
                                newFieldMappings[key] = value;
                                // Clear any special mapping
                                delete newSpecialMappings[key];
                            }

                            // Update state
                            setFieldMappings(newFieldMappings);
                            setSpecialMappings(newSpecialMappings);

                            // Explicitly trigger validation
                            if (data.length > 0) {
                                const errors = validateData(data, newFieldMappings, newSpecialMappings);
                                setValidationErrors(errors);
                            }
                        }}
                    >
                        <SelectTrigger className="h-8 w-[180px]">
                            <SelectValue placeholder="Map to field..." />
                        </SelectTrigger>
                        <SelectContent>
                            {/* Standard Fields Section */}
                            {standardFields.map(field => (
                                <SelectItem
                                    key={field}
                                    value={field}
                                    className="flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{field}</span>
                                        <Badge variant="outline" className="text-xs">
                                            {fieldTypes[field]}
                                        </Badge>
                                        {REQUIRED_FIELDS.includes(field) &&
                                            <Badge variant="secondary" className="ml-2">Required</Badge>
                                        }
                                    </div>
                                </SelectItem>
                            ))}
                            
                            <Separator className="my-2" />
                            
                            {/* Special Mappings Section */}
                            {Object.entries(SPECIAL_MAPPINGS).map(([key, config]) => (
                                <SelectItem
                                    key={key}
                                    value={key}
                                    className="flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{config.label}</span>
                                        <Badge variant="outline" className="text-xs bg-blue-50">
                                            Special
                                        </Badge>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Badge variant="secondary" className="ml-2 text-xs">
                                                    → {config.targetFields.join(', ')}
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{config.description}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </SelectItem>
                            ))}
                            
                            <Separator className="my-2" />
                            {/* Custom Field Option */}
                            <SelectItem value="custom" className="flex items-center">
                                <Plus className="w-4 h-4 mr-2" />
                                Use as custom field
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            ),
            // ... rest of the column definition remains the same
        }));
    }, [data, fieldMappings, cellErrors, customFields, standardFields, fieldTypes]);


    // Parse CSV string to JSON
    const parseCSV = (csvString) => {
        const lines = csvString.split('\n');
        const headers = lines[0].split(',').map(header => header.trim());
        const jsonData = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const values = lines[i].split(',').map(value => value.trim());
            const row = {};

            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });

            jsonData.push(row);
        }

        return jsonData;
    };

    const processFile = async (file) => {
        if (!file.name.endsWith('.csv')) {
            setValidationErrors(['Please upload a CSV file']);
            return;
        }

        setIsLoading(true);
        setProgress(0);
        setValidationErrors([]); // Clear any existing validation errors

        try {
            const reader = new FileReader();

            reader.onload = async (e) => {
                setProgress(30);
                const content = e.target.result;
                const jsonData = parseCSV(content);

                setProgress(60);

                // Automatic field matching
                const initialMapping = {};
                const initialSpecialMapping = {};
                const suggestedMatches = {};

                // Get the first row's keys (CSV headers)
                if (jsonData.length > 0) {
                    Object.keys(jsonData[0]).forEach(csvField => {
                        // First try exact matches
                        if (standardFields.includes(csvField)) {
                            initialMapping[csvField] = csvField;
                        } else {
                            // Try fuzzy matching for unmatched fields
                            const fuzzyMatches = getFuzzyMatches(csvField);
                            if (fuzzyMatches.length > 0) {
                                const bestMatch = fuzzyMatches[0];
                                // Only auto-map if it's a very close match
                                if (bestMatch.similarity > 0.9) {
                                    if (bestMatch.isSpecial) {
                                        initialSpecialMapping[csvField] = bestMatch.field;
                                    } else {
                                        initialMapping[csvField] = bestMatch.field;
                                    }
                                } else {
                                    suggestedMatches[csvField] = fuzzyMatches;
                                }
                            }
                        }
                    });
                }

                setFieldMappings(initialMapping);
                setSpecialMappings(initialSpecialMapping);
                setData(jsonData);
                setProgress(90);

                // Now validate after mappings are set
                const errors = validateData(jsonData, initialMapping, initialSpecialMapping);
                setValidationErrors(errors);

                setProgress(100);
                setIsLoading(false);
            };

            reader.readAsText(file);
        } catch (error) {
            setValidationErrors([`File processing error: ${error.message}`]);
            setIsLoading(false);
        }
    };

    // Modified validateData to accept current mappings and special mappings
    const validateData = (records, currentMappings, currentSpecialMappings = {}) => {
        const errors = [];
        const cellErrorMap = {};

        // Get all fields that will be populated (regular + special mappings)
        const mappedFields = new Set(Object.values(currentMappings));
        
        // Add fields from special mappings - this is key to making special mappings
        // satisfy required field requirements (e.g., nomenclature satisfies genus + species)
        Object.entries(currentSpecialMappings).forEach(([source, specialType]) => {
            const specialConfig = SPECIAL_MAPPINGS[specialType];
            if (specialConfig) {
                specialConfig.targetFields.forEach(field => mappedFields.add(field));
            }
        });

        const missingRequired = REQUIRED_FIELDS.filter(field => !mappedFields.has(field));

        if (missingRequired.length > 0) {
            errors.push(`Missing mappings for required fields: ${missingRequired.join(', ')}`);
        }

        // Validate the data based on mappings
        records.forEach((record, rowIndex) => {
            // Validate regular field mappings
            Object.entries(currentMappings).forEach(([sourceField, targetField]) => {
                if (!customFields.has(targetField)) {
                    const value = record[sourceField];

                    // Required field validation
                    if (REQUIRED_FIELDS.includes(targetField) && !value) {
                        errors.push(`Row ${rowIndex + 1}: Missing required field ${targetField}`);
                        cellErrorMap[`${rowIndex}-${sourceField}`] = `Missing required field`;
                    }

                    // Type validation
                    const expectedType = getExpectedType(targetField);
                    if (value && !validateValue(value, expectedType)) {
                        errors.push(`Row ${rowIndex + 1}: Invalid ${targetField} value "${value}"`);
                        cellErrorMap[`${rowIndex}-${sourceField}`] = `Invalid ${expectedType} value`;
                    }
                }
            });

            // Validate special mappings
            Object.entries(currentSpecialMappings).forEach(([sourceField, specialType]) => {
                const specialConfig = SPECIAL_MAPPINGS[specialType];
                if (specialConfig) {
                    const value = record[sourceField];
                    
                    // Validate the format if a validation function exists
                    if (specialConfig.validate) {
                        const validation = specialConfig.validate(value, usersData);
                        if (!validation.valid) {
                            errors.push(`Row ${rowIndex + 1}: Invalid ${specialConfig.label} format - ${validation.error}`);
                            cellErrorMap[`${rowIndex}-${sourceField}`] = validation.error;
                        }
                    }
                    
                    // Parse the value using the special config
                    const parsedFields = specialConfig.parser(value, usersData);
                    
                    // Validate each target field
                    specialConfig.targetFields.forEach(targetField => {
                        const parsedValue = parsedFields[targetField];
                        
                        // Required field validation
                        if (REQUIRED_FIELDS.includes(targetField) && !parsedValue) {
                            errors.push(`Row ${rowIndex + 1}: Missing required field ${targetField} from ${specialConfig.label}`);
                            cellErrorMap[`${rowIndex}-${sourceField}`] = `Missing required field ${targetField}`;
                        }

                        // Type validation
                        const expectedType = getExpectedType(targetField);
                        if (parsedValue && !validateValue(parsedValue, expectedType)) {
                            errors.push(`Row ${rowIndex + 1}: Invalid ${targetField} value "${parsedValue}" from ${specialConfig.label}`);
                            cellErrorMap[`${rowIndex}-${sourceField}`] = `Invalid ${expectedType} value for ${targetField}`;
                        }
                    });
                }
            });
        });

        setCellErrors(cellErrorMap);
        return errors;
    };

    // Handle file upload
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            processFile(file);
        }
    };

    // Handle import confirmation
    const handleImport = async () => {
        setIsLoading(true);
        setImportProgress(0);
        setImportStatus('Starting import...');

        try {
            if (isHierarchicalImport) {
                await handleHierarchicalImport();
            } else {
                await handleStandardImport();
            }

            setImportProgress(100);
            setImportStatus('Import completed successfully');

            // Clear data after successful import
            setData([]);
            setValidationErrors([]);
            setFieldMappings({});
            setSpecialMappings({});
            setCellErrors({});
            setCustomFields(new Set());
            setIdMapping({});
            setHierarchicalData({ animals: [], subsamples: [] });
        } catch (error) {
            setValidationErrors([`Import error: ${error.message}`]);
            setImportStatus(`Import failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle hierarchical import (animals first, then subsamples)
    const handleHierarchicalImport = async () => {
        const animalIdMapping = {};
        
        // Phase 1: Import animals
        setImportStatus('Phase 1: Importing animals...');
        for (let i = 0; i < hierarchicalData.animals.length; i++) {
            const animalRecord = hierarchicalData.animals[i];
            setImportProgress((i / (hierarchicalData.animals.length + hierarchicalData.subsamples.length)) * 50);
            
            const transformedAnimal = transformRecord(animalRecord, true); // true = isAnimal
            
            // Check if animal already exists
            const existingAnimal = await checkAnimalExists(transformedAnimal.name);
            
            if (existingAnimal) {
                // Animal exists, use existing ID
                animalIdMapping[transformedAnimal.name] = existingAnimal._id;
                setImportStatus(`Animal "${transformedAnimal.name}" already exists, using existing record`);
            } else {
                // Create new animal - ensure type is set to "animal"
                const animalData = { 
                    ...transformedAnimal, 
                    type: 'animal',  // Override any type from CSV data
                    method: 'create' 
                };
                
                const response = await fetch('/api/samples', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(animalData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(`Failed to import animal "${transformedAnimal.name}": ${error.message}`);
                }

                const result = await response.json();
                animalIdMapping[transformedAnimal.name] = result._id;
            }
        }

        // Phase 2: Import subsamples
        setImportStatus('Phase 2: Importing subsamples...');
        for (let i = 0; i < hierarchicalData.subsamples.length; i++) {
            const subsampleRecord = hierarchicalData.subsamples[i];
            setImportProgress(50 + ((i / hierarchicalData.subsamples.length) * 50));
            
            const transformedSubsample = transformRecord(subsampleRecord, false); // false = isSubsample
            
            // Set parent ID from animal mapping
            const animalId = subsampleRecord._animalId;
            if (animalIdMapping[animalId]) {
                transformedSubsample.parentId = animalIdMapping[animalId];
            } else {
                throw new Error(`Parent animal "${animalId}" not found for subsample "${transformedSubsample.name}"`);
            }

            const response = await fetch('/api/samples', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...transformedSubsample, method: 'create' })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Failed to import subsample "${transformedSubsample.name}": ${error.message}`);
            }
        }
    };

    // Handle standard import (existing logic)
    const handleStandardImport = async () => {
        // Transform data according to field mappings
        const transformedData = data.map(record => transformRecord(record));

        // Sort data so parents are processed first
        const sortedData = [...transformedData].sort((a, b) => {
            // If an item has no parentId, it should come first
            if (!a.parentId && b.parentId) return -1;
            if (a.parentId && !b.parentId) return 1;
            return 0;
        });

        // Process records sequentially
        for (let i = 0; i < sortedData.length; i++) {
            const record = sortedData[i];
            setImportProgress((i / sortedData.length) * 100);
            setImportStatus(`Importing record ${i + 1} of ${sortedData.length}`);

            // Update parentId if needed
            if (record.parentId && idMapping[record.parentId]) {
                record.parentId = idMapping[record.parentId];
            }

            // Remove originalId from the record before sending
            const { originalId, ...recordToSend } = record;

            const response = await fetch('/api/samples', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...recordToSend, method: 'create' })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Failed to import record ${i + 1}: ${error.message}`);
            }

            const result = await response.json();

            // Store the mapping between original and new ID
            if (originalId && result._id) {
                setIdMapping(prev => ({ ...prev, [originalId]: result._id }));
            }

            // Optional: Add a small delay to prevent overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    };

    // Transform a record according to field mappings
    const transformRecord = (record, isAnimal = null) => {
        const transformed = {};
        
        // Process regular field mappings
        Object.entries(fieldMappings).forEach(([source, target]) => {
            if (target) {
                transformed[target] = record[source];
            }
        });
        
        // Process special mappings
        Object.entries(specialMappings).forEach(([source, specialType]) => {
            const specialConfig = SPECIAL_MAPPINGS[specialType];
            if (specialConfig) {
                const value = record[source];
                const parsedFields = specialConfig.parser(value, usersData);
                
                // For hierarchical imports, only apply relevant mappings
                if (isHierarchicalImport) {
                    if (isAnimal && specialConfig.level === 'child') return; // Skip child mappings for animals
                    if (isAnimal === false && specialConfig.level === 'parent') return; // Skip parent mappings for subsamples
                }
                
                // Add parsed fields to transformed data
                Object.entries(parsedFields).forEach(([fieldName, fieldValue]) => {
                    if (fieldValue) { // Only add non-empty values
                        transformed[fieldName] = fieldValue;
                    }
                });
            }
        });
        
        // Keep original ID for reference
        transformed.originalId = record.id || record._id;
        return transformed;
    };

    // Check if an animal already exists by name
    const checkAnimalExists = async (animalName) => {
        try {
            const response = await fetch('/api/sample', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: animalName,
                    type: 'animal'
                })
            });
            
            if (response.status === 404) {
                return null; // Animal not found
            }
            if (!response.ok) {
                console.error('Error checking animal existence:', response.status, response.statusText);
                return null;
            }
            
            const sample = await response.json();
            return sample; // Return the matching animal
        } catch (error) {
            console.error('Error checking animal existence:', error);
            return null;
        }
    };

    return (
        <TooltipProvider>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Import Samples</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* File Upload */}
                        <div className="flex items-center gap-4">
                            <Button variant="outline" className="relative">
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    disabled={isLoading}
                                />
                                <Upload className="w-4 h-4 mr-2" />
                                Select CSV File
                            </Button>
                            {isLoading && <Progress value={progress} className="w-[200px]" />}
                        </div>

                        {/* Field Mapping Summary */}
                        {(Object.keys(fieldMappings).length > 0 || Object.keys(specialMappings).length > 0) && (
                            <div className="space-y-2">
                                {/* Hierarchical Import Status */}
                                {isHierarchicalImport && (
                                    <Alert>
                                        <Check className="w-4 h-4" />
                                        <AlertDescription>
                                            <strong>Hierarchical Import Mode Detected</strong>
                                            <br />
                                            Will import {hierarchicalData.animals.length} animals first, then {hierarchicalData.subsamples.length} subsamples.
                                        </AlertDescription>
                                    </Alert>
                                )}
                                
                                <div className="flex flex-wrap gap-2">
                                {/* Regular mappings */}
                                {Object.entries(fieldMappings).map(([source, target]) => (
                                    target && (
                                        <Badge key={source} variant="secondary" className="flex items-center gap-2">
                                            {source} → {target}
                                            <X
                                                className="w-3 h-3 cursor-pointer"
                                                onClick={() => {
                                                    setFieldMappings(prev => {
                                                        const { [source]: _, ...rest } = prev;
                                                        return rest;
                                                    });
                                                    // Re-validate after removal
                                                    setTimeout(() => {
                                                        if (data.length > 0) {
                                                            const newMappings = { ...fieldMappings };
                                                            delete newMappings[source];
                                                            const errors = validateData(data, newMappings, specialMappings);
                                                            setValidationErrors(errors);
                                                        }
                                                    }, 0);
                                                }}
                                            />
                                        </Badge>
                                    )
                                ))}
                            </div>

                                
                                {/* Special mappings */}
                                {Object.entries(specialMappings).map(([source, specialType]) => {
                                    const config = SPECIAL_MAPPINGS[specialType];
                                    const satisfiesRequired = config && config.targetFields.some(field => REQUIRED_FIELDS.includes(field));
                                    return config && (
                                        <Badge key={source} variant="outline" className="flex items-center gap-2 bg-blue-50">
                                            {source} → {config.targetFields.join(', ')}
                                            {satisfiesRequired && (
                                                <Badge variant="secondary" className="ml-1 text-xs">
                                                    Required
                                                </Badge>
                                            )}
                                            <X
                                                className="w-3 h-3 cursor-pointer"
                                                onClick={() => {
                                                    setSpecialMappings(prev => {
                                                        const { [source]: _, ...rest } = prev;
                                                        return rest;
                                                    });
                                                    // Re-validate after removal
                                                    setTimeout(() => {
                                                        if (data.length > 0) {
                                                            const newSpecialMappings = { ...specialMappings };
                                                            delete newSpecialMappings[source];
                                                            const errors = validateData(data, fieldMappings, newSpecialMappings);
                                                            setValidationErrors(errors);
                                                        }
                                                    }, 0);
                                                }}
                                            />
                                        </Badge>
                                    );
                                })}
                            </div>
                        )}

                        {/* Validation Errors */}
                        {validationErrors.length > 0 && (
                            <Alert variant="destructive">
                                <AlertTriangle className="w-4 h-4" />
                                <AlertDescription>
                                    <ul className="list-disc pl-4">
                                        {validationErrors.map((error, index) => (
                                            <li key={index}>{error}</li>
                                        ))}
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Data Preview */}
                        {data.length > 0 && columns.length > 0 && (
                            <div>
                                <DataTable
                                    columns={columns}
                                    data={data}
                                    enableDownload={false}
                                />
                            </div>
                        )}

                        {/* Import Progress */}
                        {isLoading && (
                            <div className="space-y-2">
                                <Progress value={importProgress} />
                                <div className="text-sm text-muted-foreground">
                                    {importStatus}
                                </div>
                            </div>
                        )}

                        {/* Import Button */}
                        {data.length > 0 && (
                            <Button
                                onClick={handleImport}
                                disabled={isLoading || (!Object.values(fieldMappings).some(v => v) && !Object.values(specialMappings).some(v => v))}
                                className="w-full"
                            >
                                {isLoading ? (
                                    <>
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4 mr-2" />
                                        Import {data.length} Records
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </TooltipProvider>
    );
};

export default ImportPage;