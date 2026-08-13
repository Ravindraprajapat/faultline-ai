import User from '../model/User.js'
import bcrypt from 'bcryptjs'
import { genToken } from '../utils/token.js'
import { sendOtpMail } from '../utils/nodemailer.js'

export const signUp = async (req, res) => {
  try {
    const { name, email, password, mobile, role, assignedWard } = req.body
    let user = await User.findOne({ email })
    if (user) {
      return res.status(400).json({ message: 'User Already exist.' })
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 6 characters long.' })
    }
    if (mobile && mobile.length < 10) {
      return res
        .status(400)
        .json({ message: 'mobile length must be 10 digits ' })
    }

    // Officer must have an assigned ward
    if (role === 'officer' && !assignedWard) {
      return res.status(400).json({ message: 'Ward is required for officer registration.' })
    }

    const hashPassword = await bcrypt.hash(password, 10)
    user = await User.create({
      name,
      email,
      mobile,
      role: role || 'user',
      assignedWard: role === 'officer' ? assignedWard : null,
      password: hashPassword
    })

    const token = await genToken(user._id)
    res.cookie('token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  maxAge: 7 * 24 * 60 * 60 * 1000
})

    return res.status(201).json(user)
  } catch (error) {
    return res.status(500).json('sing up error', error)
  }
}

export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body
    let user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: 'User is does not exist.' })
    }
    const isMatched = await bcrypt.compare(password, user.password)
    if (!isMatched) {
      return res.status(400).json({ message: 'invalid password ' })
    }

    const token = await genToken(user._id)
   res.cookie('token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  maxAge: 7 * 24 * 60 * 60 * 1000
})

    return res.status(200).json(user)
  } catch (error) {
    return res.status(500).json(`error in will signin ${error}`)
  }
}

export const signOut = async (req, res) => {
  try {
   res.clearCookie('token', {
  httpOnly: true,
  secure: true,
  sameSite: 'none'
})
    return res.status(200).json({ message: 'sign out success' })
  } catch (error) {
    return res.status(500).json('sign out error', error)
  }
}

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: 'User Does not exist.' })
    }
    // generate otp
    const otp = Math.floor(1000 + Math.random() * 9000).toString()
    user.resetOtp = otp
    user.otpExpires = Date.now() + 5 * 60 * 1000
    user.isOtpVerified = false
    await user.save()

    await sendOtpMail(email, otp)
    return res.status(200).json({ message: 'OTP sent SuccessFully.' })
  } catch (error) {
    return res.status(500).json(`send otp error ${error}`)
  }
}

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body
    
    const user = await User.findOne({ email })
   
    if (!user || user.resetOtp != otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid/expired OTP' })
    }
    user.isOtpVerified = true
    user.resetOtp = undefined
    user.otpExpires = undefined
    await user.save()
    return res.status(200).json({ message: 'OTP verified successfully.' })
  } catch (error) {
    return res.status(500).json(`verify otp error ${error} `)
  }
}

export const resetPassword = async (req, res) => {

  try{
    const { email, newPassword } = req.body
    const user = await User.findOne({email})
    if(!user || !user.isOtpVerified){
      return res.status(400).json({message : "otp verification required."})
    }
    const hashedPassword = await bcrypt.hash(newPassword,10)
    user.password=hashedPassword;
    user.isOtpVerified = false
    await user.save()
    return res.status(200).json({ message: 'password SuccessFully change.' })
  }
  catch(error){
    return res.status(500).json(`reset password error ${error}`)
  }
}

// export const googleAuth = async (req, res) => {
//   try {
//      console.log("🔥 GOOGLE AUTH ROUTE REACHED");
//     const { name, email, mobile } = req.body
//     let user = await User.findOne({ email })
//     if (!user) {
//       user = await User.create({
//         name,
//         email,
//         mobile
//       })
//     }
//     const token = await genToken(user._id)
//     res.cookie('token', token, {
//       secure: false,
//       sameSite: 'strict',
//       maxAge: 7 * 24 * 60 * 60 * 1000,
//       httpOnly: true
//     })

//     return res.status(200).json(user)
//   } catch (error) {
//     return res.status(500).json('google auth error', error)
//   }
// }

export const googleAuth = async (req, res) => {
  try {
    console.log(" GOOGLE AUTH ROUTE REACHED");

    const { name, email, mobile } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        mobile
      });
    }

    const token = await genToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      user
    });

  } catch (error) {

    console.log("Google auth error:", error);

    return res.status(500).json({
      message: "google auth error",
      error: error.message
    });

  }
};
