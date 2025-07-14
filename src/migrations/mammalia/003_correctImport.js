const { MongoClient } = require('mongodb');
const xlsx = require('xlsx');
const path = require('path');

async function importAndStructureData() {
  // File path to the Excel file
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

    // Connect to the specific database
    const db = client.db(dbName);

    // Define the collections
    const samplesCollection = db.collection('samples');
    const traitsCollection = db.collection('traits');

    // Clear existing data
    await samplesCollection.deleteMany({});
    await traitsCollection.deleteMany({});

    for (const record of jsonData) {

      const randomNum = Math.floor(Math.random() * 100000); // Adjust range as needed

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
        sex: record.sex,
        type: 'animal',
        date: new Date(),
        name: `${record.species}${randomNum}`
      };

      // Insert sample data and get the inserted ID
      const sampleResult = await samplesCollection.insertOne(sampleData);
      const sampleId = sampleResult.insertedId;

      // Prepare traits data with correct structure
      const traits = [
        { type: 'body mass', measurement: record['body mass'] , unit: record['body mass - units'], notes: record['body mass - comments'] },
        { type: 'brain size', measurement: record['brain size'] , unit: record['brain size - units'], notes: record['brain size - comments'] },
        { type: 'original brain size', measurement: record['original brain size'], unit: record['original brain size - units'], notes: record['original brain size - comments'] },
      ];


      // Insert traits with the correct structure
      for (const trait of traits) {
        if (trait.measurement !== undefined && trait.measurement !== null) {
          await traitsCollection.insertOne({
            responsible: '66619eaae9d3aad7399d7208',
            sampleId: sampleId,
            type: trait.type,
            measurement: trait.measurement,
            unit: trait.unit,
            notes: trait.notes,
            date: new Date()
          });
        }
      }
    }

    console.log('Data imported and structured successfully!');
  } catch (err) {
    console.error('Error importing and structuring data:', err);
  } finally {
    // Close the connection
    await client.close();
  }
}

importAndStructureData();