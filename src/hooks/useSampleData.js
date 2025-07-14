// useSampleData.js
import useSWR, { SWRConfiguration } from 'swr';

const fetcher = url => fetch(url).then(res => res.json());

export const useSampleData = (prependPath, options) => {
    const { 
        data, 
        error, 
        isValidating // Adding this since we used it in the page
    } = useSWR(
        `${prependPath}/api/samples`, 
        fetcher,
        options // Pass through any SWR options
    );

    return {
        samplesData: data,
        samplesError: error,
        isValidating,
    };    
};