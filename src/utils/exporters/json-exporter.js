/**
 * JSON Exporter for Tensile Test Data
 * 
 * Converts MongoDB experiment data to structured JSON format for analysis
 */

/**
 * Export experiments to a structured format suitable for analysis
 * 
 * @param {Array} experiments - Array of experiment objects with raw data
 * @returns {Object} Structured data ready for export
 */
export function exportExperimentsToStructuredFormat(experiments) {
    const exportData = {
        metadata: {
            exportDate: new Date().toISOString(),
            totalExperiments: experiments.length,
            format: 'tensile_test_collection',
            version: '1.0.0'
        },
        experiments: {}
    };

    experiments.forEach((experiment, index) => {
        const experimentId = experiment._id || `experiment_${index}`;
        
        // Create a structured entry for each experiment
        exportData.experiments[experimentId] = {
            // Basic metadata
            metadata: {
                name: experiment.name,
                type: experiment.type,
                date: experiment.date,
                sampleId: experiment.sampleId,
                responsible: experiment.responsible,
                equipment: experiment.equipment || 'EVOMECT150',
                notes: experiment.notes,
                filename: experiment.filename,
                recentChangeDate: experiment.recentChangeDate
            },
            
            // Experimental conditions
            conditions: {
                temperature: experiment.temperature,
                humidity: experiment.humidity,
                window: experiment.window
            },
            
            // Raw channel data for analysis
            rawData: extractChannelData(experiment),
            
            // Additional metadata
            textFields: experiment.data?.textFields || {}
        };
    });

    return exportData;
}

/**
 * Extract channel data from experiment
 * Actual fields: EngineeringStrain, EngineeringStress, LoadOnSpecimen, Extension, Time
 */
function extractChannelData(experiment) {
    const channelData = {};
    
    // Check both data.channelData and rawdata.data
    const channels = experiment.data?.channelData || 
                    experiment.rawdata?.data || 
                    experiment.originalData?.data ||
                    {};
    
    // Extract each channel
    Object.entries(channels).forEach(([channelName, values]) => {
        if (Array.isArray(values) && values.length > 0) {
            const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
            channelData[channelName] = {
                values: values,
                unit: inferUnit(channelName),
                count: values.length,
                min: numericValues.length > 0 ? Math.min(...numericValues) : null,
                max: numericValues.length > 0 ? Math.max(...numericValues) : null
            };
        }
    });
    
    return channelData;
}

/**
 * Infer unit based on channel name
 * Actual channel names: EngineeringStrain, EngineeringStress, LoadOnSpecimen, Extension, Time
 */
function inferUnit(channelName) {
    const unitMap = {
        'EngineeringStrain': 'unitless',
        'EngineeringStress': 'Pa',
        'LoadOnSpecimen': 'N',
        'Extension': 'mm',
        'Time': 's',
    };
    
    return unitMap[channelName] || 'unknown';
}

/**
 * Export to CSV format
 * Creates a flattened structure suitable for CSV export (summary only, no raw data)
 */
export function exportExperimentsToCSV(experiments) {
    const rows = [];
    
    // Header row
    const headers = [
        'experiment_id',
        'name',
        'sample_id',
        'date',
        'responsible',
        'temperature',
        'humidity',
        'window',
        'max_load_N',
        'max_extension_mm',
        'max_stress_Pa',
        'max_strain',
        'data_points_count'
    ];
    
    rows.push(headers.join(','));
    
    // Data rows
    experiments.forEach(experiment => {
        const channelData = extractChannelData(experiment);
        const dataPointsCount = channelData.Time?.count || channelData.Extension?.count || 0;
        
        const row = [
            experiment._id || '',
            `"${(experiment.name || '').replace(/"/g, '""')}"`, // Escape quotes in names
            experiment.sampleId || '',
            experiment.date || '',
            experiment.responsible || '',
            experiment.temperature || '',
            experiment.humidity || '',
            experiment.window || '',
            channelData.LoadOnSpecimen?.max || '',
            channelData.Extension?.max || '',
            channelData.EngineeringStress?.max || '',
            channelData.EngineeringStrain?.max || '',
            dataPointsCount
        ];
        
        rows.push(row.join(','));
    });
    
    return rows.join('\n');
}
