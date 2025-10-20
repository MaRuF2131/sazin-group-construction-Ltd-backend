import dotenv from 'dotenv';
import express from 'express';
import mongo from '../../MongoDB.mjs';
import CryptoJS from "crypto-js";
import { upload } from '../../utils/uploadConfig.mjs';
import { fileCheck } from '../../utils/filecheck.mjs';
import jwt from 'jsonwebtoken';
import { 
  isSafeString,
  isValidDate,
  isValidEmail,
  isValidPhone,
  isValidUrl,
  looksSafeForMongo,
  runValidations,
  sanitizeMiddleware,
 } from '../../utils/validationCheck.mjs';
import verifyJWT from '../../utils/VerifyJWT.mjs';
import { adminStatus } from '../../utils/adminStatus.mjs';
import { deleteFromCloudinary } from '../../utils/CDN/cloudinaryUpload.mjs';
dotenv.config();
const router = express.Router();
const secretKey = process.env.ENC;
const decryptKey = process.env.DEC;
const jwtSecret = process.env.JWT_SECRET;

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
  const emailHash = CryptoJS.SHA256(req?.user?.userEmail).toString(CryptoJS.enc.Hex);
    const existingUser = await adminStatus(emailHash, "active");
    if (!existingUser) {
      return res.status(400).json({ message: "Active admin not found with this email" });
    }
    req.imageUrl=existingUser?.imageUrl || "";
    req.emailHash = emailHash;
  next();
});

// Encryption function
    const encryptData = (data, Key=secretKey) => {
        return CryptoJS.AES.encrypt(data, Key).toString();
    };

    const decryptData = (ciphertext, Key) => {
    const bytes = CryptoJS.AES.decrypt(ciphertext, Key);
    return bytes.toString(CryptoJS.enc.Utf8);
    };

const  Handler = async(req, res, next) => {
  try {
     // bot submission check
    if(req?.body?.id !=="MSTTAMANNAAKTERTOMA"){
          return res.status(401).json({ message: "bot submission detected" });
        }

    const field=["name","email","phone","position","department","company","location","joinDate","bio","linkedin","twitter"]
    const encryptedData = Object.fromEntries(
      Object.entries(req.body)
        .filter(([key,value]) => {
          if (field.includes(key)) return true; 
        })
        .map(([key,value]) => [key,value])
    );

    const missingFields = field.filter(f => !(f in encryptedData));
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
    }

    const decryptField=["name","email"]

    // Decrypt each field
    const decryptedData = Object.fromEntries(Object.entries(encryptedData).map(([key, value]) => {
      if (decryptField.includes(key)) {
        const decryptedValue = decryptData(value, decryptKey);
        return [key, decryptedValue];
      }
      return [key, value];
    }));

    if(req?.user?.userEmail !== decryptedData?.email){
      return res.status(401).json({ message: "Unauthorized: Email mismatch" });
    }

    // Mongo safety check
    if (!looksSafeForMongo(decryptedData)) {
      return res.status(400).json({ message: "Unsafe data for MongoDB" });
    }
     
    
    // Validation
    const validations = {
      name: [[(v) => isSafeString(v, { max: 2000 }), "Invalid name"]],
      email: [[(v) => isValidEmail(v), "Invalid email"]],
      phone: [[(v) => isValidPhone(v), "Invalid phone number"]],
      position: [[(v) => isSafeString(v, { max: 200 }), "Invalid position"]],
      department: [[(v) => isSafeString(v, { max: 200 }), "Invalid department"]],
      company: [[(v) => isSafeString(v, { max: 200 }), "Invalid company"]],
      location: [[(v) => isSafeString(v, { max: 200 }), "Invalid location"]],
      joinDate: [[(v) => isValidDate(v), "Invalid join date"]],
      bio: [[(v) => isSafeString(v, { max: 2000 }), "Invalid bio"]],
      linkedin: [[(v) => isValidUrl(v), "Invalid linkedin URL"]],
      twitter: [[(v) => isValidUrl(v), "Invalid twitter URL"]],
    };

    const { isValid, errors } = runValidations(validations, decryptedData);
    if (!isValid) return res.status(400).json({ message: errors });

    // Encrypt sensitive fields before storing
      const enc = encryptData(encryptedData?.name);
      encryptedData.name = enc;
      encryptedData.eem=encryptData(encryptedData?.email);
      delete encryptedData.email; // Remove email from data to be stored
      req.encryptedData = encryptedData;
    next();
  } catch (error) {
    console.log(error); 
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// Profile Update API
router.post("/profile-update",upload.single('profileImageFile'), Handler, fileCheck("profile"),async (req, res) => {
  try {
    
    const encryptedData = req.encryptedData;  
    // Handle image upload
    if (req.imageData && req.imageData.secure_url) {
      console.log('Image uploaded:', req.imageData.secure_url);
      encryptedData.imageUrl = req.imageData.secure_url;
      encryptedData.imagePublicId = req.imageData.public_id;
      const result = await db.collection('register').findOneAndUpdate(
          {       
          email: req?.emailHash,
          status: "active" 
          }, 
          { $set:encryptedData },
          {projection: { imagePublicId: 1 }, returnDocument: "before" });
          if(!result){
            return res.status(404).json({ message: "admin not found" });
          }
          if(result?.imagePublicId){
            try {
              await deleteFromCloudinary(result?.imagePublicId);
              console.log(`🗑️ Cloudinary image deleted for profile:`, result?.imagePublicId);
            } catch (cloudErr) {
              console.error("⚠️ Cloudinary delete error:", cloudErr.message);
            }
          }
    }else{
        let result = await db.collection("register").updateOne({
          email: req?.emailHash,
          status: "active"
        }, {
          $set: {
            ...encryptedData,
          }
        });

        if (result?.matchedCount === 0) {
          return res.status(401).json({ success: false, message: "active admin not found with this email" });
        }
     }
    // Generate new JWT
     const username=decryptData(encryptedData?.name, secretKey);
     const userEmail=encryptData(req?.user?.userEmail, decryptKey);

       const token = jwt.sign(
             { uid: req?.user?.uid, username: username, userEmail: userEmail },
               jwtSecret,
             { expiresIn: "7d" }
            );
    
            const firebaseUser = {
            uid: req?.user?.uid,
            username: username,
            photoURL: encryptedData?.imageUrl || req?.imageUrl || "",
            email: userEmail,
            token: token,
            createdAt:new Date(),
            };
    
            // Set cookie
            res.cookie("token", token, {
                  httpOnly: true,
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: 'strict',
                  path: '/',
                  maxAge: 7 * 24 * 60 * 60 * 1000
            });

    res.status(200).json({ success: true, message: "Profile update successful",user: { ...firebaseUser } });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;