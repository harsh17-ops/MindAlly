import express from "express";
import { connectMongoDB } from "../lib/mongodb.js";
import { getGroqResponse } from "../services/emotionalSupportService.js";

const router = express.Router();

router.post("/chatbot", async (req, res) => {
  await connectMongoDB();
  const { userId, message } = req.body;
  const result = await getGroqResponse(userId, message);

  if (result.error) {
    return res.status(429).json({ error: result.error });
  }
  return res.status(200).json({ reply: result.reply });
});

// Example fetch call from frontend
const sendMessage = async (userId, message) => {
  const res = await fetch("/api/chatbot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, message }),
  });
  const data = await res.json();
  return data;
};

export default router;