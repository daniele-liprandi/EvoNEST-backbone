// useUserData.js
import useSWR from 'swr';
const fetcher = url => fetch(url).then(res => res.json());

export const useFilesData = (prependPath) => {
    const { data, error } = useSWR(`${prependPath}/api/files`, fetcher);
    return {
        filesData: data,
        filesError: error,
    };  
};
