// MongoDB connection
import mongo from "../MongoDB.mjs";
let db;
(async () => {
  try {
    db = await mongo();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
})();

 export const adminStatus = async (emailHash,status) => {
    // Check if user already exists using emailHash
    const existingUser = await db.collection("register").findOne({ email: emailHash, status: status } );
    return existingUser;
 }
