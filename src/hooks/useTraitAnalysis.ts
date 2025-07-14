import { useState, useCallback } from 'react';
import { prepend_path } from "@/lib/utils";

export interface AnalysisFilters {
    sampleSubtypes?: string[];
    nfibres?: string[];
}

export interface AnalysisRequest {
    traitType: string;
    groupBy: 'all' | 'family' | 'genus' | 'species' | 'fullSpecies' | 'sampleSubTypes' | 'fullSpeciesSubsampletype';
    filters?: AnalysisFilters;
    unitConversion?: boolean;
}

export interface AnalysisResult {
    name: string;
    sampleSubTypes?: string; // Only present when groupBy is 'fullSpeciesSubsampletype'
    mean: number;
    stddev: number;
    min: number;
    max: number;
    median: number;
    count: number;
}

export interface AnalysisResponse {
    results: AnalysisResult[];
    unit: string;
    metadata: {
        totalTraits: number;
        filteredTraits: number;
        processingTime: string;
        groupBy: string;
        traitType: string;
    };
}

export interface FilterOptions {
    traitTypes: string[];
    sampleSubTypes: string[];
    nfibres: string[];
}

export function useTraitAnalysis() {
    const [data, setData] = useState<AnalysisResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);

    const fetchAnalysis = useCallback(async (request: AnalysisRequest) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch(`${prepend_path}/api/traits/analysis`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch analysis');
            }

            const result = await response.json();
            setData(result);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);
            console.error('Analysis fetch error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchFilterOptions = useCallback(async () => {
        try {
            const response = await fetch(`${prepend_path}/api/traits/analysis`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch filter options');
            }

            const options = await response.json();
            setFilterOptions(options);
            return options;
        } catch (err) {
            console.error('Filter options fetch error:', err);
            throw err;
        }
    }, []);

    const clearData = useCallback(() => {
        setData(null);
        setError(null);
    }, []);

    return {
        data,
        loading,
        error,
        filterOptions,
        fetchAnalysis,
        fetchFilterOptions,
        clearData
    };
}
