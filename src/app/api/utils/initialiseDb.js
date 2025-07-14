// Flag to prevent concurrent admin creation
let adminCreationInProgress = false;

export async function ensureDefaultAdmin(client) {
    // If admin creation is already in progress, wait for it to complete
    if (adminCreationInProgress) {
        return;
    }
    
    adminCreationInProgress = true;
    
    try {
        const users = client.db("usersdb").collection("users");
        
        // Check if any user exists
        const userCount = await users.countDocuments();
        
        if (userCount === 0) {
            // Create default admin user
            const defaultAdmin = {
                auth0id: 'demo|admin',
                name: 'admin',
                role: 'admin',
                email: 'admin@demo.com',
                activeDatabase: 'admin',
                databases: ['admin'],
                logbook: [`${new Date().toISOString()}: created default admin user`],
                recentChangeDate: new Date().toISOString()
            };
            
            await users.insertOne(defaultAdmin);
            console.log('Default admin user created');
        }
    } finally {
        adminCreationInProgress = false;
    }
}