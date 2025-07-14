export function getTreeDataSingles(samplesData) {

    if (!samplesData) return null
    else {
        {
            // Function to group data by a key
            const groupBy = (array, key) => array.reduce((result, currentValue) => {
                (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
                return result;
            }, {});

            // Group data by family, genus, and species
            const groupedByFamily = groupBy(samplesData, 'family');
            const families = Object.keys(groupedByFamily).map(family => {
                const groupedByGenus = groupBy(groupedByFamily[family], 'genus');
                const genera = Object.keys(groupedByGenus).map(genus => {
                    const species = groupedByGenus[genus].map(sample => ({
                        name: sample.name,
                        value: 1, // Each sample contributes a value of 1
                        ...sample // Spread other sample properties
                    }));

                    return { name: genus, children: species };
                });

                return { name: family, children: genera };
            });

            return { name: "root", children: families };
        }
    };
}


export function getTreeDataCount(samplesData) {

    if (!samplesData) return null
    else {
        const nest = (data, keys) => {
            if (!keys.length) {
                return [{ count: data.length }]; // Return the count in a children array
            }

            const key = keys[0];
            const groupedData = data.reduce((acc, item) => {
                const keyValue = item[key];
                if (keyValue) { // Check if keyValue is not null or empty
                    if (!acc[keyValue]) acc[keyValue] = [];
                    acc[keyValue].push(item);
                }
                return acc;
            }, {});

            return Object.entries(groupedData).map(([keyValue, value]) => ({
                name: keyValue,
                children: nest(value, keys.slice(1))
            })).filter(item => item.name && item.children.length); // Filter out entries with no name or empty children
        };

        const nestedData = nest(samplesData, ['family', 'genus', 'species']);
        const cleanedData = nestedData.length ? nestedData : [{ name: 'No Data', children: [] }]; // Return a default node if no data
        return {
            name: "All samples",
            children: cleanedData // this is your existing array
        }
    }
}

export function getSunburstData(samplesData, plotType) {
    const data = {
        type: plotType || "sunburst",
        id: ["Samples"],
        labels: ["Samples"],
        parents: [""],
        branchvalues: "total",
        values: [0],
        outsidetextfont: { size: 20, color: "#377eb8" },
        leaf: { opacity: 0.6 },
    };

    // Count the number of samples for each species
    samplesData.forEach(sample => {
        // Add family, genus, and species to labels if not already present
        if (!data.id.includes(sample.family)) {
            data.id.push(sample.family);
            data.labels.push(sample.family);
            data.parents.push("Samples");
            data.values.push(1); // Placeholder value, actual count is not important for family
        } else {
            const familyIndex = data.labels.indexOf(sample.family);
            data.values[familyIndex] = (data.values[familyIndex] || 0) + 1;
        }
        if (!data.id.includes(sample.genus)) {
            data.id.push(sample.genus);
            data.labels.push(sample.genus);
            data.parents.push(sample.family);
            data.values.push(1); // Placeholder value for genus
        } else {
            const genusIndex = data.labels.indexOf(sample.genus);
            data.values[genusIndex] = (data.values[genusIndex] || 0) + 1;
        }
        if (!data.id.includes(sample.genus + " - " + sample.species)) {
            data.id.push(sample.genus + " - " + sample.species);
            data.labels.push(sample.species);
            data.parents.push(sample.genus);
            data.values.push(1);
        } else {
            const speciesIndex = data.id.indexOf(sample.genus + " - " + sample.species);
            data.values[speciesIndex] = (data.values[speciesIndex] || 0) + 1;
        }
    });

    data.values[0] = samplesData.length; // Set the value for the root node
    return data;
}

export function getPlotlyLabelBasedHierarchy(initialData, plotType, hierarchyLevels, rootName = "Root") {
    const data = {
        type: plotType || "sunburst",
        id: [rootName],
        labels: [rootName],
        parents: [""],
        branchvalues: "total",
        textinfo: "label+value+percent parent+percent entry",
        values: [0],
        outsidetextfont: { size: 20, color: "#377eb8" },
        leaf: { opacity: 0.6 },
    };

    const hierarchyMap = new Map();
    const childSumMap = new Map();

    initialData.forEach(sample => {
        let parentId = rootName;
        hierarchyLevels.forEach((level, index) => {
            const currentId = sample[level] || "unknown";
            const currentFullId = parentId + " - " + currentId;

            if (!hierarchyMap.has(currentFullId)) {
                hierarchyMap.set(currentFullId, {
                    id: currentFullId,
                    label: currentFullId,
                    parent: parentId,
                    value: 0,
                });
                data.id.push(currentFullId);
                data.labels.push(currentFullId);
                data.parents.push(parentId);
                data.values.push(1);
                childSumMap.set(parentId, (childSumMap.get(parentId) || 0) + 1);
            } else {
                const index = data.id.indexOf(currentFullId);
                data.values[index] = (data.values[index] || 0) + 1;
                childSumMap.set(parentId, (childSumMap.get(parentId) || 0) + 1);
            }
            parentId = currentFullId;
        });
    });

    // Update parent values to ensure they match the sum of their children
    hierarchyMap.forEach((value, key) => {
        if (childSumMap.has(key)) {
            const index = data.id.indexOf(key);
            data.values[index] = childSumMap.get(key);
        }
    });

    data.values[0] = initialData.length; // Set the value for the root node
    return data;
}
