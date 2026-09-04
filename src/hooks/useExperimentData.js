// Uses the global SWRConfig fetcher (src/app/providers/swr-provider.tsx), which
// throws on a non-OK response so `experimentsError`/`experimentError` actually
// reflect a failed request instead of resolving with the error body as data.
import useSWR from 'swr';

export const useExperimentsData = (
    prependPath, 
    includeRawData = false, 
    type,
    options,
    includeTraitsData = false
) => {
    // Construct URL with optional query parameters
    const params = new URLSearchParams();
    if (includeRawData) params.append('includeRawData', 'true');
    if (includeTraitsData) params.append('includeTraitsData', 'true');
    if (type) params.append('type', type);
    
    const url = `${prependPath}/api/experiments${params.toString() ? '?' + params.toString() : ''}`;
    
    const { data, error, isValidating } = useSWR(url, options);
    
    return {
        experimentsData: data,
        experimentsError: error,
        isLoading: !error && !data,
        isValidating
    };    
};

export const useExperimentData = (
    prependPath, 
    id, 
    includeRawData = false, 
    type,
    options
) => {
    const url = `${prependPath}/api/experiment/${id}${
        includeRawData || type ? '?' : ''
    }${
        includeRawData ? 'includeRawData=true' : ''
    }${
        includeRawData && type ? '&' : ''
    }${
        type ? `type=${type}` : ''
    }`;
    
    const { data, error, isValidating } = useSWR(url, options);
    
    return {
        experimentData: data,
        experimentError: error,
        isLoading: !error && !data,
        isValidating
    };    
};