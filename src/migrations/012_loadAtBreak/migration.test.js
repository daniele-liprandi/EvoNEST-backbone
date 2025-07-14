const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { up } = require('./migration'); 

describe('LoadAtBreak Migration', () => {
    let mongod;
    let client;
    let db;
    let experimentsCollection;
    let rawdataCollection;
    let traitsCollection;
    let experimentId;
    let sampleId;

    // Setup before all tests
    beforeAll(async () => {
        // Create new instance of "MongoDB Memory Server"
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();

        // Create connection to in-memory database
        client = new MongoClient(uri);
        await client.connect();

        // Get reference to test database
        db = client.db('test');
        experimentsCollection = db.collection('experiments');
        rawdataCollection = db.collection('rawdata');
        traitsCollection = db.collection('traits');
    });

    // Clean up after all tests
    afterAll(async () => {
        if (client) {
            await client.close();
        }
        if (mongod) {
            await mongod.stop();
        }
    });

    // Setup test data before each test
    beforeEach(async () => {
        // Clear all collections
        await experimentsCollection.deleteMany({});
        await rawdataCollection.deleteMany({});
        await traitsCollection.deleteMany({});

        // Create test IDs
        experimentId = new ObjectId();
        sampleId = new ObjectId();

        // Insert test experiment
        await experimentsCollection.insertOne({
            _id: experimentId,
            name: 'Test Experiment',
            sampleId: sampleId,
            date: new Date().toISOString(),
            logbook: [] // Initialize empty logbook
        });

        // Insert test rawdata
        await rawdataCollection.insertOne({
            experimentId: experimentId,
            data: {
                LoadOnSpecimen: [5, 15, 25, 20, 10] // Max is 25
            }
        });
    });

    test('should update experiments with loadAtBreak value', async () => {
        // Run the migration
        await up(client, 'test'); // Pass the client and database name

        // Verify experiment was updated
        const updatedExperiment = await experimentsCollection.findOne({ _id: experimentId });
        expect(updatedExperiment).toBeTruthy();
        expect(updatedExperiment.loadAtBreak).toBe(25);

        // Verify logbook entry was added
        expect(updatedExperiment.logbook).toEqual(
            expect.arrayContaining([
                expect.arrayContaining([
                    expect.any(String), // timestamp
                    expect.stringContaining('Added loadAtBreak: 25N') // message
                ])
            ])
        );
    });

    test('should create traits for loadAtBreak', async () => {
        // Run the migration
        await up(client, 'test');

        // Verify trait was created
        const traits = await traitsCollection.find({
            sampleId: sampleId,
            type: 'loadAtBreak'
        }).toArray();

        expect(traits.length).toBe(1);
        expect(traits[0].measurement).toBe(25);
        expect(traits[0].unit).toBe('N');
        expect(traits[0].experimentId).toEqual(experimentId);
    });

    test('should skip entries without LoadOnSpecimen data', async () => {
        // Replace rawdata with one missing LoadOnSpecimen
        await rawdataCollection.deleteMany({});
        await rawdataCollection.insertOne({
            experimentId: experimentId,
            data: {
                EngineeringStrain: [10, 20, 30] // No LoadOnSpecimen data
            }
        });

        // Run the migration
        await up(client, 'test');

        // Verify experiment was not updated
        const updatedExperiment = await experimentsCollection.findOne({ _id: experimentId });
        expect(updatedExperiment.loadAtBreak).toBeUndefined();

        // Verify no trait was created
        const traits = await traitsCollection.find({
            sampleId: sampleId,
            type: 'loadAtBreak'
        }).toArray();

        expect(traits.length).toBe(0);
    });
});