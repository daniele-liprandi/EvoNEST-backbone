// useTraitData.js
// 
import useSWR from 'swr';
const fetcher = url => fetch(url).then(res => res.json());

export const useTraitData = (
    prependPath, 
    includeSampleFeatures = false, 
    type,
    options
) => {
    const url = `${prependPath}/api/traits${
        includeSampleFeatures || type ? '?' : ''
    }${
        includeSampleFeatures ? 'includeSampleFeatures=true' : ''
    }${
        includeSampleFeatures && type ? '&' : ''
    }${
        type ? `type=${type}` : ''
    }`;

    const { data, error, isValidating } = useSWR(url, fetcher, options);
    
    return {
        traitsData: data,
        traitsError: error,
        isLoading: !error && !data,
        isValidating
    };    
};