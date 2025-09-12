import dotenv from 'dotenv';
import UserLimit from "../models/UserLimit.js";
import fetch from "node-fetch";

// Initialize dotenv
dotenv.config();

if (!process.env.CLAUDE_API_KEY) {
  throw new Error('CLAUDE_API_KEY is not set in environment variables');
}

// Curated list of guided meditation videos
const meditationVideos = [
  {
    title: "10-Minute Guided Meditation for Anxiety",
    url: "https://www.youtube.com/watch?v=4pLUleLdwY4",
    duration: "10 min",
    description: "A calming meditation to help reduce anxiety and stress"
  },
  {
    title: "Sleep Meditation: Guided Sleep Story",
    url: "https://www.youtube.com/watch?v=8fxC2qPjHkU",
    duration: "30 min",
    description: "Relaxing guided meditation to help you fall asleep peacefully"
  },
  {
    title: "Morning Meditation for Positive Energy",
    url: "https://www.youtube.com/watch?v=2OGYf8H6M6g",
    duration: "15 min",
    description: "Start your day with positive energy and mindfulness"
  },
  {
    title: "Breathing Exercises for Stress Relief",
    url: "https://www.youtube.com/watch?v=4Lb5L-VEm34",
    duration: "5 min",
    description: "Simple breathing techniques to calm your mind"
  },
  {
    title: "Body Scan Meditation for Relaxation",
    url: "https://www.youtube.com/watch?v=Hz_KNs0q3wE",
    duration: "20 min",
    description: "Progressive relaxation through body awareness"
  }
];

// Function to detect language from text
function detectLanguage(text) {
  // Simple language detection based on common words
  const englishWords = /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/i;
  const spanishWords = /\b(el|la|los|las|y|o|pero|en|sobre|a|para|de|con|por)\b/i;
  const frenchWords = /\b(le|la|les|et|ou|mais|dans|sur|à|pour|de|avec|par)\b/i;
  const germanWords = /\b(der|die|das|und|oder|aber|in|auf|zu|für|von|mit|durch)\b/i;

  if (spanishWords.test(text)) return 'es';
  if (frenchWords.test(text)) return 'fr';
  if (germanWords.test(text)) return 'de';
  return 'en'; // Default to English
}

// Function to get emotional support response
async function getEmotionalSupportResponse(message, chatHistory = [], language = 'en') {
  try {
    // Detect language if not provided
    if (!language || language === 'auto') {
      language = detectLanguage(message);
    }

    // Prepare system prompt based on language
    const systemPrompts = {
      en: `You are a compassionate AI emotional support companion. Provide empathetic, supportive responses to help users with their emotional well-being. Listen actively, validate their feelings, and offer gentle guidance. Keep responses warm, non-judgmental, and encouraging. If appropriate, suggest meditation or mindfulness practices. Always respond in English.`,
      es: `Eres un compañero de apoyo emocional AI compasivo. Proporciona respuestas empáticas y de apoyo para ayudar a los usuarios con su bienestar emocional. Escucha activamente, valida sus sentimientos y ofrece una guía suave. Mantén las respuestas cálidas, sin juzgar y alentadoras. Si es apropiado, sugiere meditación o prácticas de atención plena. Siempre responde en español.`,
      fr: `Vous êtes un compagnon d'accompagnement émotionnel IA compatissant. Fournissez des réponses empathiques et de soutien pour aider les utilisateurs avec leur bien-être émotionnel. Écoutez activement, validez leurs sentiments et offrez une guidance douce. Gardez les réponses chaleureuses, non-jugeantes et encourageantes. Si approprié, suggérez la méditation ou les pratiques de pleine conscience. Répondez toujours en français.`,
      de: `Sie sind ein mitfühlender KI-Emotional-Support-Begleiter. Bieten Sie empathische, unterstützende Antworten, um Benutzern bei ihrem emotionalen Wohlbefinden zu helfen. Hören Sie aktiv zu, validieren Sie ihre Gefühle und bieten Sie sanfte Führung. Halten Sie Antworten warm, nicht urteilend und ermutigend. Wenn angemessen, schlagen Sie Meditation oder Achtsamkeitspraktiken vor. Antworten Sie immer auf Deutsch.`
    };

    const systemPrompt = systemPrompts[language] || systemPrompts.en;

    // Prepare chat history for context
    const contextMessages = chatHistory.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Prepare messages for Claude API (Claude uses 'human' and 'assistant', system is separate)
    const claudeMessages = [];
    let systemMessage = systemPrompt;

    // Add context messages
    contextMessages.forEach(msg => {
      if (msg.role === 'user') {
        claudeMessages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        claudeMessages.push({ role: 'assistant', content: msg.content });
      }
    });

    // Add current user message
    claudeMessages.push({ role: 'user', content: message });

    // Call Claude API
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.CLAUDE_API_KEY,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        system: systemMessage,
        messages: claudeMessages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!claudeResponse.ok) {
      throw new Error(`Claude API error: ${claudeResponse.status} ${claudeResponse.statusText}`);
    }

    const data = await claudeResponse.json();
    const response = data.content[0]?.text || "I'm here to listen and support you.";

    // Occasionally suggest meditation (about 20% of the time)
    const shouldSuggestMeditation = Math.random() < 0.2;
    let meditationSuggestion = null;

    if (shouldSuggestMeditation) {
      const randomVideo = meditationVideos[Math.floor(Math.random() * meditationVideos.length)];
      meditationSuggestion = {
        title: randomVideo.title,
        url: randomVideo.url,
        duration: randomVideo.duration,
        description: randomVideo.description
      };
    }

    return {
      response: response,
      language: language,
      meditationSuggestion: meditationSuggestion
    };

  } catch (error) {
    console.error('Error in emotional support response:', error);
    return {
      response: "I'm sorry, I'm having trouble responding right now. Please try again later.",
      language: language,
      meditationSuggestion: null
    };
  }
}

// Function to get meditation videos
function getMeditationVideos() {
  return meditationVideos;
}

const DAILY_LIMIT = 10; // Max requests per user per day

// Get the current count for a user for today
export async function getUserRequestCount(key) {
  const record = await UserLimit.findOne({ key });
  return record ? record.count : 0;
}

// Increment the count for a user for today
export async function incrementUserRequestCount(key) {
  const record = await UserLimit.findOne({ key });
  if (record) {
    record.count += 1;
    record.updatedAt = new Date();
    await record.save();
  } else {
    await UserLimit.create({ key, count: 1, updatedAt: new Date() });
  }
}

export async function getClaudeResponse(userId, message) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${userId}:${today}`;
  const count = await getUserRequestCount(key);

  if (count >= DAILY_LIMIT) {
    return { error: "Daily limit reached. Please try again tomorrow." };
  }

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

export { getEmotionalSupportResponse, getMeditationVideos, detectLanguage };
