import mongoose from "mongoose";
import dotenv from 'dotenv'
dotenv.config()
import { seedWards } from './seedWards.js'

const connectDB  = async () =>{
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log("Mongo DB is Connect SuccessFully ")
        await seedWards()
    } catch (error) {
       console.log(error); 
    }
}

export default connectDB;