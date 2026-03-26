import mongoose from 'mongoose'

const wardOfficerSchema = new mongoose.Schema(
  {
    ward: {
      type: String,
      required: true,
      unique: true  // one officer per ward
    },
    officer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
)

export default mongoose.model('WardOfficer', wardOfficerSchema)
