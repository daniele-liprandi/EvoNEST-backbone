// useTraitData.js
// Uses the global SWRConfig fetcher (src/app/providers/swr-provider.tsx), which
// throws on a non-OK response so `traitsError` actually reflects a failed
// request instead of resolving with the error body as if it were data.
import useSWR from 'swr';

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

    const { data, error, isValidating } = useSWR(url, options);
    
    return {
        traitsData: data,
        traitsError: error,
        isLoading: !error && !data,
        isValidating
    };    
};