import dotenv from 'dotenv';
import nodemailer from 'nodemailer';  
dotenv.config();

export  const mailSender=async()=>{
   const transporter = nodemailer.createTransport({
    service: "gmail",
    host: 'smtp.gmail.com' , 
    port: 465 , 
    secure: true ,
    auth: {
      user: process.env.EMAIL_USER,        // your Gmail
      pass: process.env.EMAIL_PASS         // App password from Gmail
    }
  });

  if(transporter){
    console.log("transporter is working");
  }
  return transporter

}


