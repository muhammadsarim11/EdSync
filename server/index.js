import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import ConnectDB from './config/db.js'
import validateEnv from './config/validateEnv.js'
import cookieParser from 'cookie-parser';
import authRoutes from './routes/user.routes.js';
import { globalErrorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { generalLimiter, sanitizeInput } from './middlewares/security.middleware.js';

validateEnv()

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(sanitizeInput);
app.use('/api', generalLimiter);

ConnectDB()

app.use('/api/v1/auth', authRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

app.listen(process.env.PORT||5000,()=>{
    console.log(`Server is running on port ${process.env.PORT||5000}`)
})