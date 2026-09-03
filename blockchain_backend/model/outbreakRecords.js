const mongoose = require("mongoose");

const outbreakSchema = new mongoose.Schema(
  {
    verifiedBy: {
      type: String,
      trim: true,
      default: null,
    },
    submittedBy: {
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [
          /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
          "Please enter a valid email",
        ],
      },
      phoneNumber: {
        type: String,
        trim: true,
        match: [/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number"],
      },
    },

    location: {
      country: {
        type: String,
        required: true,
        trim: true,
        index: true,
        lowercase: true,
        maxlength: 100,
        default: "india",
      },
      state: {
        type: String,
        required: true,
        trim: true,
        index: true,
        lowercase: true,
        maxlength: 100,
      },
      district: {
        type: String,
        required: true,
        trim: true,
        index: true,
        lowercase: true,
        maxlength: 100,
      },
      pincode: {
        type: String,
        trim: true,
        match: [/^\d{5,6}$/, "Please enter a valid pincode"],
      },
      address: {
        type: String,
        trim: true,
        maxlength: 500,
      },

      // Coordinates for mapping (required by frontend)
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
        validate: {
          validator: function (v) {
            return v !== null && v !== undefined && !isNaN(v);
          },
          message: "Latitude is required and must be a valid number",
        },
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
        validate: {
          validator: function (v) {
            return v !== null && v !== undefined && !isNaN(v);
          },
          message: "Longitude is required and must be a valid number",
        },
      },

      // Optional Google Maps Integration (can be generated from coordinates)
      googleMapsLink: {
        type: String,
        trim: true,
        // Auto-generate from coordinates if not provided
        default: function () {
          if (this.latitude && this.longitude) {
            return `https://www.google.com/maps?q=${this.latitude},${this.longitude}`;
          }
          return null;
        },
      },
    },

    // Individual components that make up the combined description
    descriptionComponents: {
      reportType: {
        type: String,
        required: true,
        lowercase: true,
        enum: ["outbreak", "health_survey", "emergency"],
        index: true,
        default: "outbreak",
      },

      diseaseCategory: {
        type: String,
        required: true,
        lowercase: true,
        index: true,
        enum: [
          "respiratory",
          "gastrointestinal",
          "vector_borne",
          "waterborne",
          "foodborne",
          "skin",
          "neurological",
          "other",
        ],
      },
      suspectedCases: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      basicInfo: {
        type: String,
        trim: true,
        maxlength: 1000,
      },
      symptoms: {
        type: String,
        trim: true,
        maxlength: 1000, // Increased from 100 to allow detailed symptom descriptions
      },
      additionalNotes: {
        type: String,
        trim: true,
        maxlength: 1000,
      },
    },

    severity: {
      type: String,
      enum: ["low", "moderate", "high", "critical"],
      lowercase: true,
      required: true,
      default: "moderate",
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    tampered: {
      type: Boolean,
      default: false,
    },

    // Images are optional in the frontend
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function (v) {
          // Allow empty arrays, but if images exist, validate paths
          return v.every((img) => typeof img === "string" && img.length > 0);
        },
        message: "All image paths must be valid strings",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for geospatial queries (useful for location-based searches)
outbreakSchema.index({ "location.latitude": 1, "location.longitude": 1 });

// Compound indexes for common query patterns
outbreakSchema.index({
  "location.country": 1,
  "location.state": 1,
  isActive: 1,
  createdAt: -1,
});

outbreakSchema.index({
  "descriptionComponents.severity": 1,
  "descriptionComponents.diseaseCategory": 1,
  isActive: 1,
});

// Pre-save middleware to generate Google Maps link if not provided
outbreakSchema.pre("save", function (next) {
  if (
    this.location.latitude &&
    this.location.longitude &&
    !this.location.googleMapsLink
  ) {
    this.location.googleMapsLink = `https://www.google.com/maps?q=${this.location.latitude},${this.location.longitude}`;
  }
  next();
});

// Virtual for formatted location string
outbreakSchema.virtual("formattedLocation").get(function () {
  const { district, state, country } = this.location;
  return `${district}, ${state}, ${country}`
    .replace(/,\s*,/g, ",")
    .replace(/^,\s*|,\s*$/g, "");
});

// Virtual for checking if report is recent (within 7 days)
outbreakSchema.virtual("isRecent").get(function () {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return this.createdAt >= sevenDaysAgo;
});

// Ensure virtuals are included when converting to JSON
outbreakSchema.set("toJSON", { virtuals: true });
outbreakSchema.set("toObject", { virtuals: true });

const OUT = mongoose.model("outbreakinfo", outbreakSchema);

module.exports = OUT;
