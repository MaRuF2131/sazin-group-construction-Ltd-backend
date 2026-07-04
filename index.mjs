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
import UserAction from './UserAction/getAction.mjs'
import ContactAction from './UserAction/contact.mjs'
import jobApply from './UserAction/jobApply.mjs'
app.use('/admin-action', AdminAction);
app.use('/userAction',UserAction);
app.use('/userAction/mail',ContactAction);
app.use('/userAction/job',jobApply); 

app.get('/', (req, res) => {
  res.send('Server is running');
});
/// listen
 app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
}); 
export default app;
