import mongoose from 'mongoose'

const wardSchema = new mongoose.Schema(
  {
    wardNumber: {
      type: Number,
      required: true,
      unique: true
    },
    wardName: {
      type: String,
      required: true
    },
    geometry: {
      type: {
        type: String,
        enum: ['Polygon', 'MultiPolygon'],
        required: true
      },
      coordinates: {
        type: Array,
        required: true
      }
    }
  },
  { timestamps: true }
)

wardSchema.index({ geometry: '2dsphere' })

export default mongoose.model('Ward', wardSchema)
