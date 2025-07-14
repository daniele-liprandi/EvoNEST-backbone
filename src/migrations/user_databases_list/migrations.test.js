const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { migrateUsers, validateUser } = require('./migrations');

describe('MongoDB Migrations', () => {
    let mongoServer;
    let connection;
    let db;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        connection = await MongoClient.connect(mongoServer.getUri(), {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        db = connection.db();
    });

    afterAll(async () => {
        await connection.close();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        await db.collection('users').deleteMany({});
    });

    describe('migrateUsers', () => {
        it('should migrate users with database field correctly', async () => {
            // Setup
            await db.collection('users').insertMany([
                { _id: 1, auth0id: 'user1', database: 'db1' },
                { _id: 2, auth0id: 'user2', database: 'db2', databases: ['db2'] },
                { _id: 3, auth0id: 'user3' }
            ]);

            // Execute
            const migrationLog = await migrateUsers(mongoServer.getUri());

            // Verify
            const migratedUsers = await db.collection('users').find().toArray();
            expect(migratedUsers).toEqual(expect.arrayContaining([
                expect.objectContaining({ 
                    auth0id: 'user1',
                    database: 'db1',
                    databases: ['db1'],
                    activeDatabase: 'db1'
                })
            ]));
        });

        it('should handle empty database field correctly', async () => {
            await db.collection('users').insertMany([
                { _id: 3, auth0id: 'user3' }
            ]);

            const migrationLog = await migrateUsers(mongoServer.getUri());
            const migratedUsers = await db.collection('users').find().toArray();
            
            expect(migratedUsers[0].databases).toEqual([]);
            expect(migratedUsers[0].activeDatabase).toBeNull();
        });

        it('should throw error for invalid MongoDB URI', async () => {
            await expect(migrateUsers('invalid-uri'))
                .rejects
                .toThrow();
        });
    });

    describe('validateUser', () => {
        it('should validate correct user object', async () => {
            const validUser = {
                auth0id: 'test',
                databases: ['db1', 'db2'],
                activeDatabase: 'db1'
            };
            await expect(validateUser(validUser)).resolves.not.toThrow();
        });

        it('should throw for invalid databases field', async () => {
            const invalidUser = {
                auth0id: 'test',
                databases: 'not-an-array',
                activeDatabase: 'db1'
            };
            await expect(validateUser(invalidUser))
                .rejects
                .toThrow(/invalid databases field/);
        });
    });
});