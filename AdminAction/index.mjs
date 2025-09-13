import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();
const router = express.Router();

// Middleware
router.use(
  cors({
    origin: (origin, callback) => {
      // যদি origin না থাকে (যেমন Postman), তাও allow করব
      callback(null, origin || true);
    },
    credentials: true, // কুকি/সেশন allow
  })
);
router.use(express.json());
router.use(express.urlencoded({ extended: true }));
import AddAction from './Sazin-construction/AddAction.mjs';
router.use('/sazin-construction/addAction', AddAction);
export default router;