const { MongoClient } = require('mongodb');

// MongoDB Connection URI
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

async function up() {
    await connectClient();
    try {
        const db = client.db("evonest");
        const traitsCollection = db.collection("traits");
        const samplesCollection = db.collection("samples");

        // Fetch all traits
        const traits = await traitsCollection.find().toArray();

        // Fetch the traits which still have a field "secondaryItems"
        const traitsWithSecondaryItems = traits.filter(trait => trait.secondaryItems);

        for (let trait of traitsWithSecondaryItems) {
            
            // Find the corresponding sample by name
            const sample = await samplesCollection.findOne({ name: trait.samples_id });
            if (!sample) {
                console.error(`Sample not found for: ${trait.samples_id}`);
                continue; // Skip this trait if no matching sample is found
            }
            
            // Prepare updates for the trait
            const updateFields = {
                type: "diameter",
                responsible: trait.responsible_id,
                samples_id: sample._id,
                date: trait.uploaddate,
                ...trait.secondaryItems[0], // Spread the properties of the first item in secondaryItems
            };
            // Rename and reorganize fields
            updateFields.sampleId = updateFields.samples_id;
            delete updateFields.samples_id;
            
            // Rename and reorganize fields
            updateFields.measurement = updateFields.diameter;
            delete updateFields.diameter;

            updateFields.std = updateFields.diameter_std;
            delete updateFields.diameter_std;

            updateFields.listvals = updateFields.diameter_listvals;
            delete updateFields.diameter_listvals;

            updateFields.silktype = updateFields.silk_type;
            delete updateFields.silk_type;

            // Apply the updates to the trait document
            await traitsCollection.updateOne({ id: trait.id }, { $set: updateFields, $unset: { responsible_id: "", uploaddate: "", "secondaryItems": "" } });
        }

        console.log("Migration applied successfully");
    } catch (error) {
        console.error("Error applying migration:", error);
    } finally {
        await client.close();
    }
}

up().catch(console.error);
