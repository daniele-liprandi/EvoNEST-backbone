// useSampleData.js
// Uses the global SWRConfig fetcher (src/app/providers/swr-provider.tsx), which
// throws on a non-OK response so `samplesError` actually reflects a failed
// request instead of resolving with the error body as if it were data.
import useSWR, { SWRConfiguration } from 'swr';

export const useSampleData = (prependPath, options) => {
    const {
        data,
        error,
        isValidating // Adding this since we used it in the page
    } = useSWR(
        `${prependPath}/api/samples`,
        options // Pass through any SWR options
    );

    return {
        samplesData: data,
        samplesError: error,
        isValidating,
    };    
};