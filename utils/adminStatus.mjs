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

 export const adminStatus = async (emailHash,status,projection={projection :{ password: 0, __v: 0 }}) => {
    // Check if user already exists using emailHash
    const existingUser = await db.collection("register").findOne({ email: emailHash, status: status },projection);
    return existingUser;
 }
