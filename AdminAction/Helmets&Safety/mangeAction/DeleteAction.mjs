import dotenv from "dotenv";
import express from "express";
import mongo from "../../../MongoDB.mjs";
import CryptoJS from "crypto-js";
import verifyJWT from "../../../utils/VerifyJWT.mjs";
import { adminStatus } from "../../../utils/adminStatus.mjs";
import { ObjectId } from "mongodb";
import { deleteFromCloudinary } from "../../../utils/CDN/cloudinaryUpload.mjs"; 
dotenv.config();

const router = express.Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// -------------------- MongoDB connection --------------------
let db;
(async () => {
  try {
    db = await mongo();
    console.log("✅ MongoDB connected for delete routes");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
})();

// -------------------- Auth Middleware --------------------
router.use(verifyJWT);
router.use(async (req, res, next) => {
  try {
    const emailHash = CryptoJS.SHA256(req?.user?.userEmail).toString(CryptoJS.enc.Hex);
    const existingUser = await adminStatus(emailHash, "active");
    if (!existingUser) {
      return res.status(403).json({ message: "Unauthorized or inactive admin" });
    }
    next();
  } catch (err) {
    console.error("❌ Middleware error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// -------------------- Helper Functions --------------------

//  ObjectId checker
const validateId = (id) => ObjectId.isValid(id) && typeof id === "string";

// 🔹 Reusable delete logic
const deleteHandler = (collection, options = { hasImage: false }) => {
  return async (req, res) => {
    try {
      const id = req.query.id;
      console.log("id",id);
      
      if (!id) return res.status(400).json({ message: "ID is required" });
      if (!validateId(id)) return res.status(400).json({ message: "Invalid ID format" });

      const _id = new ObjectId(id);

      // যদি ইমেজ থাকে, তাহলে imagePublicId বের করার জন্য findOneAndDelete ব্যবহার করা হবে
      const doc = options.hasImage
        ? await db.collection(collection).findOneAndDelete(
            { _id },
            { projection: { imagePublicId: 1 }, returnDocument: "before" }
          )
        : await db.collection(collection).deleteOne({ _id });
       console.log("doc",doc);
       
      // ফলাফল চেক
      const deleted =
        options.hasImage && doc.imagePublicId ? true : doc.deletedCount && doc.deletedCount > 0;
      if (!deleted) {
        return res.status(404).json({ message: `${collection} not found` });
      }

      // Cloudinary থেকে ইমেজ ডিলিট
      if (options.hasImage && doc?.imagePublicId) {
        try {
          await deleteFromCloudinary(doc?.imagePublicId);
          console.log(`🗑️ Cloudinary image deleted for ${collection}:`, doc?.imagePublicId);
        } catch (cloudErr) {
          console.error("⚠️ Cloudinary delete error:", cloudErr.message);
        }
      }

      res.status(200).json({
        message: `${collection} deleted successfully`,
        id,
      });
    } catch (error) {
      console.error(`❌ Error deleting ${collection}:`, error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

// -------------------- Routes --------------------

router.delete("/delete-product/", deleteHandler("product", { hasImage: true }));

export default router;
