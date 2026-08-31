import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI

let clientPromise: Promise<MongoClient> | null = null

export function getMongoClient(): Promise<MongoClient> {
  if (!clientPromise) {
    if (!uri) throw new Error('MONGODB_URI is required')
    clientPromise = new MongoClient(uri).connect().catch((err) => {
      // Let the next call retry instead of caching a rejected promise.
      clientPromise = null
      throw err
    })
  }
  return clientPromise
}

export async function getDb(dbName: string) {
  const c = await getMongoClient()
  return c.db(dbName)
}
