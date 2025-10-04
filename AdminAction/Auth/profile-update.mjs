import dotenv from 'dotenv';
import express from 'express';
import mongo from '../../MongoDB.mjs';
import CryptoJS from "crypto-js";
import { upload } from '../../utils/uploadConfig.mjs';
import { fileCheck } from '../../utils/filecheck.mjs';
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
dotenv.config();
const router = express.Router();
const secretKey = process.env.ENC;
const decryptKey = process.env.DEC;

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
/* router.use(async (req, res, next) => {
  const emailHash = CryptoJS.SHA256(req?.user?.userEmail).toString(CryptoJS.enc.Hex);
  // Check if user already exists using emailHash
    const existingUser = await adminStatus(emailHash, "active");
    if (!existingUser) {
      return res.status(400).json({ message: "Active admin not found with this email" });
    }
    req.emailHash = emailHash;
  next();
}); */

// Encryption function
    const encryptData = (data) => {
        return CryptoJS.AES.encrypt(data, secretKey).toString();
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
        .filter(([key, value]) => {
          if (field.includes(key)) return true; 
        })
        .map(([key, value]) => [key, value])
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
     
    console.log("Decrypted Data:", decryptedData);
    
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

    // 🔹 Create email hash for duplicate check
    const emailHash = CryptoJS.SHA256(decryptedData?.email).toString(CryptoJS.enc.Hex);

    // Add emailHash to data before inserting
    req.emailHash = emailHash;
    req.encryptedData = encryptedData;
    next();
  } catch (error) {
    console.log(error); 
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// Profile Update API
router.post("/profile-update",upload.single('image'), Handler, fileCheck("profile"),async (req, res) => {
  try {
    const encryptedData = req.encryptedData;  
    // Handle image upload
    if (req.imageData && req.imageData.secure_url) {
      console.log('Image uploaded:', req.imageData.secure_url);
      encryptedData.imageUrl = req.imageData.secure_url;
      encryptedData.imagePublicId = req.imageData.public_id;
    } else {
        // Default profile image
        encryptedData.imageUrl = "https://yourdomain.com/default-profile.png"; // এখানে default URL দিন
        encryptedData.imagePublicId = null; // কোনো public_id নেই
      }

    // Update user
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
    res.status(200).json({ success: true, message: "Profile update successful"});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;