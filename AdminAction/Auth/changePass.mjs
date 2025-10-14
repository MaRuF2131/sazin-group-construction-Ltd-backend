import dotenv from 'dotenv';
import express from 'express';
import mongo from '../../MongoDB.mjs';
import CryptoJS from "crypto-js";
import { upload } from '../../utils/uploadConfig.mjs';
import { adminStatus } from '../../utils/adminStatus.mjs';
import { 
  isSafeString,
  isValidEmail,
  looksSafeForMongo,
  runValidations,
  sanitizeMiddleware,
 } from '../../utils/validationCheck.mjs';
import verifyJWT from '../../utils/VerifyJWT.mjs';
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

  // Encryption function
    const encryptData = (data) => {
        return CryptoJS.AES.encrypt(data, secretKey).toString();
    };

    const decryptData = (ciphertext, Key) => {
      const bytes = CryptoJS.AES.decrypt(ciphertext, Key);
      return bytes.toString(CryptoJS.enc.Utf8);
    };
// Login API
router.post("/changePass",upload.none(),async (req, res) => {
  try {
      const field=["email","password","newpassword"]
          const encryptedData = Object.fromEntries(
            Object.entries(req.body)
              .filter(([key, value]) => {
                if ( field.includes(key)) return true; 
              })
              .map(([key, value]) => [key, value])
            ); 

            const missingFields = field.filter(f => !(f in encryptedData));
            if (missingFields.length > 0) {
              return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
            }
          
            // Decrypt each field
            const decryptedData = Object.fromEntries(Object.entries(encryptedData).map(([key, value]) => {
              const decryptedValue = decryptData(value, decryptKey);
              return [key, decryptedValue];
            }));

            // ✅ Mongo safety check
            if (!looksSafeForMongo(decryptedData)) {
              return res.status(400).json({ message: "Unsafe data for MongoDB" });
            }

          // validation rules (title, description ইত্যাদি)
          const validations = {
            email: [[(v) => isValidEmail(v), "Invalid email"]],
            password: [[(v) => isSafeString(v, { max: 2000 }), "Invalid password"]],
            newpassword: [[(v) => isSafeString(v, { max: 2000 }), "Invalid password"]],

          };

         const { isValid, errors } = runValidations(validations, decryptedData);

          if (!isValid) {
            return res.status(400).json({ message: errors });
          }
          
          // 🔹 Create email hash for duplicate check
          const emailHash = CryptoJS.SHA256(decryptedData.email).toString(CryptoJS.enc.Hex);        
          if(emailHash!=req.emailHash){
              return res.status(401).json({ success: false, message: "Only send your own email" });
          }
          
          // এখানে তুমি database দিয়ে username/password check করবে
          let user=await adminStatus(emailHash,"active",{projection :{ password: 1,  email: 1 }});

          if (!user) {
            console.log("❌ Active admin not found for email :", emailHash);
            return res.status(401).json({ success: false, message: "active admin not found with this email" });
          }
          // Decrypt the stored password before comparison
          const decryptedPassword = decryptData(decryptData(user?.password, secretKey), decryptKey);
          if (decryptedPassword !== decryptedData.password) {
            console.log("❌ Password mismatch for user ID:", user._id,decryptedData);
            return res.status(401).json({ success: false, message: "Invalid credentials" });
          }
          const pass=encryptData(encryptedData?.newpassword,secretKey)
          let result = await db.collection("register").updateOne({
                    email: emailHash,
                    status: "active"
                    }, {
                    $set: {
                        password:pass
                    }
                    });
        if (result?.matchedCount === 0) {
          return res.status(401).json({ success: false, message: "Faild to change password" });
        }
    // Success
    res.status(200).json({ success: true, message: "Successfully change password"});
  } catch (error) {
    console.log(error); 
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;