// useUserDetails.js
import { useState, useEffect } from 'react';
import { prepend_path } from '@/utils/config';

const fetchUserById = async (userId) => {
    try {
        console.log("Fetching user with ID:", userId);
        const response = await fetch(`${prepend_path}/api/user/${userId}`);
        if (!response.ok) throw new Error('User fetch failed');
        return await response.json();
    } catch (error) {
        console.error("Fetch error:", error);
        return null; // Return null if fetch fails
    }
};
export const useUserDetails = (samplesData, prependPath) => {
    const [userDetails, setUserDetails] = useState({});

    useEffect(() => {
        if (samplesData) {
            const uniqueUserIds = [...new Set(samplesData.map(sample => sample.responsible))];
            Promise.all(uniqueUserIds.map(userId => fetchUserById(userId)))
                .then(userDetailsArray => {
                    const userDetailsObj = userDetailsArray.reduce((acc, user) => {
                        if (user) acc[user._id] = user;
                        return acc;
                    }, {});
                    setUserDetails(userDetailsObj);
                });
        }
    }, [samplesData]);

    const getUserNameById = (userId) => userDetails[userId]?.name || 'Unknown User';
    return { userDetails, getUserNameById };
};

