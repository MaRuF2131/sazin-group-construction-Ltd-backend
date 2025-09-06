import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongo from './MongoDB.mjs';
dotenv.config();
import { MongoClient, ServerApiVersion } from 'mongodb';
/* import cookieParser from 'cookie-parser'; */
import jwt from 'jsonwebtoken';



const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
/* app.use(cookieParser()); */
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
let db;
(async () => {
  try {

    db = await mongo()
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
})();


/// listening
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});