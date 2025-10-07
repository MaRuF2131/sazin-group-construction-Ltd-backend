import dotenv from 'dotenv';
import express from 'express';
import mongo from '../../MongoDB.mjs';
import CryptoJS from "crypto-js";
import verifyJWT from '../../utils/VerifyJWT.mjs';
import { adminStatus } from '../../utils/adminStatus.mjs';
import { ObjectId } from 'mongodb';
import { deleteFromCloudinary } from '../../../utils/CDN/cloudinaryUpload.mjs';
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
//delete service
router.delete('/delete-service/:id', async (req, res) => {
  try {
    const id=req?.params?.id;
    if(!id)return res.status(400).json({ message: "Service ID is required" });
    if(!new ObjectId(id))return res.status(400).json({ message: "Invalid Service ID" });

    const result = await db.collection('services').deleteOne({ _id: new ObjectId(id) });
    if(result.deletedCount===0){
      return res.status(404).json({ message: "Service not found" });
    }
    res.status(200).json({
      message: 'Service deleted successfully',
      serviceId: id,
    });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//delete equipment
router.delete('/delete-equipment/:id', async (req, res) => {
  try {
    const id=req?.params?.id;
    if(!id)return res.status(400).json({ message: "Equipment ID is required" });
    if(!new ObjectId(id))return res.status(400).json({ message: "Invalid Equipment ID" });

    const result = await db.collection('equipment').deleteOne({ _id: new ObjectId(id) });
    if(result.deletedCount===0){
        return res.status(404).json({ message: "Equipment not found" });
     }
    res.status(200).json({
      message: 'Equipment deleted successfully',
      equipmentId: id,
    });
  } catch (error) {
    console.error('Error deleting equipment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//delete client
router.delete('/delete-client/:id', async (req, res) => {
  try {
    const id=req?.params?.id;
    if(!id)return res.status(400).json({ message: "client ID is required" });
    if(!new ObjectId(id))return res.status(400).json({ message: "Invalid client ID" });

    const result = await db.collection('clients').deleteOne({ _id: new ObjectId(id) });
    if(result.deletedCount===0){
      return res.status(404).json({ message: "Client not found" });
    }
    res.status(200).json({
      message: 'Client deleted successfully',
      clientId: id,
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//delete job
router.delete('/delete-job/:id', async (req, res) => {
  try {
    const id=req?.params?.id;
    if(!id)return res.status(400).json({ message: "job ID is required" });
    if(!new ObjectId(id))return res.status(400).json({ message: "Invalid job ID" });

    const result = await db.collection('jobs').deleteOne({ _id: new ObjectId(id) });
    if(result.deletedCount===0){
        return res.status(404).json({ message: "job not found" });
    }
    res.status(200).json({
      message: 'Job deleted successfully',
      jobId: id,
    });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
//delete news
router.delete('/delete-news/:id', async (req, res) => {
  try {
    
    const id=req?.params?.id;
    if(!id)return res.status(400).json({ message: "news ID is required" });
    if(!new ObjectId(id))return res.status(400).json({ message: "Invalid news ID" });

    const result = await db.collection('news').findOneAndDelete({_id: new ObjectId(id)}, { projection: { imagePublicId: 1 },returnDocument: 'before' });
        if(!result.value){
        return res.status(404).json({ message: "news not found" });
     }
    const imagePublicId = result.value.imagePublicId;
    if (imagePublicId) {
      try {
        // Delete image from Cloudinary if public_id exists
        await deleteFromCloudinary(imagePublicId);
      } catch (cloudErr) {
        console.error('Error deleting image from Cloudinary:', cloudErr);
        // এখানে আমরা শুধু error log করব, কিন্তু user কে বলব না যে image delete করতে সমস্যা হয়েছে
      }
    } 
    res.status(200).json({
      message: 'News deleted successfully',
      newsId: id,
    });
  } catch (error) {
    console.error('Error deleting news:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
//delete certificate
router.delete('/delete-certificate/:id', async (req, res) => {
  try {
    const id=req?.params?.id;
    if(!id)return res.status(400).json({ message: "certificate ID is required" });
    if(!new ObjectId(id))return res.status(400).json({ message: "Invalid certificate ID" });
    const result = await db.collection('certificate').findOneAndDelete({_id: new ObjectId(id)}, { projection: { imagePublicId: 1 },returnDocument: 'before' });
        if(!result.value){
        return res.status(404).json({ message: "certificate not found" });
     }
    const imagePublicId = result.value.imagePublicId;
    if (imagePublicId) {
      try {
        // Delete image from Cloudinary if public_id exists
        await deleteFromCloudinary(imagePublicId);
      } catch (cloudErr) {
        console.error('Error deleting image from Cloudinary:', cloudErr);
        // এখানে আমরা শুধু error log করব, কিন্তু user কে বলব না যে image delete করতে সমস্যা হয়েছে
      }
    } 
    res.status(201).json({
      message: 'certificate deleted successfully',
      certificateId: id,
    });
  } catch (error) {
    console.error('Error deleting certificate:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// delete achievement
router.delete('/delete-achievement/:id', async (req, res) => {
  try {
    const id=req?.params?.id;
    if(!id)return res.status(400).json({ message: "achievement ID is required" });
    if(!new ObjectId(id))return res.status(400).json({ message: "Invalid achievement ID" });
    
    const result = await db.collection('achievement').deleteOne({ _id: new ObjectId(id) });
        if(result.deletedCount===0){
        return res.status(404).json({ message: "achievement not found" });
    }
    res.status(200).json({
      message: 'achievement deleted successfully',
      achievementId: id,
    });
  } catch (error) {
    console.error('Error deleting achievement:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
//delete project
router.delete('/delete-project/:id', async (req, res) => {
  try {
    const id=req?.params?.id;
    if(!id)return res.status(400).json({ message: "project ID is required" });
    if(!new ObjectId(id))return res.status(400).json({ message: "Invalid project ID" });
    const result = await db.collection('project').findOneAndDelete({_id: new ObjectId(id)}, { projection: { imagePublicId: 1 },returnDocument: 'before' });
        if(!result.value){
        return res.status(404).json({ message: "project not found" });
     }
    const imagePublicId = result.value.imagePublicId;
    if (imagePublicId) {
      try {
        // Delete image from Cloudinary if public_id exists
        await deleteFromCloudinary(imagePublicId);
      } catch (cloudErr) {
        console.error('Error deleting image from Cloudinary:', cloudErr);
        // এখানে আমরা শুধু error log করব, কিন্তু user কে বলব না যে image delete করতে সমস্যা হয়েছে
      }
    } 
    res.status(201).json({
      message: 'Project deleted  successfully',
      projectId: id,
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
export default router;
