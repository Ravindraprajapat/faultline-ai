import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config();
export const genToken =  async(userId)=>{
    try {
        const token = await jwt.sign({userId},process.env.JWT_SECRET);
        return token;
    } catch (error) {
        console.log("Error in Token generate",error)
    }
}