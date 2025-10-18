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
  isValidNumber,
  looksSafeForMongo,
  runValidations,
  sanitizeMiddleware,
 } from '../../utils/validationCheck.mjs';
dotenv.config();
const router = express.Router();

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

const handleproduct = async (req, res, next) => {
  try {
     const productData = req.body;
    const ct=[
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
    ]
    console.log("category",productData);
    const field=["discountPercent","isFeatured","hasDiscount","price","category","description","title","productName"]
    const missingFields = field.filter(f => !(f in productData));
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
    }
    const extraFields = Object.keys(productData).filter(key => !field.includes(key));
    if (extraFields.length > 0) {
      return res.status(400).json({ message: `Unexpected fields: ${extraFields.join(', ')}` });
    }
    // ✅ Mongo safety check
    if (!looksSafeForMongo(productData)) {
      return res.status(400).json({ message: "Unsafe data for MongoDB" });
    }   
    // validation rules (title, description ইত্যাদি)
    const validations = {
      productName: [[(v) => isSafeString(v, { max: 300 }), "Invalid Product Name"]],
      title: [[(v) => isSafeString(v, { max: 300 }), "Invalid product title"]],
      description: [[(v) => isSafeString(v, { max: 5000 }), "Invalid description"]],
      category:[[(v) => isSafeString(v, { max: 200 }), "Invalid category"]],
      discountPercent:[[(v)=>isValidNumber(v),"Invalid Number"]],
      price:[[(v)=>isValidNumber(v),"Invalid Number"]],
    };
   if(!ct.includes(productData?.category))return res.status(400).json({ message: "Catergory Not Under Listed" });
   if(productData?.isFeatured==='true')productData.isFeatured=true;
   else productData.isFeatured=false;
   if(productData?.hasDiscount==='true') productData.hasDiscount=true;
   else productData.hasDiscount=false;

   const { isValid, errors } = runValidations(validations, productData);
    if (!isValid) {
      return res.status(400).json({ message: errors });
    }
    productData.postedAt = new Date(); // Add postedAt field with current date;
    req.productData = productData;
    next();
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

//add product
router.post('/add-product', upload.single('image'),handleproduct,fileCheck("product"), async (req, res) => {
  try {
    const productData = req?.productData;
    if (req.imageData && req.imageData.secure_url) {
      productData.imageUrl = req.imageData.secure_url;
      productData.imagePublicId = req.imageData.public_id; // Optional: Store public_id for future deletions
    }
    const result = await db.collection('product').insertOne(productData);
    res.status(201).json({
      message: 'product added successfully',
      productId: result.insertedId,
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
export default router;
