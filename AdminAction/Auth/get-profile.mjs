import dotenv from 'dotenv';
import express from 'express';
import mongo from '../../MongoDB.mjs';
import CryptoJS from "crypto-js";

import verifyJWT from '../../utils/VerifyJWT.mjs';
import { ObjectId } from 'mongodb';
dotenv.config();
const router = express.Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

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
    req.emailHash = emailHash;
  next();
});

router.get("/profile", async (req, res) => {
  try {
    
    const emailHash = req.emailHash;
    const userId = req.query.uid;

    const user = await db.collection('register').findOne({ email: emailHash, _id: new ObjectId(userId), status: "active" }, { projection: { password: 0, __v: 0 } });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    user.email=CryptoJS.AES.encrypt(req?.user?.userEmail, process.env.DEC).toString();
    user.name=CryptoJS.AES.decrypt(user?.name, process.env.ENC).toString(CryptoJS.enc.Utf8);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
export default router;