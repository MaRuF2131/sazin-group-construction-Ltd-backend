import dotenv from 'dotenv';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import path from 'path';
dotenv.config();

const serviceAccountPath =
  process.env.GOOGLE_SERVICE_ACCOUNT_PATH ||
  path.join(__dirname, '../../firebae-secret.json');

// initialize admin
initializeApp({
  credential: cert(serviceAccountPath),
  storageBucket: process.env.STORAGE_BUCKET,
});

export const bucket = getStorage().bucket();
export const db = getFirestore();
