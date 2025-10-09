import dotenv from 'dotenv';
import express from 'express';
import mongo from '../../MongoDB.mjs';
import CryptoJS from "crypto-js";
import { 
  isValidEmail,
  sanitizeMiddleware,
 } from '../../utils/validationCheck.mjs';
import verifyJWT from '../../utils/VerifyJWT.mjs';
import { adminStatus } from '../../utils/adminStatus.mjs';
import { ObjectId } from 'mongodb';
dotenv.config();
const router = express.Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));
// Apply sanitizer to all routes
router.use(sanitizeMiddleware({
  maxStringLength: 5000,
  removeEmpty: true,
  allowedKeysRegex: /^[a-zA-Z0-9_-]+$/, // 🔒 key নাম safe হবে শুধু
}));

// MongoDB connection
let db;
(async () => {
  try {
    db = await mongo();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
})();

router.use(verifyJWT);
router.use(async (req, res, next) => {
try{
  const emailHash = CryptoJS.SHA256(req?.user?.userEmail).toString(CryptoJS.enc.Hex);
    const existingUser = await adminStatus(emailHash, "active");
    if (!existingUser) {     
      return res.status(400).json({ message: "Active admin not found with this email" });
    }
    req.emailHash = emailHash;
  next();
  }catch(err){
    console.error('Middleware error:', err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/manage-admin", async (req, res) => {
  try {    
    const allAdmins = await db.collection('register').find({ email: { $ne: req.emailHash } }, { projection: { password: 0, __v: 0 } }).toArray();
        allAdmins.forEach(admin => {
          admin.eem = CryptoJS.AES.decrypt(admin?.eem, process.env.ENC).toString(CryptoJS.enc.Utf8);
          admin.name = CryptoJS.AES.decrypt(admin?.name, process.env.ENC).toString(CryptoJS.enc.Utf8);
    });
    res.status(200).json({ admins: allAdmins });
  } catch (error) {
    console.error('Error fetching admin data:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/manage-admin",async (req,res)=>{
    try {
        const { uid,email,status} = req.body;
        if (!uid || ! ObjectId.isValid(uid) || !email || !status) {
            return res.status(400).json({ message: "All fields are required" });
        }

       const dcryptEmail=CryptoJS.AES.decrypt(email, process.env.DEC).toString(CryptoJS.enc.Utf8);

        if(!isValidEmail(dcryptEmail)){
            return res.status(400).json({ message: "Invalid email format" });
        }
        if(!["active","reject"].includes(status)){
            return res.status(400).json({ message: "Invalid status value" });
        }
         
       const emailHash=CryptoJS.SHA256(dcryptEmail).toString(CryptoJS.enc.Hex);
       const updateResult = await db.collection('register').updateOne(
        { _id: new ObjectId(uid), email: emailHash  },
        { $set:{status:status}}
       )
       if(updateResult.matchedCount===0){
        return res.status(404).json({ message: "Admin not found" });
       }
       res.status(200).json({ message: "Admin status updated successfully" });
    }
    catch (error) {
        console.error('Error adding new admin:', error);
        res.status(500).json({ message: "Internal server error" });
    }
})

router.delete("/manage-admin", async (req, res) => {
  try {
    const userId = req?.query?.uid;
    if(!userId || ! ObjectId.isValid(userId)){
        return res.status(400).json({ message: "Invalid user ID" });
    }
    const deletionResult = await db.collection('register').findOneAndDelete({ _id: new ObjectId(userId), email: { $ne: req.emailHash }},{projection: { imagePublicId: 1 }, returnDocument: "before" } );
    if (deletionResult.deletedCount === 0) {
      return res.status(404).json({ message: "Admin not found or cannot delete own account" });
    }
} catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});
export default router;