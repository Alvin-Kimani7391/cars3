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
  }
}, { timestamps: true });



export default mongoose.model("Agent", agentSchema);