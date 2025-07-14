'use client';

import { useState, useEffect } from 'react';
import { Separator } from '../components/ui/separator';

export const ImageGBIFSearch = ({ GNRdata }) => {
    const [imageData, setImageData] = useState(null);
    const query = GNRdata.canonical_form;

    useEffect(() => {
        if (query) {
            fetchImage(query);
        }
    }, [query]);

    const fetchImage = async (query) => {
        try {
            const response = await fetch(`/api/searchGBIFImage?query=${encodeURIComponent(query)}`);
            const data = await response.json();
            if (data.imageUrl) {
                setImageData(data);
            } else {
                setImageData(null);
                console.log(data.error || 'No image found');
            }
        } catch (error) {
            console.error('Error fetching image:', error);
        }
    };

    const imageUrl = imageData?.imageUrl;

    return (
        <div>
            {imageUrl && imageUrl != '' &&
                (
                    <div className='space-y-3 text-muted-foreground text-xs'>
                        <img className='max-h-80' src={imageData.imageUrl} alt={query} />
                        <div className='flex space-x-1'>
                            <span>Image Rights Holder: {imageData.rightsHolder}</span>
                            <Separator orientation="vertical" />
                            <span>Country: {imageData.country}</span>
                        </div>
                    </div>
                )}
        </div>
    );
};
