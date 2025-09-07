import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongo from './MongoDB.mjs';
import { uploadImageMiddleware } from './utils/CDN/ImageUpload.mjs';

dotenv.config();
/* import cookieParser from 'cookie-parser'; */

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
/* app.use(cookieParser()); */
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
// MongoDB connection
let db;
(async () => {
  try {
    db = await mongo();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
})();

app.post('/add-product', uploadImageMiddleware, async (req, res) => {
  try {
    console.log(req.file?.firebaseUrl);

    // Validate and process productData
    // ...

    res.status(201).json({
      message: 'Product added successfully',
      imageUrl: req.file.firebaseUrl,
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/// listening
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});
