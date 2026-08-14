import dotenv from 'dotenv'
dotenv.config()

import ConnectDB from './config/db.js'
import validateEnv from './config/validateEnv.js'
import app from './app.js'

validateEnv()
ConnectDB()

app.listen(process.env.PORT||5000,()=>{
    console.log(`Server is running on port ${process.env.PORT||5000}`)
})
