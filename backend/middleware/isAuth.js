// import jwt from 'jsonwebtoken'
// import dotenv from 'dotenv'
// dotenv.config()
// export const isAuth = (req, res, next) => {
//   try {
//     const token = req.cookies.token

//     console.log('cookies:', req.cookies)
//     if (!token) {
//       return res.status(401).json({ message: 'token not found' })
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET)

//     req.userId = decoded.userId
//     next()
//   } catch (error) {
//     return res.status(401).json({ message: 'Authentication error' })
//   }
// }

import jwt from "jsonwebtoken";
import dotenv from 'dotenv'
dotenv.config()



  export const isAuth = (req, res, next) => {
  try {

    const token = req.cookies?.token;

    // console.log("Cookies:", req.cookies);
    // console.log("Token:", token);

    if (!token) {
      return res.status(401).json({
        message: "Token not found"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decoded.userId;

    next();

  } catch (error) {
    console.log("Auth Error:", error.message);

    return res.status(401).json({
      message: "Invalid token"
    });
  }
};
