import express from 'express'
import ConnectDB from './config/db.js'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser';
import authRoutes from './routes/user.routes.js';

const app = express();

app.use(express.json());

app.use(cookieParser());
dotenv.config()
ConnectDB()

app.use('/api/v1/auth', authRoutes);

app.listen(process.env.PORT||5000,()=>{
    console.log(`Server is running on port ${process.env.PORT||5000}`)
})