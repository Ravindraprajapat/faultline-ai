import fs from 'fs'
import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'
import Report from '../model/Report.js'
import Ward from '../model/Ward.js'
import uploadOnCloudinary from '../utils/cloudinary.js'
import { sendComplaintRegisteredNotification } from '../utils/notificationService.js'
import User from '../model/User.js'

dotenv.config()

const GoogleAi = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
})

export const createReport = async (req, res) => {
  console.log('api hit create report')
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' })
    }

    const latitude = Number(req.body.latitude)
    const longitude = Number(req.body.longitude)

    if (isNaN(latitude) || isNaN(longitude)) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required.' })
    }

    // 🔹 Authoritative Backend GPS -> GeoJSON Point -> MongoDB $geoIntersects Ward Lookup
    const geoPoint = {
      type: 'Point',
      coordinates: [longitude, latitude] // GeoJSON order: [longitude, latitude]
    }

    const matchedWard = await Ward.findOne({
      geometry: {
        $geoIntersects: {
          $geometry: geoPoint
        }
      }
    })

    if (!matchedWard) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }
      return res.status(400).json({
        success: false,
        message: 'Unable to determine the municipal ward from the provided location. Location must be within Vadodara municipal limits.'
      })
    }

    const authoritativeWard = matchedWard.wardName

    const localFilePath = req.file.path

    // ✅ STEP 1: Convert local file to base64 for Gemini
    const base64Img = fs.readFileSync(localFilePath, {
      encoding: 'base64'
    })

    // ✅ STEP 2: Send image to Gemini
    const result = await GoogleAi.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          text: `You are an infrastructure damage detection AI.
Analyze image carefully.

Return ONLY JSON:
{
 "damageType": "POTHOLE | ROAD_CRACK | GARBAGE | STREETLIGHT | WATER_LEAK | OTHER",
 "severity": number (1-10),
 "confidence": number (0-1)
}`
        },
        {
          inlineData: {
            data: base64Img,
            mimeType: req.file.mimetype
          }
        }
      ]
    })

    const responseText =
      result.text || result?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    console.log('Ai response ', responseText)

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      throw new Error('AI response invalid format')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // ✅ STEP 3: Severity Validation
    let severityScore = Number(parsed.severity)
    if (!severityScore || severityScore < 1) severityScore = 5
    if (severityScore > 10) severityScore = 10

    let priorityLevel = 'LOW'
    if (severityScore >= 7) priorityLevel = 'HIGH'
    else if (severityScore >= 4) priorityLevel = 'MEDIUM'

    // ✅ STEP 4: Upload to Cloudinary
    const imageUrl = await uploadOnCloudinary(localFilePath)

    // ✅ STEP 5: Save Report with Authoritative Ward
    const report = await Report.create({
      reportedBy: req.userId,
      imageUrl,
      location: {
        latitude,
        longitude,
        address: req.body.address || '',
        ward: authoritativeWard // Authoritative backend-calculated ward
      },
      aiAnalysis: {
        detectedType: parsed.damageType || 'OTHER',
        confidence: parsed.confidence || 0.8
      },
      severityScore,
      priorityLevel
    })

    // Centralized Registration Notification (Twilio + Nodemailer)
    const user = await User.findById(req.userId)
    if (user) {
      sendComplaintRegisteredNotification({ user, report }).catch(err => {
        console.error('Non-blocking registration notification error:', err)
      })
    }

    res.status(201).json({
      success: true,
      report
    })
  } catch (error) {
    console.error(error)

    // Safety: agar file bachi ho to delete
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }

    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

// for get reports
export const getUserReports = async (req, res) => {
  try {
    const userId = req.userId

    const reports = await Report.find({ reportedBy: userId }).sort({
      createdAt: -1
    })

    res.status(200).json({
      success: true,
      reports
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports'
    })
  }
}
