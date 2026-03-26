import mongoose from 'mongoose'
const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    mobile: {
      type: String,
      required: false
    },
    password: {
      type: String,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'officer'],
      default: 'user'
    },
    // Only for officers — which ward they manage
    assignedWard: {
      type: String,
      default: null
    },
    resetOtp: {
      type: String
    },
    isOtpVerified: {
      type: Boolean,
      default: false
    },
    otpExpires: {
      type: Date
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    }
  },
  {
    timestamps: true
  }
)

export default mongoose.model('User', UserSchema)
