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
import getAction from './Sazin-construction/mangeAction/getAction.mjs'
import login from './Auth/login.mjs';
import register from './Auth/register.mjs';
import profile_update from './Auth/profile-update.mjs';
import get_profile from './Auth/get-profile.mjs';

// Routes
router.use('/sazin-construction/addAction', AddAction);
router.use('/sazin-construction/manageAction/getAction', getAction);
router.use('/Auth0777T',login);
router.use('/Auth0778T',register);
router.use('/Auth0779T',profile_update);
router.use('/Auth0780T',get_profile); 

export default router;