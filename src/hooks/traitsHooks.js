//add sample features to traitsData
export function traitsDataWithSampleFeatures(traitsData, samplesData) {
    return traitsData.map(trait => {
        const sample = samplesData.find(sample => sample._id === trait.sampleId);
        return { ...trait, 
            sampleName: sample?.name || '',
            samplesubtype: sample?.subsampletype || '', 
            family : sample?.family || '',
            genus : sample?.genus || '',
            species : sample?.species || '',
        };
    });
}
