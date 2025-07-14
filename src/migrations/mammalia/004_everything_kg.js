const { MongoClient } = require('mongodb');

async function convertToSIUnits() {
  // MongoDB connection URL
  const mongoUrl = 'mongodb://root:pass@mongo:27017'; // Use the Docker container name as the host

  // Database name
  const dbName = 'birds';

  // Create a new MongoClient
  const client = new MongoClient(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    // Connect to the MongoDB server
    await client.connect();

    // Connect to the specific database
    const db = client.db(dbName);

    // Define the collection
    const traitsCollection = db.collection('traits');

    // Fetch all traits
    const traits = await traitsCollection.find().toArray();

    // Conversion factors to kg
    const conversionFactors = {
      'kg': 1,
      'g': 1e-3,
      'mg': 1e-6,
      'ug': 1e-9
    };

    // Update each trait
    for (const trait of traits) {
      if (trait.unit in conversionFactors) {
        const convertedMeasurement = trait.measurement * conversionFactors[trait.unit];
        
        // Update the trait with the converted measurement and unit 'kg'
        await traitsCollection.updateOne(
          { _id: trait._id },
          { $set: { measurement: convertedMeasurement, unit: 'kg' } }
        );
      }
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    // Close the connection
    await client.close();
  }
}

convertToSIUnits();
