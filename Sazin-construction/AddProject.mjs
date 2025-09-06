import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
const router = express.Router();

// MongoDB connection
let db;
(async () => {
  try {

    db = await mongo()
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
})();

router.post('/add-project', async (req, res) => {
  try {
    const projectData = req.body;   
    const result = await db.collection('projects').insertOne(projectData);
    res.status(201).json({ message: 'Project added successfully', projectId: result.insertedId });
  } catch (error) {
    console.error('Error adding project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
export default router;