import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';
dotenv.config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;
const mongo = async () => {
  try {
    if (db) return db;
    /* await client.connect(); */
    db = client.db('sazin-construction');
    // Ensure the collection is created
    // Optional: Create index
    // await db.collection('users').createIndex({ email: 1 }, { unique: true });
    console.log('✅ MongoDB connected');
    return db;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
};
export default mongo;
