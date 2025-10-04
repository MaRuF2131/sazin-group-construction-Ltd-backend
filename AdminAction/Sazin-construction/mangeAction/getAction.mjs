import express from "express";
import mongo from "../../../MongoDB.mjs";
const router=express.Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));
let db;
(async () => {
  try {
    db = await mongo();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
})();

router.get("/project", async (req, res) => {
  try {
    const { category, isFeature, page = 1, limit = 10 } = req.query;
     
    // filter banano
    let filter = {};
     const ct=["Civil","Electro","Engineering-Procurement","Safe&Security"]
    if (ct.includes(category)) {
      filter.category = category;
    }
    if (isFeature !== undefined) {
      filter.feature = isFeature === "true"; // string -> boolean
    }
    
    // pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // query
    const cursor = await db.collection("project").find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const projects = await cursor.toArray();

    const total = await db.collection("project").countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: projects,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching projects:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/certificate",async(req,res)=>{
  
    try {
    const { page = 1, limit = 10 } = req.query;

    // pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // query
    const cursor = await db.collection("certificate").find({})
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const certificate = await cursor.toArray();

    const total = await db.collection("certificate").countDocuments({});
    
    res.status(200).json({
      success: true,
      data: certificate,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching certificate:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
})
router.get("/achievement",async(req,res)=>{
  
    try {
    const { page = 1, limit = 10 } = req.query;

    // pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // query
    const cursor = await db.collection("achievement").find({})
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const achievement = await cursor.toArray();

    const total = await db.collection("achievement").countDocuments({});
    
    res.status(200).json({
      success: true,
      data: achievement,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching achievement:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
})

export default router;