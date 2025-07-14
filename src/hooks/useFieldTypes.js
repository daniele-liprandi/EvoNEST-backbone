// hooks/useFieldTypes.js

import { useState, useEffect } from 'react';

export const useFieldTypes = () => {
    const [standardFields, setStandardFields] = useState([]);
    const [fieldTypes, setFieldTypes] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSchema = async () => {
            try {
                const response = await fetch('/api/samples', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ method: 'get-schema' })
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch schema');
                }

                const schema = await response.json();
                
                // Convert MongoDB types to JavaScript types
                const typeMapping = {
                    'string': 'string',
                    'double': 'number',
                    'int': 'number',
                    'bool': 'boolean',
                    'date': 'date',
                    'objectId': 'string',
                    'array': 'array'
                };

                // Create field types mapping
                const types = {};
                Object.entries(schema).forEach(([field, type]) => {
                    types[field] = typeMapping[type] || 'string';
                });

                setFieldTypes(types);
                setStandardFields(Object.keys(schema));
                setIsLoading(false);
            } catch (err) {
                setError(err);
                setIsLoading(false);
            }
        };

        fetchSchema();
    }, []);

    return { standardFields, fieldTypes, isLoading, error };
};