import useSWR from 'swr';

const fetcher = url => fetch(url).then(res => res.json());

export const useExperimentsData = (
    prependPath, 
    includeRawData = false, 
    type,
    options
) => {
    // Construct URL with optional query parameters
    const url = `${prependPath}/api/experiments${
        includeRawData || type ? '?' : ''
    }${
        includeRawData ? 'includeRawData=true' : ''
    }${
        includeRawData && type ? '&' : ''
    }${
        type ? `type=${type}` : ''
    }`;
    
    const { data, error, isValidating } = useSWR(url, fetcher, options);
    
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
    
    const { data, error, isValidating } = useSWR(url, fetcher, options);
    
    return {
        experimentData: data,
        experimentError: error,
        isLoading: !error && !data,
        isValidating
    };    
};