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
//update service
router.put('/update-service/:id',upload.none(), async (req, res) => {
  try {
    const serviceData = req.body;
    const id=req?.params?.id;
    if(!id)return res.status(400).json({ message: "Service ID is required" });
    if(!new ObjectId(id))return res.status(400).json({ message: "Invalid Service ID" });
    const field=["service","description"]
    const missingFields = field.filter(f => !(f in serviceData));
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
    }
    const extraFields = Object.keys(serviceData).filter(key => !field.includes(key));
    if (extraFields.length > 0) {
      return res.status(400).json({ message: `Unexpected fields: ${extraFields.join(', ')}` });
    }
    // ✅ Mongo safety check
    if (!looksSafeForMongo(serviceData)) {
      return res.status(400).json({ message: "Unsafe data for MongoDB" });
    }

    // validation rules (title, description ইত্যাদি)
    const validations = {
      service: [[(v) => isSafeString(v), "Invalid service name"]],
      description: [[(v) => isSafeString(v, { max: 2000 }), "Invalid description"]],
    };

   const { isValid, errors } = runValidations(validations, serviceData);

    if (!isValid) {
      return res.status(400).json({ message: errors });
    }

    serviceData.updatedAt = new Date(); // Add updatedAt field with current date;
    const result = await db.collection('services').updateOne({ _id: new ObjectId(id) }, { $set: serviceData });
    if(result.matchedCount===0){
      return res.status(404).json({ message: "Service not found" });
    }
    res.status(200).json({
      message: 'Service updated successfully',
      serviceId: id,
    });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//update equipment
router.put('/update-equipment/:id',upload.none(), async (req, res) => {
  try {
    const equipmentData = req.body;
    const id=req?.params?.id;
    if(!id)return res.status(400).json({ message: "Equipment ID is required" });
    if(!new ObjectId(id))return res.status(400).json({ message: "Invalid Equipment ID" });
    const field=["equipment"]
    const missingFields = field.filter(f => !(f in equipmentData));
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
    }
    const extraFields = Object.keys(equipmentData).filter(key => !field.includes(key));
    if (extraFields.length > 0) {
      return res.status(400).json({ message: `Unexpected fields: ${extraFields.join(', ')}` });
    }
    
    // ✅ Mongo safety check
    if (!looksSafeForMongo(equipmentData)) {
      return res.status(400).json({ message: "Unsafe data for MongoDB" });
    }

    // validation rules (title, description ইত্যাদি)
    const validations = {
      equipment: [[(v) => isSafeString(v, { max: 2000 }), "Invalid equipment name"]],
    };

   const { isValid, errors } = runValidations(validations, equipmentData);

    if (!isValid) {
      return res.status(400).json({ message: errors });
    }
    equipmentData.updatedAt = new Date(); // Add updatedAt field with current date;
    const result = await db.collection('equipment').updateOne({ _id: new ObjectId(id) },{$set: equipmentData});
    if(result.matchedCount===0){
        return res.status(404).json({ message: "Equipment not found" });
     }
    res.status(200).json({
      message: 'Equipment updated successfully',
      equipmentId: id,
    });
  } catch (error) {
    console.error('Error updatting equipment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//update client
router.put('/update-client/:id',upload.none(), async (req, res) => {
  try {
    const clientData = req.body;
    const id=req?.params?.id;
    if(!id)return res.status(400).json({ message: "client ID is required" });
    if(!new ObjectId(id))return res.status(400).json({ message: "Invalid client ID" });

    const field=["partner","description"]
    const missingFields = field.filter(f => !(f in clientData));
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
    }
    const extraFields = Object.keys(clientData).filter(key => !field.includes(key));
    if (extraFields.length > 0) {
      return res.status(400).json({ message: `Unexpected fields: ${extraFields.join(', ')}` });
    }

    // ✅ Mongo safety check
    if (!looksSafeForMongo(clientData)) {
      return res.status(400).json({ message: "Unsafe data for MongoDB" });
    }

    // validation rules (title, description ইত্যাদি)
    const validations = {
      partner: [[(v) => isSafeString(v, { max:300 }), "Invalid partner name"]],
      description:[[(v) => isSafeString(v, { max: 3000 }), "Invalid description"]],
    };

   const { isValid, errors } = runValidations(validations, clientData);

    if (!isValid) {
      return res.status(400).json({ message: errors });
    }
    clientData.updatedAt = new Date(); // Add updatedAt field with current date;
    const result = await db.collection('clients').updateOne({ _id: new ObjectId(id) },{$set: clientData});
     if(result.matchedCount===0){
      return res.status(404).json({ message: "Client not found" });
    }
    res.status(200).json({
      message: 'Client updated successfully',
      clientId: id,
    });
  } catch (error) {
    console.error('Error updatting client:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//update job
router.put('/update-job/:id',upload.none(), async (req, res) => {
  try {
    const jobData = req.body;
    const id=req?.params?.id;
    if(!id)return res.status(400).json({ message: "job ID is required" });
    if(!new ObjectId(id))return res.status(400).json({ message: "Invalid job ID" });

    const field=["deadline","jobType","job","description","location","salary"]
    const missingFields = field.filter(f => !(f in jobData));
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
    }
    const extraFields = Object.keys(jobData).filter(key => !field.includes(key));
    if (extraFields.length > 0) {
      return res.status(400).json({ message: `Unexpected fields: ${extraFields.join(', ')}` });
    }
    // ✅ Mongo safety check
    if (!looksSafeForMongo(jobData)) {
      return res.status(400).json({ message:"Unsafe data for MongoDB" });
    }
    
    console.log('jobData:', jobData);
    // validation rules (title, description ইত্যাদি)
    const validations = {
      job: [[(v) => isSafeString(v, { max: 300 }), "Invalid job name"]],
      description: [[(v) => isSafeString(v, { max: 2000 }), "Invalid description"]],
      location: [[(v) => isSafeString(v, { max: 300 }), "Invalid location"]],
      salary: [[(v) => isValidNumber(v, 1), "Invalid salary"]],
      jobType: [[(v) => isSafeString(v, { max: 100 }), "Invalid job type"]],
      deadline: [[(v) => isValidDate(v), "Invalid deadline"]],
    };
   
   const { isValid, errors } = runValidations(validations, jobData);

    if (!isValid) {
      return res.status(400).json({ message:errors });
    }
    jobData.deadline = new Date(jobData.deadline); // Convert deadline to Date object;
    jobData.updatedAt = new Date(); // Add updatedAt field with current date;

    const result = await db.collection('jobs').updateOne({ _id: new ObjectId(id) },{$set: jobData});
        if(result.matchedCount===0){
        return res.status(404).json({ message: "job not found" });
    }
    res.status(200).json({
      message: 'Job updated successfully',
      jobId: id,
    });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
//add news
router.post('/add-news', upload.single('image'),fileCheck("news"), async (req, res) => {
  try {
    const newsData = req.body;
    const field=["newstitle","description",'author','date']
    const missingFields = field.filter(f => !(f in newsData));
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
    }
    const extraFields = Object.keys(newsData).filter(key => !field.includes(key));
    if (extraFields.length > 0) {
      return res.status(400).json({ message: `Unexpected fields: ${extraFields.join(', ')}` });
    }
    // ✅ Mongo safety check
    if (!looksSafeForMongo(newsData)) {
      return res.status(400).json({ message: "Unsafe data for MongoDB" });
    }

    // validation rules (title, description ইত্যাদি)
    const validations = {
      newstitle: [[(v) => isSafeString(v, { max: 300 }), "Invalid news title"]],
      description: [[(v) => isSafeString(v, { max: 5000 }), "Invalid description"]],
      author: [[(v) => isSafeString(v, { max: 300 }), "Invalid author"]],
      date: [[(v) => isValidDate(v), "Invalid published date"]],
    };

   const { isValid, errors } = runValidations(validations, newsData);
    if (!isValid) {
      return res.status(400).json({ message: errors });
    }
    newsData.date = new Date(newsData.date); // Convert date to Date object;
    newsData.postedAt = new Date(); // Add postedAt field with current date;

 
    if (req.imageData && req.imageData.secure_url) {
      newsData.imageUrl = req.imageData.secure_url;
      newsData.imagePublicId = req.imageData.public_id; // Optional: Store public_id for future deletions
    }
    const result = await db.collection('news').insertOne(newsData);
    res.status(201).json({
      message: 'News added successfully',
      newsId: result.insertedId,
    });
  } catch (error) {
    console.error('Error adding news:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
//add certificate
router.post('/add-certificate', upload.single('image'),fileCheck("certificate"), async (req, res) => {
  try {
    const certificateData = req.body;
    const field=["certificateName"]
    const missingFields = field.filter(f => !(f in certificateData));
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
    }
    const extraFields = Object.keys(certificateData).filter(key => !field.includes(key));
    if (extraFields.length > 0) {
      return res.status(400).json({ message: `Unexpected fields: ${extraFields.join(', ')}` });
    }
    // ✅ Mongo safety check
    if (!looksSafeForMongo(certificateData )) {
      return res.status(400).json({ message: "Unsafe data for MongoDB" });
    }
    
    // validation rules (title, description ইত্যাদি)
    const validations = {
      certificateName : [[(v) => isSafeString(v, { max: 300 }), "Invalid certificate name"]],
    };

   const { isValid, errors } = runValidations(validations, certificateData );
    if (!isValid) {
      return res.status(400).json({ message: errors });
    }
    certificateData.postedAt = new Date(); // Add postedAt field with current date;

 
    if (req.imageData && req.imageData.secure_url) {
      certificateData.imageUrl = req.imageData.secure_url;
      certificateData.imagePublicId = req.imageData.public_id; // Optional: Store public_id for future deletions
    }
    const result = await db.collection('certificate').insertOne(certificateData);
    res.status(201).json({
      message: 'News added successfully',
      certificateId: result.insertedId,
    });
  } catch (error) {
    console.error('Error adding news:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// update achievement
router.post('/update-achievement/:id',upload.none(), async (req, res) => {
  try {
    const achievementData = req.body;
    const id=req?.params?.id;
    if(!id)return res.status(400).json({ message: "achievement ID is required" });
    if(!new ObjectId(id))return res.status(400).json({ message: "Invalid achievement ID" });

    const field=["achievement","description"]
    const missingFields = field.filter(f => !(f in achievementData));
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
    }
    const extraFields = Object.keys(achievementData).filter(key => !field.includes(key));
    if (extraFields.length > 0) {
      return res.status(400).json({ message: `Unexpected fields: ${extraFields.join(', ')}` });
    }
    // ✅ Mongo safety check
    if (!looksSafeForMongo(achievementData)) {
      return res.status(400).json({ message: "Unsafe data for MongoDB" });
    }

    // validation rules (title, description ইত্যাদি)
    const validations = {
      achievement: [[(v) => isSafeString(v), "Invalid achievement name"]],
      description: [[(v) => isSafeString(v, { max: 2000 }), "Invalid description"]],
    };

   const { isValid, errors } = runValidations(validations, achievementData);

    if (!isValid) {
      return res.status(400).json({ message: errors });
    }

    achievementData.updatedAt = new Date(); // Add updatedAt field with current date;
    const result = await db.collection('achievement').updateOne({ _id: new ObjectId(id) },{$set: achievementData});
        if(result.matchedCount===0){
        return res.status(404).json({ message: "achievemen not found" });
    }
    res.status(200).json({
      message: 'achievement updated successfully',
      achievementId: id,
    });
  } catch (error) {
    console.error('Error updatting achievement:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
//add project
router.post('/add-project', upload.single('image'),fileCheck("project"), async (req, res) => {
  try {
    const projectData = req.body;
    const ct=["Civil","Electro","Engineering-Procurement","Safe&Security"]
    console.log("category",projectData);
    const field=["date","category","description","title","feature"]
    const missingFields = field.filter(f => !(f in projectData));
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
    }
    const extraFields = Object.keys(projectData).filter(key => !field.includes(key));
    if (extraFields.length > 0) {
      return res.status(400).json({ message: `Unexpected fields: ${extraFields.join(', ')}` });
    }
    // ✅ Mongo safety check
    if (!looksSafeForMongo(projectData)) {
      return res.status(400).json({ message: "Unsafe data for MongoDB" });
    }
    console.log("project",projectData);
    
    // validation rules (title, description ইত্যাদি)
    const validations = {
      title: [[(v) => isSafeString(v, { max: 300 }), "Invalid project title"]],
      description: [[(v) => isSafeString(v, { max: 5000 }), "Invalid description"]],
      category:[[(v) => isSafeString(v, { max: 200 }), "Invalid category"]],
      date: [[(v) => isValidDate(v), "Invalid  date"]],
    };
   if(!ct.includes(projectData?.category))return res.status(400).json({ message: "Catergory Not Under Listed" });
   if(projectData?.feature==='true')projectData.feature=true;
   else projectData.feature=false;

   const { isValid, errors } = runValidations(validations, projectData);
    if (!isValid) {
      return res.status(400).json({ message: errors });
    }
    projectData.date = new Date(projectData.date); // Convert date to Date object;
    projectData.postedAt = new Date(); // Add postedAt field with current date;

 
    if (req.imageData && req.imageData.secure_url) {
      projectData.imageUrl = req.imageData.secure_url;
      projectData.imagePublicId = req.imageData.public_id; // Optional: Store public_id for future deletions
    }
    const result = await db.collection('project').insertOne(projectData);
    res.status(201).json({
      message: 'News added successfully',
      projectId: result.insertedId,
    });
  } catch (error) {
    console.error('Error adding news:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
export default router;
