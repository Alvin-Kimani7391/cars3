import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  make: { type: String, required: true, trim: true },
  model: { type: String, default: "", trim: true },
  category: { type: String, required: true, trim: true },
  general: { type: String, default: "" },

  description: { type: String, required: true },

  year: {
    type: Number,
    min: 1900,
    max: new Date().getFullYear() + 1
  },

  color: { type: String },

  price: {
    type: Number,
    required: true,
    min: 0
  },

  oldPrice: {
    type: Number,
    min: 0
  },

  image: {
    type: [String],
    default: [],
    required: true
  }
}, { timestamps: true });

export default mongoose.model("Product", productSchema);