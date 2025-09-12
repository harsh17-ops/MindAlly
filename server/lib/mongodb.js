import mongoose from "mongoose";

export async function connectMongoDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
}

export async function getClaudeResponse(userId, message) {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.CLAUDE_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 512,
        messages: [{ role: "user", content: message }],
      }),
    });

    const data = await response.json();
    await incrementUserRequestCount(key);

    return { reply: data.content[0].text };
  } catch (error) {
    console.error("Claude API error:", error);
    return {
      error:
        "I'm sorry, I'm having trouble responding right now. Please try again later.",
    };
  }
}