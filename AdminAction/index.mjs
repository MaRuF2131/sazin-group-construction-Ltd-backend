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
import deleteAction from './Sazin-construction/mangeAction/DeleteAction.mjs'
import editAction from './Sazin-construction/mangeAction/EditAction.mjs'
import login from './Auth/login.mjs';
import register from './Auth/register.mjs';
import profile_update from './Auth/profile-update.mjs';
import get_profile from './Auth/get-profile.mjs';
import manageAdmin from './Auth/manageAdmin.mjs';
import ChangePass from './Auth/changePass.mjs'
import ForgottenPass from './Auth/forgottenPass.mjs'
import logout from './Auth/logout.mjs'


// Routes
router.use('/sazin-construction/addAction', AddAction);
router.use('/sazin-construction/manageAction/getAction', getAction);
router.use('/sazin-construction/manageAction/deleteAction', deleteAction);
router.use('/sazin-construction/manageAction/editAction', editAction);

router.use('/Auth0777T',login);
router.use('/Auth0778T',register);
router.use('/Auth0779T',profile_update);
router.use('/Auth0780T',get_profile);
router.use('/Auth0781T',manageAdmin);
router.use('/Auth0782T',ChangePass);
router.use('/Auth0783T',ForgottenPass);
router.use('/Auth0784T',logout);

export default router;