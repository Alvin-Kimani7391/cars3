import mongoose from "mongoose";

const agentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    unique: true,
    required: true
  },
  isDeleted: { type: Boolean, default: false },
deletedAt: { type: Date, default: null },
}, { timestamps: true });



export default mongoose.model("Agent", agentSchema);