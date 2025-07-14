const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

async function connectClient() {
    try {
        await client.connect();
        console.log('Connected successfully to MongoDB');
    } catch (e) {
        console.error('Failed to connect to MongoDB:', e);
        process.exit(1);
    }
}

async function compareTraits() {
    await connectClient();
    
    try {
        const currentDb = client.db("evonest");
        const backupDb = client.db("evonest_backup");
        
        const currentTraits = await currentDb.collection("traits").find({}).toArray();
        const backupTraits = await backupDb.collection("traits").find({}).toArray();

        console.log(`Current traits: ${currentTraits.length}`);
        console.log(`Backup traits: ${backupTraits.length}`);

        // Group traits by sampleId and type
        const currentTraitsGrouped = groupTraitsByMeasurement(currentTraits);
        const backupTraitsGrouped = groupTraitsByMeasurement(backupTraits);

        // Find truly missing measurements
        const missingMeasurements = [];
        
        backupTraitsGrouped.forEach((backupMeasurements, key) => {
            const [sampleId, type] = key.split('_');
            const currentMeasurements = currentTraitsGrouped.get(key) || new Set();
            
            // Find measurements that exist in backup but not in current
            backupMeasurements.forEach(measurement => {
                if (!currentMeasurements.has(measurement)) {
                    // Find the original trait(s) with this measurement
                    const originalTraits = backupTraits.filter(t => 
                        t.sampleId === sampleId && 
                        t.type === type && 
                        Math.abs(t.measurement - measurement) < 0.1 // Use small epsilon for float comparison
                    );
                    
                    missingMeasurements.push(...originalTraits);
                }
            });
        });

        // Group missing measurements by type
        const missingByType = missingMeasurements.reduce((acc, trait) => {
            acc[trait.type] = (acc[trait.type] || 0) + 1;
            return acc;
        }, {});

        

        // Print summary
        console.log('\n=== Missing Measurements Summary ===');
        console.log('Total missing measurements:', missingMeasurements.length);
        console.log('Missing measurements by type:', missingByType);

        console.log('\n=== Sample of Missing Measurements ===');
        console.log('First 10 missing measurements:');
        missingMeasurements.slice(0, 10).forEach(trait => {
            console.log({
                type: trait.type,
                sampleId: trait.sampleId,
                experimentId: trait.experimentId,
                measurement: trait.measurement,
                date: trait.date
            });
        });

        // Group by sample to identify patterns
        const missingSamples = missingMeasurements.reduce((acc, trait) => {
            acc[trait.sampleId] = acc[trait.sampleId] || {};
            acc[trait.sampleId][trait.type] = (acc[trait.sampleId][trait.type] || 0) + 1;
            return acc;
        }, {});

        console.log('\n=== Samples with Missing Measurements ===');
        console.log('Number of affected samples:', Object.keys(missingSamples).length);
        
        // Find samples missing multiple measurements
        const samplesWithMultipleMissing = Object.entries(missingSamples)
            .filter(([_, types]) => Object.keys(types).length > 1);

        console.log('\nSamples missing multiple measurement types:', samplesWithMultipleMissing.length);
        if (samplesWithMultipleMissing.length > 0) {
            console.log('\nFirst 5 samples with multiple missing measurements:');
            samplesWithMultipleMissing.slice(0, 5).forEach(([sampleId, types]) => {
                console.log({ sampleId, missingTypes: types });
            });
        }

        // Save detailed results to file
        const fs = require('fs');
        // save the first 20 traits of type modulus for both current and backup
        const currentModulus = currentTraits.filter(t => t.type === 'modulus').slice(0, 20);
        const backupModulus = backupTraits.filter(t => t.type === 'modulus').slice(0, 20);
        fs.writeFileSync('current_modulus.json', JSON.stringify(currentModulus, null, 2));
        fs.writeFileSync('backup_modulus.json', JSON.stringify(backupModulus, null, 2));
        
        
        const results = {
            missingMeasurements,
            missingByType,
            missingSamples,
            samplesWithMultipleMissing: samplesWithMultipleMissing
        };
        fs.writeFileSync('missing_measurements.json', JSON.stringify(results, null, 2));
        console.log('\nDetailed results saved to missing_measurements.json');

    } catch (error) {
        console.error("Error comparing traits:", error);
    } finally {
        await client.close();
    }
}

// Helper function to group traits by sampleId_type and collect unique measurements
function groupTraitsByMeasurement(traits) {
    const grouped = new Map();
    
    traits.forEach(trait => {
        const key = `${trait.sampleId}_${trait.type}`;
        if (!grouped.has(key)) {
            grouped.set(key, new Set());
        }
        grouped.get(key).add(trait.measurement);
    });
    
    return grouped;
}

// Execute the comparison
compareTraits().catch(console.error);

module.exports = { compareTraits };