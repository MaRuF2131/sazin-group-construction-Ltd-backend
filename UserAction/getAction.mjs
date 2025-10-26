import express from "express";
import mongo from "../MongoDB.mjs";
import { ObjectId } from "mongodb";

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


// -------------------- Generic Pagination Helper --------------------
const fetchData = async (collectionName, req, res, options = {}) => {
  try {
    const { page = 1, limit = 10, category, isFeature } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    // Optional filters (for project collection)
    if (collectionName === "project") {
      const allowedCategories = ["Civil","Electro","Engineering-Procurement","Safe&Security","NHA","PGCB","PWD","Agro","BPC", "EED", "LGED"];
      if (allowedCategories.includes(category)) filter.category = category;
      if (isFeature !== undefined) filter.feature = isFeature === "true";
    }

    const collection = db.collection(collectionName);

    const [data, total] = await Promise.all([
      collection.find(filter).skip(skip).limit(parseInt(limit)).sort({ postedAt: -1 }).toArray(),
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
// ✅ Get project by ID
router.get("/projectById/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    const collection = db.collection("project");

    // 🔹 Convert string ID → ObjectId
    const project = await collection.findOne({ _id: new ObjectId(id) });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // ✅ Success
    res.status(200).json({
      success: true,
      message: "Project fetched successfully",
      data: project,
    });
  } catch (error) {
    console.error("Error fetching project by ID:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});
router.get("/project", (req, res) => fetchData("project", req, res));
router.get("/certificate", (req, res) => fetchData("certificate", req, res));
router.get("/achievement", (req, res) => fetchData("achievement", req, res));
router.get("/client", (req, res) => fetchData("clients", req, res));
router.get("/news", (req, res) => fetchData("news", req, res));
router.get("/service", (req, res) => fetchData("services", req, res));
router.get("/equipment", (req, res) => fetchData("equipment", req, res));
router.get("/jobs", (req, res) => fetchData("jobs", req, res));

// ----- this for products

const fetchProduct = async (collectionName, req, res, options = {}) => {
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
      if (isFeature !== undefined) filter.isFeatured = isFeature === "true";
    }

    const collection = db.collection(collectionName);

    const [data, total] = await Promise.all([
      collection.find(filter).skip(skip).limit(parseInt(limit)).sort({ postedAt: -1 }).toArray(),
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
router.get("/product", (req, res) => fetchProduct("product", req, res));

// ----- new route for products by category -----
router.get("/product/category", async (req, res) => {
  try {
    const collection = db.collection("product");

    // 🔹 Aggregate দিয়ে unique category থেকে একটা করে latest product আনো
    const categoryProducts = await collection
      .aggregate([
        {
          $sort: { postedAt: -1 } // আগে sort করো latest অনুযায়ী
        },
        {
          $group: {
            _id: "$category", // প্রতিটি category একবার
            product: { $first: "$$ROOT" }, // ঐ category এর প্রথম product
          },
        },
        {
          $replaceRoot: { newRoot: "$product" } // শুধু product ফেরত দাও
        },
        {
          $project: { // শুধু দরকারি ফিল্ডগুলো রাখো
            _id: 1,
            category: 1,
            imageUrl: 1,
          },
        },
      ])
      .toArray();

    res.status(200).json({
      success: true,
      data: categoryProducts,
      pagination: {
        page: 1,
        limit:1,
        totalPages:1,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching products by category:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching category products",
    });
  }
});



export default router;
