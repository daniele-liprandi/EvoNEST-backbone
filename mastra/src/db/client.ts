import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI

let client: MongoClient | null = null

export async function getMongoClient(): Promise<MongoClient> {
  if (client) return client
  if (!uri) throw new Error('MONGODB_URI is required')
  client = new MongoClient(uri)
  await client.connect()
  return client
}

export async function getDb(dbName: string) {
  const c = await getMongoClient()
  return c.db(dbName)
}