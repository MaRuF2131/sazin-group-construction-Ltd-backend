import { Router } from 'express';
import { uploadImageMiddleware } from './ImageUpload.mjs';

const router = Router();

router.post('/add-product', uploadImageMiddleware, async (req, res) => {
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

export default router;
