import dotenv from 'dotenv';
import express from 'express';
import mongo from '../MongoDB.mjs';
import { ObjectId } from 'mongodb';
dotenv.config();
const router = express.Router();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));
// Apply sanitizer to all routes

// MongoDB connection
let db;
(async () => {
  try {
    db = await mongo();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
})();

// ==========================================
// SAZIN VALVES - GET ROUTERS
// ==========================================

// Get Hero Section
router.get('/get-hero', async (req, res) => {
  try {
    // সবচেয়ে নতুন যে ডকুমেন্ট আছে সেটা নিবে (ওয়ান-টাইম সেটআপ এর জন্য)
    const hero = await db.collection('sazin_hero').findOne({}, { sort: { createdAt: -1 } });
    if (!hero) {
      return res.status(404).json({ message: "Hero data not found" });
    }
    res.status(200).json(hero);
  } catch (error) {
    console.error('Error fetching hero:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get About Section
router.get('/get-about', async (req, res) => {
  try {
    const about = await db.collection('sazin_about').findOne({}, { sort: { createdAt: -1 } });
    if (!about) {
      return res.status(404).json({ message: "About data not found" });
    }
    res.status(200).json({ok:true, data: about });
  } catch (error) {
    console.error('Error fetching about:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get Strengths Section
router.get('/get-strengths', async (req, res) => {
  try {
    const strengths = await db.collection('sazin_strengths').findOne({}, { sort: { createdAt: -1 } });
    if (!strengths) {
      return res.status(404).json({ message: "Strengths data not found" });
    }
    res.status(200).json(strengths);
  } catch (error) {
    console.error('Error fetching strengths:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get All Valves/Products (Dashboard বা List Page এর জন্য)
// Get Valves with Pagination & Search
router.get('/get-valves', async (req, res) => {
  try {
    // ১. Query Params থেকে ডাটা নেওয়া
    const search = (req.query.search || "").trim();
    const feature = (req.query.feature || "").trim(); // feature filter (যদি থাকে)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // প্রতি পেজে কয়টি প্রোডাক্ট দেখাবে
    
    // ২. Search Filter তৈরি (Name বা Category এর যেকোনো একটিতে মিললেই আসবে)
    let filter = {};
    if (search) {
      filter = {
        $or: [
          { name: { $regex: search, $options: "i" } }, // 'i' মানে case-insensitive (বড় ছোট হরফ নিয়ে চিন্তা করবে না)
          { category: { $regex: search, $options: "i" } }
        ]
      };
    }
    if (feature) {
      filter = { ...filter, featured:true }; // যদি feature filter থাকে, তাহলে featured:true যুক্ত করা
    }

    // ৩. মোট প্রোডাক্ট কতগুলো আছে তা গুনে নেওয়া (Pagination এর জন্য দরকার)
    const totalItems = await db.collection('sazin_products').countDocuments(filter);
    
    // ৪. প্রয়োজনীয় ডাটা আনা (Skip এবং Limit ব্যবহার করে)
    const valves = await db.collection('sazin_products')
      .find(filter)
      .sort({ createdAt: -1 }) // নতুন প্রোডাক্ট উপরে দেখানোর জন্য
      .skip((page - 1) * limit) // আগের পেজের ডাটা বাদ দেওয়া
      .limit(limit) // নির্দিষ্ট সংখ্যক ডাটা আনা
      .toArray();

    // ৫. ফ্রন্টএন্ডের জন্য প্রয়োজনীয় ডাটা পাঠানো
    res.status(200).json({
      data: valves,                // প্রোডাক্টের অ্যারে
      currentPage: page,          // বর্তমান পেজ নম্বর
      totalPages: Math.ceil(totalItems / limit), // মোট কয়টি পেজ হবে
      totalItems: totalItems      // সার্চ ফিল্টার অনুযায়ী মোট কয়টি আইটেম পাওয়া গেছে
    });

  } catch (error) {
    console.error('Error fetching valves:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get Single Valve/Product (Edit Page এ ডাটা লোড করার জন্য)
router.get('/get-valve/:id', async (req, res) => {
  try {
    const id = req?.params?.id;
    if (!id) return res.status(400).json({ message: "Valve ID is required" });
    if (!new ObjectId(id)) return res.status(400).json({ message: "Invalid Valve ID" });

    const valve = await db.collection('sazin_products').findOne({ _id: new ObjectId(id) });
    
    if (!valve) {
      return res.status(404).json({ message: "Valve not found" });
    }
    
    res.status(200).json(valve);
  } catch (error) {
    console.error('Error fetching single valve:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;