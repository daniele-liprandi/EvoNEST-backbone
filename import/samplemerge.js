const fs = require('fs');
const path = require('path');

function readJsonFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

function mergeJsonFiles(primaryFile, secondaryFile, outputFile) {
    const primaryData = readJsonFile(primaryFile);
    const secondaryData = readJsonFile(secondaryFile);

    const mergedData = primaryData.map(primaryItem => {
        const secondaryItems = secondaryData.filter(secondaryItem => secondaryItem.id === primaryItem.id);

        // Combine the primary item with all secondary items (if any)
        return { ...primaryItem, secondaryItems };
    });

    writeJsonFile(outputFile, mergedData);
}

const primaryFile = process.argv[2];
const secondaryFile = process.argv[3];
const outputFile = process.argv[4];

mergeJsonFiles(primaryFile, secondaryFile, outputFile);
