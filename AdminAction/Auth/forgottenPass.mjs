import dotenv from 'dotenv';
import express from 'express';
import mongo from '../../MongoDB.mjs';
import CryptoJS from "crypto-js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { upload } from '../../utils/uploadConfig.mjs';
import { adminStatus } from '../../utils/adminStatus.mjs';
import {
  isSafeString,
  isValidEmail,
  looksSafeForMongo,
  runValidations,
  sanitizeMiddleware,
} from '../../utils/validationCheck.mjs';
import { mailSender } from '../../utils/mailSender.mjs';

dotenv.config();
const router = express.Router();
const secretKey = process.env.ENC;
const decryptKey = process.env.DEC;

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Apply sanitizer to all routes
router.use(
  sanitizeMiddleware({
    maxStringLength: 5000,
    removeEmpty: true,
    allowedKeysRegex: /^[a-zA-Z0-9_-]+$/,
  })
);

// 🧠 MongoDB connection
let db;
(async () => {
  try {
    db = await mongo();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
})();


// 🔐 AES Encryption Helpers
const encryptData = (data) => {
  return CryptoJS.AES.encrypt(data, secretKey).toString();
};
const decryptData = (ciphertext, key) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Generate Secure OTP
function generateOtp(digits = 6) {
  const n = crypto.randomInt(0, 10 ** digits);
  return String(n).padStart(digits, "0");
}

// STEP 1 — REQUEST OTP FOR PASSWORD RESET

router.post("/forgottenPass/request", upload.none(), async (req, res) => {
  try {
    const field = ["email"];
    const encryptedData = Object.fromEntries(
      Object.entries(req.body)
        .filter(([key]) => field.includes(key))
        .map(([key, value]) => [key, value])
    );
    
    const missingFields = field.filter((f) => !(f in encryptedData));
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing fields: ${missingFields.join(", ")}` });
    }

    const decryptedData = Object.fromEntries(
      Object.entries(encryptedData).map(([key, value]) => [
        key,
        decryptData(value, decryptKey),
      ])
    );

    if (!looksSafeForMongo(decryptedData)) {
      return res.status(400).json({ message: "Unsafe data for MongoDB" });
    }

    const validations = {
      email: [[(v) => isValidEmail(v), "Invalid email"]],
    };
    const { isValid, errors } = runValidations(validations, decryptedData);
    if (!isValid) return res.status(400).json({ message: errors });

    const emailHash = CryptoJS.SHA256(decryptedData.email).toString(CryptoJS.enc.Hex);

    const user = await adminStatus(emailHash, "active", { projection: { email: 1 } });

    if (!user) {
      return res.status(404).json({ success: false, message: "Active admin not found" });
    }

    // Generate and hash OTP
    const otp = generateOtp(6);
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes

    await db.collection("password_otps").insertOne({
      emailHash,
      otpHash,
      expiresAt,
      used: false,
      createdAt: new Date(),
      attempts: 0,
    });

    // You can replace this console.log with email sending
    console.log(` OTP for ${decryptedData.email}: ${otp}`);
    const transporter=await mailSender()
    if(transporter){
                 // ✅ 1. Mail to site owner (you)
     /*            const adminMail = {
                  from: process.env.EMAIL_USER, // ✅ Use your own email here
                  to: process.env.TO_EMAIL,
                  subject: `Contact Form: ${subject}`,
                  text: `You received a message from your website:\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
                }; */

              // ✅ 2. Send OTP email
     const sendCode = {
       from: process.env.EMAIL_USER,
       to: decryptedData.email,
       subject: "Your One-Time Password (OTP) for Password Reset",
       text: `Hi ${decryptedData.email},We received a request to reset your password.🔐 Your One-Time Password (OTP) is:👉 ${otp}

Please enter this code in the app to reset your password.This OTP will expire in 5 minutes.

If you did not request a password reset, please ignore this email.

              — Best regards,
              Your Security Team
              `,
              };
          try {
            /* await transporter.sendMail(adminMail); */
            await transporter.sendMail(sendCode);
            console.log("Mail sent successfully");
                res.status(200).json({
                  success: true,
                  message: "OTP sent successfully (check your email)",
                });
          } catch (error) {
            console.error("Mail sending failed:", error.message);
            console.error("Error details:", error);
            return res.status(400).json({ message: "failed to send OTP to your email , Try again leter" })
            
          }
    }else{
        return res.status(400).json({ message: "failed to send OTP to your email , Try again leter" })
    }

  } catch (error) {
    console.error("OTP Request Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

//  STEP 2 — VERIFY OTP & RESET PASSWORD
router.post("/forgottenPass/verify", upload.none(), async (req, res) => {
  try {
    const field = ["email", "otp", "newpassword"];
    const encryptedData = Object.fromEntries(
      Object.entries(req.body)
        .filter(([key]) => field.includes(key))
        .map(([key, value]) => [key, value])
    );

    const missingFields = field.filter((f) => !(f in encryptedData));
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing fields: ${missingFields.join(", ")}` });
    }

    const decryptedData = Object.fromEntries(
      Object.entries(encryptedData).map(([key, value]) => [
        key,
        decryptData(value, decryptKey),
      ])
    );

    if (!looksSafeForMongo(decryptedData)) {
      return res.status(400).json({ message: "Unsafe data for MongoDB" });
    }

    const validations = {
      email: [[(v) => isValidEmail(v), "Invalid email"]],
      otp: [[(v) => /^\d{6}$/.test(v), "Invalid OTP format"]],
      newpassword:[[(v) =>isSafeString(v), "Invalid Password format"]],
    };
    const { isValid, errors } = runValidations(validations, decryptedData);
    if (!isValid) return res.status(400).json({ message: errors });

    const emailHash = CryptoJS.SHA256(decryptedData.email).toString(CryptoJS.enc.Hex);

    //  Find unused OTP record
    const record = await db.collection("password_otps").findOne(
      { emailHash, used: false },
      { sort: { createdAt: -1 } }
    );

    if (!record) {
      return res.status(400).json({ success: false, message: "No valid OTP found" });
    }

    if (new Date() > record.expiresAt) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (record.attempts >= 5) {
      return res.status(429).json({ success: false, message: "Too many attempts" });
    }

    const match = await bcrypt.compare(decryptedData.otp, record.otpHash);
    if (!match) {
      await db.collection("password_otps").updateOne(
        { _id: record._id },
        { $inc: { attempts: 1 } }
      );
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    //  OTP verified — mark used
    await db.collection("password_otps").updateOne(
      { _id: record._id },
      { $set: { used: true } }
    );

    //  Encrypt and update new password
    const encryptedPass = encryptData(encryptedData.newpassword, secretKey);

    const result = await db.collection("register").updateOne(
      { email: emailHash, status: "active" },
      { $set: { password: encryptedPass } }
    );

    if (result.matchedCount === 0) {
      return res.status(400).json({ success: false, message: "Failed to change password" });
    }

    res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
