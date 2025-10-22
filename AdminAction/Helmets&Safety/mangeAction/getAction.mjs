import express from "express";
import mongo from "../../../MongoDB.mjs";
import CryptoJS from "crypto-js";
import verifyJWT from "../../../utils/VerifyJWT.mjs";
import { adminStatus } from "../../../utils/adminStatus.mjs";

const router = express.Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// -------------------- MongoDB connection --------------------
let db;
(async () => {
  try {
    db = await mongo();
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
})();

// -------------------- Admin verification middleware --------------------
router.use(verifyJWT);
router.use(async (req, res, next) => {
  try {
    const emailHash = CryptoJS.SHA256(req?.user?.userEmail).toString(CryptoJS.enc.Hex);
    const existingUser = await adminStatus(emailHash, "active");
    if (!existingUser) {
      return res.status(403).json({ message: "Unauthorized or inactive admin" });
    }
    req.emailHash = emailHash;
    next();
  } catch (err) {
    console.error("❌ Middleware error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// -------------------- Generic Pagination Helper --------------------
const fetchData = async (collectionName, req, res, options = {}) => {
  try {

    const { page = 1, limit = 10, category, isFeature } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    // Optional filters (for product collection)
    if (collectionName === "product") {
      const allowedCategories = [
        "Welding Helmets & Gloves",
        "Fall Protection Harness",
        "Coveralls / Suits",
        "Respirators / Masks",
        "High-Visibility Safety Vests",
        "Safety Shoes / Gumboots",
        "Safety Gloves",
        "Ear Plugs / Ear Muffs",
        "Safety Goggles / Face Shields",
        "Safety Helmets (Hard Hats)",
        "Half Face",
        "Open Face",
        "Modular Face",
        "Full Face"
    ];
      if (allowedCategories.includes(category)) filter.category = category;
      if (isFeature !== undefined) filter.isFeature = isFeature === "true";
    }

    const collection = db.collection(collectionName);

    const [data, total] = await Promise.all([
      collection.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }).toArray(),
      collection.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(`❌ Error fetching ${collectionName}:`, error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// All routes handled with same fetcher
router.get("/product", (req, res) => fetchData("product", req, res));

export default router;
