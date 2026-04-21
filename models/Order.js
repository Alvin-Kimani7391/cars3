import mongoose from "mongoose";

// ===============================
// ITEM SUB-SCHEMA
// ===============================
const itemSchema = new mongoose.Schema(
  {
    productId: String,
    make: String,
    model: String,
    price: Number,
    qty: {
      type: Number,
      default: 1
    },
    image: String
  },
  { _id: false }
);

// ===============================
// ORDER SCHEMA
// ===============================
const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },

  phone: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },

  location: {
    type: String,
    required: true
  },

  total: {
    type: Number,
    required: true
  },

  mpesaCode: {
    type: String,
    required: true,
    trim: true
  },

  items: {
    type: [itemSchema],
    required: true
  },

  // ✅ FULL STATUS PIPELINE
  status: {
    type: String,
    enum: [
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED"
    ],
    default: "PENDING"
  },

  // ✅ PREMIUM FEATURE (TRACKING HISTORY)
  statusHistory: [
    {
      status: String,
      date: {
        type: Date,
        default: Date.now
      }
    }
  ]

}, { timestamps: true });

// ===============================
export default mongoose.model("Order", orderSchema);