const { MongoClient } = require('mongodb');

async function updateSamplesWithType() {
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

    // Define the samples collection
    const samplesCollection = db.collection('samples');

    // Update all documents to add the type field
    const updateResult = await samplesCollection.updateMany({}, { $set: { type: 'animal' } });

    console.log(`Updated ${updateResult.modifiedCount} documents.`);
  } catch (err) {
    console.error('Error updating documents:', err);
  } finally {
    // Close the connection
    await client.close();
  }
}

updateSamplesWithType();
