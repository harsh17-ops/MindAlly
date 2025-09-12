import mongoose from "mongoose";

const UserLimitSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // Format: userId:YYYY-MM-DD
  count: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.UserLimit || mongoose.model("UserLimit", UserLimitSchema);