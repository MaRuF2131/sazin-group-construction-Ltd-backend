import dotenv from 'dotenv';
import express from 'express';
import { upload } from '../../utils/uploadConfig.mjs';
import { fileCheck } from '../../utils/filecheck.mjs';
import mongo from '../../MongoDB.mjs';
import CryptoJS from "crypto-js";
import verifyJWT from '../../utils/VerifyJWT.mjs';
import { adminStatus } from '../../utils/adminStatus.mjs';
import { 
  isSafeString,
  isValidDate,
  isValidNumber,
  looksSafeForMongo,
  runValidations,
  sanitizeMiddleware,
 } from '../../utils/validationCheck.mjs';
import { ObjectId } from 'mongodb';
import { deleteFromCloudinary } from '../../utils/CDN/cloudinaryUpload.mjs';
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

// ==========================================
// SAZIN VALVES - UPDATE ROUTES
// ==========================================

// 1. Hero Section Update Handler
const handleHeroUpdate = async (req, res, next) => {
  try {
    const id = req?.params?.id;
    if (!id) return res.status(400).json({ message: "Hero ID is required" });
    if (!new ObjectId(id)) return res.status(400).json({ message: "Invalid Hero ID" });

    const heroData = req.body;
    const field = ["badge", "title", "subtitle", "cta", "stats"];
    
    const missingFields = field.filter(f => !(f in heroData));
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
    }
    const extraFields = Object.keys(heroData).filter(key => !field.includes(key));
    if (extraFields.length > 0) {
      return res.status(400).json({ message: `Unexpected fields: ${extraFields.join(', ')}` });
    }

    if (!looksSafeForMongo(heroData)) {
      return res.status(400).json({ message: "Unsafe data for MongoDB" });
    }

    const validations = {
      badge: [[(v) => isSafeString(v, { max: 100 }), "Invalid badge"]],
      title: [[(v) => isSafeString(v, { max: 300 }), "Invalid title"]],
      subtitle: [[(v) => isSafeString(v, { max: 5000 }), "Invalid subtitle"]],
      cta: [[(v) => isSafeString(v, { max: 100 }), "Invalid CTA text"]],
    };

    const { isValid, errors } = runValidations(validations, heroData);
    if (!isValid) {
      return res.status(400).json({ message: errors });
    }

    // Stats Array Validation
    if (!Array.isArray(heroData.stats)) {
      return res.status(400).json({ message: "Stats must be an array" });
    }
    heroData.stats.forEach((stat, index) => {
      if (!stat.num || !stat.label) {
        return res.status(400).json({ message: `Missing num or label in stats index ${index}` });
      }
    });

    heroData.updatedAt = new Date();
    req.heroData = heroData;
    next();
  } catch (error) {
    console.error('Error validating hero data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 2. About Section Update Handler
const handleAboutUpdate = async (req, res, next) => {
  try {
    const id = req?.params?.id;
    if (!id) return res.status(400).json({ message: "About ID is required" });
    if (!new ObjectId(id)) return res.status(400).json({ message: "Invalid About ID" });

    const aboutData = req.body;
    const field = ["title", "description", "vision", "mission"];
    
    const missingFields = field.filter(f => !(f in aboutData));
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
    }
    const extraFields = Object.keys(aboutData).filter(key => !field.includes(key));
    if (extraFields.length > 0) {
      return res.status(400).json({ message: `Unexpected fields: ${extraFields.join(', ')}` });
    }

    if (!looksSafeForMongo(aboutData)) {
      return res.status(400).json({ message: "Unsafe data for MongoDB" });
    }

    const validations = {
      title: [[(v) => isSafeString(v, { max: 300 }), "Invalid title"]],
      description: [[(v) => isSafeString(v, { max: 5000 }), "Invalid description"]],
      vision: [[(v) => isSafeString(v, { max: 1000 }), "Invalid vision"]],
      mission: [[(v) => isSafeString(v, { max: 1000 }), "Invalid mission"]],
    };

    const { isValid, errors } = runValidations(validations, aboutData);
    if (!isValid) {
      return res.status(400).json({ message: errors });
    }

    aboutData.updatedAt = new Date();
    req.aboutData = aboutData;
    next();
  } catch (error) {
    console.error('Error validating about data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 3. Strengths Section Update Handler
const handleStrengthsUpdate = async (req, res, next) => {
  try {
    const id = req?.params?.id;
    if (!id) return res.status(400).json({ message: "Strengths ID is required" });
    if (!new ObjectId(id)) return res.status(400).json({ message: "Invalid Strengths ID" });

    const strengthsData = req.body;
    const field = ["strengths"]; // Frontend theke { strengths: [ {icon, text} ] } ashbe
    
    const missingFields = field.filter(f => !(f in strengthsData));
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
    }
    const extraFields = Object.keys(strengthsData).filter(key => !field.includes(key));
    if (extraFields.length > 0) {
      return res.status(400).json({ message: `Unexpected fields: ${extraFields.join(', ')}` });
    }

    if (!looksSafeForMongo(strengthsData)) {
      return res.status(400).json({ message: "Unsafe data for MongoDB" });
    }

    if (!Array.isArray(strengthsData.strengths)) {
      return res.status(400).json({ message: "Strengths must be an array" });
    }

    strengthsData.updatedAt = new Date();
    req.strengthsData = strengthsData;
    next();
  } catch (error) {
    console.error('Error validating strengths data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 4. Valve/Product Update Handler
const handleValveUpdate = async (req, res, next) => {
  try {
    const id = req?.params?.id;
    if (!id) return res.status(400).json({ message: "Valve ID is required" });
    if (!new ObjectId(id)) return res.status(400).json({ message: "Invalid Valve ID" });

    const valveData = req.body;
    delete valveData.image; // Image handle hobe fileCheck middleware e

    const field = ["name", "slug", "category", "shortDesc", "description", "specs", "applications", "compliance", "price", "inStock", "featured", "color"];
    
    const missingFields = field.filter(f => !(f in valveData));
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
    }
    const extraFields = Object.keys(valveData).filter(key => !field.includes(key));
    if (extraFields.length > 0) {
      return res.status(400).json({ message: `Unexpected fields: ${extraFields.join(', ')}` });
    }

    if (!looksSafeForMongo(valveData)) {
      return res.status(400).json({ message: "Unsafe data for MongoDB" });
    }

    const validations = {
      name: [[(v) => isSafeString(v, { max: 300 }), "Invalid valve name"]],
      slug: [[(v) => isSafeString(v, { max: 300 }), "Invalid slug"]],
      category: [[(v) => isSafeString(v, { max: 200 }), "Invalid category"]],
      shortDesc: [[(v) => isSafeString(v, { max: 1000 }), "Invalid short description"]],
      description: [[(v) => isSafeString(v, { max: 5000 }), "Invalid description"]],
      price: [[(v) => isValidNumber(v, 0), "Invalid price"]],
      color: [[(v) => isSafeString(v, { max: 10 }), "Invalid color code"]],
    };

    const { isValid, errors } = runValidations(validations, valveData);
    if (!isValid) {
      return res.status(400).json({ message: errors });
    }

    // Boolean & Number conversions (Frontend theke string e ashe)
    valveData.price = Number(valveData.price);
    if (valveData.inStock === 'true') valveData.inStock = true;
    else valveData.inStock = false;

    if (valveData.featured === 'true') valveData.featured = true;
    else valveData.featured = false;

    // Array Validations
    if (!Array.isArray(valveData.specs)) return res.status(400).json({ message: "Specs must be an array" });
    if (!Array.isArray(valveData.applications)) return res.status(400).json({ message: "Applications must be an array" });
    if (!Array.isArray(valveData.compliance)) return res.status(400).json({ message: "Compliance must be an array" });

    valveData.updatedAt = new Date();
    req.valveData = valveData;
    next();
  } catch (error) {
    console.error('Error validating valve data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// ==========================================
// SAZIN VALVES - ROUTERS
// ==========================================

// Update Hero Section
router.put('/update-hero/:id', upload.none(), handleHeroUpdate, async (req, res) => {
  try {
    const heroData = req.heroData;
    const result = await db.collection('sazin_hero').updateOne(
      { _id: new ObjectId(req.params.id) }, 
      { $set: heroData }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Hero data not found" });
    }
    res.status(200).json({ message: 'Hero updated successfully', heroId: req.params.id });
  } catch (error) {
    console.error('Error updating hero:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update About Section
router.put('/update-about/:id', upload.none(), handleAboutUpdate, async (req, res) => {
  try {
    const aboutData = req.aboutData;
    const result = await db.collection('sazin_about').updateOne(
      { _id: new ObjectId(req.params.id) }, 
      { $set: aboutData }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "About data not found" });
    }
    res.status(200).json({ message: 'About updated successfully', aboutId: req.params.id });
  } catch (error) {
    console.error('Error updating about:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update Strengths Section
router.put('/update-strengths/:id', upload.none(), handleStrengthsUpdate, async (req, res) => {
  try {
    const strengthsData = req.strengthsData;
    const result = await db.collection('sazin_strengths').updateOne(
      { _id: new ObjectId(req.params.id) }, 
      { $set: strengthsData }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Strengths data not found" });
    }
    res.status(200).json({ message: 'Strengths updated successfully', strengthsId: req.params.id });
  } catch (error) {
    console.error('Error updating strengths:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update Valve/Product (Image upload supported)
router.put('/update-valve/:id', upload.single('image'), handleValveUpdate, fileCheck("valve"), async (req, res) => {
  try {
    const valveData = req.valveData;
    
    if (req.imageData && req.imageData.secure_url) {
      valveData.imageUrl = req.imageData.secure_url;
      valveData.imagePublicId = req.imageData.public_id; 

      const result = await db.collection('sazin_products').findOneAndUpdate(
        { _id: new ObjectId(req.params.id) }, 
        { $set: valveData },
        { projection: { imagePublicId: 1 }, returnDocument: "before" }
      );
      
      if (!result) {
        return res.status(404).json({ message: "Valve not found" });
      }
      
      if (result?.imagePublicId) {
        try {
          await deleteFromCloudinary(result?.imagePublicId);
          console.log(`🗑️ Cloudinary image deleted for valve:`, result?.imagePublicId);
        } catch (cloudErr) {
          console.error("⚠️ Cloudinary delete error:", cloudErr.message);
        }
      }
    } else {
      const result = await db.collection('sazin_products').updateOne(
        { _id: new ObjectId(req.params.id) }, 
        { $set: valveData }
      );
      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Valve not found" });
      }
    }

    res.status(200).json({
      message: 'Valve updated successfully',
      valveId: req.params.id,
    });
  } catch (error) {
    console.error('Error updating valve:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// ==========================================
// SAZIN VALVES - CREATE & DELETE HANDLERS
// ==========================================

// 1. Hero Create Handler
const handleHeroCreate = async (req, res, next) => {
  try {
    const heroData = req.body;
    const field = ["badge", "title", "subtitle", "cta", "stats"];
    
    const missingFields = field.filter(f => !(f in heroData));
    if (missingFields.length > 0) return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
    const extraFields = Object.keys(heroData).filter(key => !field.includes(key));
    if (extraFields.length > 0) return res.status(400).json({ message: `Unexpected fields: ${extraFields.join(', ')}` });

    if (!looksSafeForMongo(heroData)) return res.status(400).json({ message: "Unsafe data for MongoDB" });

    const validations = {
      badge: [[(v) => isSafeString(v, { max: 100 }), "Invalid badge"]],
      title: [[(v) => isSafeString(v, { max: 300 }), "Invalid title"]],
      subtitle: [[(v) => isSafeString(v, { max: 5000 }), "Invalid subtitle"]],
      cta: [[(v) => isSafeString(v, { max: 100 }), "Invalid CTA text"]],
    };

    const { isValid, errors } = runValidations(validations, heroData);
    if (!isValid) return res.status(400).json({ message: errors });

    if (!Array.isArray(heroData.stats)) return res.status(400).json({ message: "Stats must be an array" });
    heroData.stats.forEach((stat, index) => {
      if (!stat.num || !stat.label) return res.status(400).json({ message: `Missing num or label in stats index ${index}` });
    });

    heroData.createdAt = new Date();
    req.heroData = heroData;
    next();
  } catch (error) {
    console.error('Error validating hero data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 2. About Create Handler
/* const handleAboutCreate = async (req, res, next) => {
  try {
    const aboutData = req.body;
    const field = ["title", "description", "vision", "mission"];
    
    const missingFields = field.filter(f => !(f in aboutData));
    if (missingFields.length > 0) return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
    const extraFields = Object.keys(aboutData).filter(key => !field.includes(key));
    if (extraFields.length > 0) return res.status(400).json({ message: `Unexpected fields: ${extraFields.join(', ')}` });

    if (!looksSafeForMongo(aboutData)) return res.status(400).json({ message: "Unsafe data for MongoDB" });

    const validations = {
      title: [[(v) => isSafeString(v, { max: 300 }), "Invalid title"]],
      description: [[(v) => isSafeString(v, { max: 5000 }), "Invalid description"]],
      vision: [[(v) => isSafeString(v, { max: 1000 }), "Invalid vision"]],
      mission: [[(v) => isSafeString(v, { max: 1000 }), "Invalid mission"]],
    };

    const { isValid, errors } = runValidations(validations, aboutData);
    if (!isValid) return res.status(400).json({ message: errors });

    aboutData.createdAt = new Date();
    req.aboutData = aboutData;
    next();
  } catch (error) {
    console.error('Error validating about data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}; */

// 3. Strengths Create Handler
const handleStrengthsCreate = async (req, res, next) => {
  try {
    const strengthsData = req.body;
    const field = ["strengths"];
    
    const missingFields = field.filter(f => !(f in strengthsData));
    if (missingFields.length > 0) return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
    const extraFields = Object.keys(strengthsData).filter(key => !field.includes(key));
    if (extraFields.length > 0) return res.status(400).json({ message: `Unexpected fields: ${extraFields.join(', ')}` });

    if (!looksSafeForMongo(strengthsData)) return res.status(400).json({ message: "Unsafe data for MongoDB" });
    if (!Array.isArray(strengthsData.strengths)) return res.status(400).json({ message: "Strengths must be an array" });

    strengthsData.createdAt = new Date();
    req.strengthsData = strengthsData;
    next();
  } catch (error) {
    console.error('Error validating strengths data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 4. Valve Create Handler
// ==========================================
// SAZIN VALVES - CREATE ROUTE (FINAL FIXED)
// ==========================================

const handleValveCreate = async (req, res, next) => {
  try {
    const valveData = req.body;
    
    // ক্রিয়েটের সময় আইডি ফ্রন্টএন্ড থেকে আসবে না, তাই সরিয়ে দিচ্ছি
    delete valveData.id; 
    delete valveData.image; 

    const field = ["name", "slug", "category", "shortDesc", "description", "specs", "applications", "compliance", "price", "inStock", "featured", "color"];
    
    const missingFields = field.filter(f => !(f in valveData));
    if (missingFields.length > 0) return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
    
    const extraFields = Object.keys(valveData).filter(key => !field.includes(key));
    if (extraFields.length > 0) return res.status(400).json({ message: `Unexpected fields: ${extraFields.join(', ')}` });

    if (!looksSafeForMongo(valveData)) return res.status(400).json({ message: "Unsafe data for MongoDB" });

    const validations = {
      name: [[(v) => isSafeString(v, { max: 300 }), "Invalid valve name"]],
      slug: [[(v) => isSafeString(v, { max: 300 }), "Invalid slug"]],
      category: [[(v) => isSafeString(v, { max: 200 }), "Invalid category"]],
      shortDesc: [[(v) => isSafeString(v, { max: 1000 }), "Invalid short description"]],
      description: [[(v) => isSafeString(v, { max: 5000 }), "Invalid description"]],
      price: [[(v) => isValidNumber(v, 0), "Invalid price"]], // ⭐ এখানে ব্র্যাকেট ঠিক করা হয়েছে
      color: [[(v) => isSafeString(v, { max: 10 }), "Invalid color code"]],
    };

    const { isValid, errors } = runValidations(validations, valveData);
    if (!isValid) return res.status(400).json({ message: errors });

    // ডাটা টাইপ কনভার্সন
    valveData.price = Number(valveData.price);
    valveData.inStock = valveData.inStock === 'true' || valveData.inStock === true;
    valveData.featured = valveData.featured === 'true' || valveData.featured === true;

    // অ্যারে চেক (express.urlencoded এখন এগুলো ঠিকমতো অ্যারে আকারে পাঠাচ্ছে)
    if (!Array.isArray(valveData.specs)) return res.status(400).json({ message: "Specs must be an array" });
    if (!Array.isArray(valveData.applications)) return res.status(400).json({ message: "Applications must be an array" });
    if (!Array.isArray(valveData.compliance)) return res.status(400).json({ message: "Compliance must be an array" });

    valveData.createdAt = new Date();
    req.valveData = valveData;
    next();
  } catch (error) {
    console.error('Error validating valve data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

router.post('/create-valve', upload.single('image'), handleValveCreate, fileCheck("valve"), async (req, res) => {
  try {
    const valveData = req.valveData;
    
    // যদি ইমেজ আপলোড করা হয় (fileCheck মিডলওয়্যার থেকে আসবে)
    if (req.imageData && req.imageData.secure_url) {
      valveData.imageUrl = req.imageData.secure_url;
      valveData.imagePublicId = req.imageData.public_id; 
    } else {
      valveData.imageUrl = "";
      valveData.imagePublicId = "";
    }

    const result = await db.collection('sazin_products').insertOne(valveData);
    
    res.status(201).json({
      message: 'Valve created successfully',
      valveId: result.insertedId,
    });
  } catch (error) {
    console.error('Error creating valve:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// ==========================================
// SAZIN VALVES - CREATE ROUTERS
// ==========================================

// Create Hero Section (First time setup)
router.post('/create-hero', upload.none(), handleHeroCreate, async (req, res) => {
  try {
    const result = await db.collection('sazin_hero').insertOne(req.heroData);
    res.status(201).json({ 
      message: 'Hero created successfully', 
      heroId: result.insertedId 
    });
  } catch (error) {
    console.error('Error creating hero:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create About Section (First time setup)
/* router.post('/create-about', upload.none(), handleAboutCreate, async (req, res) => {
  try {
    const result = await db.collection('sazin_about').insertOne(req.aboutData);
    res.status(201).json({ 
      ok: true,
      message: 'About created successfully', 
      aboutId: result.insertedId 
    });
  } catch (error) {
    console.error('Error creating about:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}); */

// Create Strengths Section (First time setup)
router.post('/create-strengths', upload.none(), handleStrengthsCreate, async (req, res) => {
  try {
    const result = await db.collection('sazin_strengths').insertOne(req.strengthsData);
    res.status(201).json({ 
      message: 'Strengths created successfully', 
      strengthsId: result.insertedId 
    });
  } catch (error) {
    console.error('Error creating strengths:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create Valve/Product (Image upload supported)
router.post('/create-valve', upload.single('image'), handleValveCreate, fileCheck("valve"), async (req, res) => {
  try {
    const valveData = req.valveData;
    
    // যদি ইমেজ আপলোড করা হয়
    if (req.imageData && req.imageData.secure_url) {
      valveData.imageUrl = req.imageData.secure_url;
      valveData.imagePublicId = req.imageData.public_id; 
    } else {
      // যদি ইমেজ না দেয়, তাহলে ডিফল্ট কিছু সেট করে দেওয়া যায় অথবা খালি রাখা যায়
      valveData.imageUrl = "";
      valveData.imagePublicId = "";
    }

    const result = await db.collection('sazin_products').insertOne(valveData);
    
    res.status(201).json({
      message: 'Valve created successfully',
      valveId: result.insertedId,
    });
  } catch (error) {
    console.error('Error creating valve:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// ==========================================
// SAZIN VALVES - DELETE ROUTER
// ==========================================

// Delete Valve/Product
router.delete('/delete-valve/:id', async (req, res) => {
  try {
    const id = req?.params?.id;
    if (!id) return res.status(400).json({ message: "Valve ID is required" });
    if (!new ObjectId(id)) return res.status(400).json({ message: "Invalid Valve ID" });

    // ডিলিট করার আগে ডাটাবেজ থেকে ডকুমেন্টটি বের করে নিচ্ছি যাতে ক্লাউডিনারি থেকে ইমেজ ডিলিট করা যায়
    const result = await db.collection('sazin_products').findOneAndDelete(
      { _id: new ObjectId(id) },
      { projection: { imagePublicId: 1 } }
    );

    if (!result) {
      return res.status(404).json({ message: "Valve not found" });
    }

    // যদি প্রোডাক্টের কোনো ইমেজ থাকে, তাহলে ক্লাউডিনারি থেকেও ডিলিট করে দিচ্ছি
    if (result?.imagePublicId) {
      try {
        await deleteFromCloudinary(result?.imagePublicId);
        console.log(`🗑️ Cloudinary image deleted for valve:`, result?.imagePublicId);
      } catch (cloudErr) {
        console.error("⚠️ Cloudinary delete error:", cloudErr.message);
      }
    }

    res.status(200).json({
      message: 'Valve deleted successfully',
      valveId: id,
    });
  } catch (error) {
    console.error('Error deleting valve:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


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