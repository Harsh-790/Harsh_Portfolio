import { MongoClient } from 'mongodb';

/**
 * One native MongoDB client for GridFS.
 *
 * Prisma owns the application-data connection pool, but it does not expose
 * GridFSBucket. This client is a lazy singleton on globalThis so hot reloads and
 * concurrent requests reuse one pool instead of opening a connection per upload.
 * The database name is taken from DATABASE_URL, exactly like Prisma.
 */

const globalForMongo = globalThis as unknown as {
  portfolioMongoClient?: Promise<MongoClient>;
};

async function connect(): Promise<MongoClient> {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error('DATABASE_URL is not configured.');

  const client = new MongoClient(uri, { maxPoolSize: 10 });
  try {
    await client.connect();
    return client;
  } catch (error) {
    await client.close().catch(() => {});
    throw error;
  }
}

export function getMongoClient(): Promise<MongoClient> {
  if (!globalForMongo.portfolioMongoClient) {
    globalForMongo.portfolioMongoClient = connect().catch((error) => {
      // Do not cache a failed connection; the next request can retry.
      delete globalForMongo.portfolioMongoClient;
      throw error;
    });
  }
  return globalForMongo.portfolioMongoClient;
}

export async function getMongoDb() {
  const client = await getMongoClient();
  return client.db();
}
