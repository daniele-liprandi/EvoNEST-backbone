const { MongoClient } = require('mongodb');
const xlsx = require('xlsx');
const path = require('path');

async function importExcelToMongoDB() {
  // File path
  const filePath = path.resolve(__dirname, 'Mammalia.xlsx');

  // Read the Excel file
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(worksheet);

  // MongoDB connection URL
  const mongoUrl = 'mongodb://root:pass@mongo:27017'; // Use the Docker container name as the host

  // Database name
  const dbName = 'birds';

  // Create a new MongoClient
  const client = new MongoClient(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    // Connect to the MongoDB server
    await client.connect();

    // Connect to the database
    const db = client.db(dbName);

    // Collections
    const samplesCollection = db.collection('samples');
    const traitsCollection = db.collection('traits');

    for (const record of jsonData) {
      // Prepare sample data
      const sampleData = {
        responsible: '66619eaae9d3aad7399d7208',
        phylum: record.phylum,
        class: record.class,
        order: record.order,
        family: record.family,
        genus: record.genus,
        species: record.species,
        specificEpithet: record['specific epithet'],
        sex: record.sex
      };

      // Insert sample data and get the inserted ID
      const sampleResult = await samplesCollection.insertOne(sampleData);
      const sampleId = sampleResult.insertedId;

      // Prepare traits data
      const traitsData = {
        responsible: '66619eaae9d3aad7399d7208',
        sampleId: sampleId,
        brainSize: record['brain size'],
        brainSizeUnits: record['brain size - units'],
        brainSizeMinimum: record['brain size - minimum'],
        brainSizeMaximum: record['brain size - maximum'],
        brainSizeMethod: record['brain size - method'],
        brainSizeComments: record['brain size - comments'],
        brainSizeMetadataComment: record['brain size - metadata comment'],
        originalBrainSize: record['original brain size'],
        originalBrainSizeUnits: record['original brain size - units']
      };

      // Insert traits data
      await traitsCollection.insertOne(traitsData);
    }

    console.log('Data imported successfully!');
  } catch (err) {
    console.error('Error importing data:', err);
  } finally {
    // Close the connection
    await client.close();
  }
}

importExcelToMongoDB();