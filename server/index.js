import express from 'express'
import ConnectDB from './config/db.js'
import dotenv from 'dotenv'


const app = express()
dotenv.config()
ConnectDB()



app.listen(process.env.PORT||5000,()=>{
    console.log(`Server is running on port ${process.env.PORT||5000}`)
})