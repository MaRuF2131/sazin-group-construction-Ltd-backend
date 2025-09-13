import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongo from './MongoDB.mjs';

dotenv.config();
/* import cookieParser from 'cookie-parser'; */

const app = express();
const port = process.env.PORT || 5000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // যদি origin না থাকে (যেমন Postman), তাও allow করব
      callback(null, origin || true);
    },
    credentials: true, // কুকি/সেশন allow
  })
);
app.use(express.json());
/* app.use(cookieParser()); */
/* app.use(express.urlencoded({ extended: true })); */

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

// Routes
import AdminAction from './AdminAction/index.mjs';
app.use('/admin-action', AdminAction);

/// listening
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});
