import { get_or_create_client } from "@/app/api/utils/mongodbClient";

/**
 * Validates an API key and retrieves the associated database
 * @param {string} apiKey - The API key to validate
 * @param {string} database - The requested database name
 * @returns {Promise<{valid: boolean, database: string|null, user: Object|null}>}
 */
export async function validateApiKey(apiKey, database) {
  if (!apiKey || !database) {
    return { valid: false, database: null, user: null };
  }

  try {
    const client = await get_or_create_client();
    const users = client.db("usersdb").collection("users");
    
    // Find user with matching API key that has access to the requested database
    const user = await users.findOne({
      "apiKeys.key": apiKey,
      "apiKeys.isActive": true,
      databases: database
    });

    if (!user) {
      return { valid: false, database: null, user: null };
    }

    // Check if the API key is expired
    const apiKeyRecord = user.apiKeys.find(ak => ak.key === apiKey && ak.isActive);
    if (apiKeyRecord && apiKeyRecord.expiresAt) {
      const expiryDate = new Date(apiKeyRecord.expiresAt);
      if (expiryDate < new Date()) {
        return { valid: false, database: null, user: null };
      }
    }

    // Log API key usage
    await users.updateOne(
      { _id: user._id, "apiKeys.key": apiKey },
      {
        $set: {
          "apiKeys.$.lastUsedAt": new Date().toISOString()
        },
        $inc: {
          "apiKeys.$.usageCount": 1
        }
      }
    );

    return { valid: true, database: database, user: user };
  } catch (error) {
    console.error("API key validation error:", error);
    return { valid: false, database: null, user: null };
  }
}

/**
 * Extracts API key from request headers or query parameters
 * @param {Request} req - The Next.js request object
 * @returns {string|null} The API key if found, null otherwise
 */
export function extractApiKey(req) {
  // Check Authorization header: Bearer <api-key>
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Check X-API-Key header
  const apiKeyHeader = req.headers.get("x-api-key");
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // Check query parameter
  const url = new URL(req.url);
  const queryApiKey = url.searchParams.get("apiKey");
  if (queryApiKey) {
    return queryApiKey;
  }

  return null;
}

/**
 * Generates a random API key with EvoNEST prefix
 * @param {number} length - Length of the random part (default: 32)
 * @returns {string} Generated API key
 */
export function generateApiKey(length = 32) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "evo_";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Middleware function for API key authentication on export endpoints
 * @param {Request} req - The Next.js request object
 * @returns {Promise<{valid: boolean, database: string|null, error: string|null}>}
 */
export async function authenticateExportRequest(req) {
  const apiKey = extractApiKey(req);
  const url = new URL(req.url);
  const database = url.searchParams.get("database");

  if (!apiKey) {
    return { 
      valid: false, 
      database: null, 
      error: "API key is required. Provide it via 'Authorization: Bearer <key>' header, 'X-API-Key' header, or '?apiKey=<key>' query parameter." 
    };
  }

  if (!database) {
    return { 
      valid: false, 
      database: null, 
      error: "Database parameter is required. Provide it via '?database=<dbname>' query parameter." 
    };
  }

  const result = await validateApiKey(apiKey, database);
  
  if (!result.valid) {
    return { 
      valid: false, 
      database: null, 
      error: "Invalid API key or insufficient permissions for the requested database." 
    };
  }

  return { valid: true, database: result.database, error: null };
}
