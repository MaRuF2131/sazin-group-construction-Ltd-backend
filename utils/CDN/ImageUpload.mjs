import crypto from 'crypto';
import multer from 'multer';
import sharp from 'sharp';
import { bucket } from './firebaseConfig.mjs';

export function generateSecureId(bytes = 12) {
  return crypto.randomBytes(bytes).toString('hex'); // returns hex string
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export const uploadImageMiddleware = [
  upload.single('image'), // use field name 'image'
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      if (!req.file.mimetype?.startsWith('image/'))
        return res.status(400).json({ error: 'File must be an image' });

      // convert to webp
      const webpBuffer = await sharp(req.file.buffer)
        .webp({ quality: 80 })
        .toBuffer();

      const filename = `uploads/${generateSecureId(12)}.webp`;
      const file = bucket.file(filename);

      // upload buffer
      await file.save(webpBuffer, {
        metadata: { contentType: 'image/webp' },
      });

      // Option A: get signed url (temporary or long-expiry)
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '2030-03-01', // easy string; change as needed
      });

      // inject into req.file for controller
      req.file.firebaseUrl = url;

      next();
    } catch (err) {
      console.error('uploadImageMiddleware error:', err);
      next(err);
    }
  },
];
