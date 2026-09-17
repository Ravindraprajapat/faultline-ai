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

### CIVIC CONTEXT VERIFICATION
The uploaded image must contain enough visible surrounding context to establish that the reported issue is actually related to a civic/public infrastructure location.

ACCEPT the image (isValid: true) when the issue is visibly located in or clearly associated with:
- Road
- Street
- Footpath / Sidewalk
- Drainage
- Public Utility
- Public Property
- Public Area
- Other clearly visible civic/public infrastructure

REJECT the image (isValid: false) when:
- The image does not show any civic/public context (e.g. personal photo, indoor selfie, face/body photo).
- The reported issue is not visibly present.
- The image contains only an unrelated private/personal object.
- The image is a screenshot.
- The image is a meme.
- The image is a poster/document/text-only image.
- The image does not provide enough visual evidence to verify the civic issue.
- The issue can only be assumed from text, filename, metadata, GPS, ward information, or the user's claim.

IMPORTANT:
Do NOT infer civic context from:
- GPS coordinates
- Ward name
- Image filename
- Image metadata
- User-provided description
- Complaint category
- Any external information

Civic context must be determined ONLY from what is visually visible in the uploaded image.

If the image appears potentially relevant but the surrounding context is insufficient to confidently establish a civic/public location, set isValid: false, civicContext: "Unknown", and confidence < 0.75.

Return ONLY JSON:
{
 "damageType": "POTHOLE | ROAD_CRACK | GARBAGE | STREETLIGHT | WATER_LEAK | OTHER",
 "severity": number (1-10),
 "confidence": number (0-1),
 "civicContext": "Road | Footpath | Drainage | Public Utility | Public Property | Public Area | Street | Unknown",
 "isValid": boolean (true | false)
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

    // ✅ STEP 3: Verification Gate Check
    const isCivicValid =
      parsed.isValid !== false &&
      parsed.civicContext !== 'Unknown' &&
      Number(parsed.confidence) >= 0.75

    if (!isCivicValid) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }
      return res.status(400).json({
        success: false,
        message:
          'Invalid image: The uploaded image does not contain clear visual evidence of a civic or public infrastructure issue.'
      })
    }

    // ✅ STEP 4: Severity Validation
    let severityScore = Number(parsed.severity)
    if (!severityScore || severityScore < 1) severityScore = 5
    if (severityScore > 10) severityScore = 10

    let priorityLevel = 'LOW'
    if (severityScore >= 7) priorityLevel = 'HIGH'
    else if (severityScore >= 4) priorityLevel = 'MEDIUM'

    // ✅ STEP 5: Upload to Cloudinary
    const imageUrl = await uploadOnCloudinary(localFilePath)

    // ✅ STEP 6: Save Report with Authoritative Ward
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
