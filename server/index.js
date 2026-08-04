import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import ConnectDB from './config/db.js'
import validateEnv from './config/validateEnv.js'
import cookieParser from 'cookie-parser';
import authRoutes from './routes/user.routes.js';

validateEnv()

const app = express();

app.use(express.json());

app.use(cookieParser());
ConnectDB()

app.use('/api/v1/auth', authRoutes);

app.listen(process.env.PORT||5000,()=>{
    console.log(`Server is running on port ${process.env.PORT||5000}`)
})