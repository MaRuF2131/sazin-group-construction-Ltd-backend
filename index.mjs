import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';

const app = express();
const port = 5000;
app.use(express.json());
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
app.use(cookieParser()); 
app.use(express.urlencoded({ extended: true })); 

// Routes
import AdminAction from './AdminAction/index.mjs';
app.use('/admin-action', AdminAction);

/// listening
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});
