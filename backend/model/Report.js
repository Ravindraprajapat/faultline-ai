import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    // 🔹 Who reported
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🔹 Uploaded image
    imageUrl: {
      type: String,
      required: true,
    },

    // 🔹 Location
    location: {
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
      address: String,
      ward: {
        type: String,
        default: 'Unknown'
      }
    },

    // 🔹 AI Analysis Result
    aiAnalysis: {
      detectedType: {
        type: String,
        enum: [
          "POTHOLE",
          "ROAD_CRACK",
          "GARBAGE",
          "STREETLIGHT",
          "WATER_LEAK",
          "OTHER",
        ],
      },
      confidence: {
        type: Number, // 0 to 1
      },
    },

    // 🔹 Final Computed Severity Score (1–10)
    severityScore: {
      type: Number,
      min: 1,
      max: 10,
    },

    // 🔹 Priority decided from severity
    priorityLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
    },

    // 🔹 Complaint lifecycle
    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "RESOLVED"],
      default: "PENDING",
    },

    // 🔹 Assigned Admin
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);