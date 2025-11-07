import dotenv from 'dotenv';
import UserLimit from "../models/UserLimit.js";
import Groq from 'groq-sdk';
import emotionDetectionService from './emotionDetectionService.js';

// Initialize dotenv
dotenv.config();

if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is not set in environment variables');
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

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
  const englishWords = /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/i;
  const spanishWords = /\b(el|la|los|las|y|o|pero|en|sobre|a|para|de|con|por)\b/i;
  const frenchWords = /\b(le|la|les|et|ou|mais|dans|sur|à|pour|de|avec|par)\b/i;
  const germanWords = /\b(der|die|das|und|oder|aber|in|auf|zu|für|von|mit|durch)\b/i;

  if (spanishWords.test(text)) return 'es';
  if (frenchWords.test(text)) return 'fr';
  if (germanWords.test(text)) return 'de';
  return 'en'; // Default to English
}

// Enhanced emotional support response with emotion detection
async function getEnhancedEmotionalSupportResponse(message, chatHistory = [], language = 'en') {
  try {
    // Detect language if not provided
    if (!language || language === 'auto') {
      language = detectLanguage(message);
    }

    // Detect emotion using our new service
    const emotionData = await emotionDetectionService.detectEmotion(message);
    const emotionContext = emotionDetectionService.getEmotionContext(emotionData.emotion, emotionData.confidence);

    // Check for crisis
    if (emotionData.emotion === 'crisis') {
      return {
        response: `I'm deeply concerned about what you're sharing with me. Your life has value, and you matter.

**Immediate Help Available:**
• **Call 9152987821** - Suicide & Crisis Lifeline (India)
• **Text "HELLO" to 741741** - Crisis Text Line
• **Call 112** - Emergency services

**International:**
• **UK**: 116 123 (Samaritans)
• **Canada**: 1-833-456-4566
• **Australia**: 13 11 14 (Lifeline)

Please reach out - professional counselors are available 24/7.`,
        language: language,
        emotionData: emotionData,
        meditationSuggestion: null,
        isCrisis: true
      };
    }

    // Prepare system prompt with emotion context
    const systemPrompts = {
      en: `You are a compassionate AI emotional support companion with advanced emotion detection capabilities. Provide empathetic, supportive responses to help users with their emotional well-being.

${emotionContext}

Guidelines:
- Listen actively and validate their feelings
- Offer gentle guidance and practical coping strategies
- Keep responses warm, non-judgmental, and encouraging
- If appropriate, suggest meditation or mindfulness practices
- Always respond in English
- Include one relevant emoji in your response`,
      es: `Eres un compañero de apoyo emocional AI compasivo con capacidades avanzadas de detección de emociones. Proporciona respuestas empáticas y de apoyo para ayudar a los usuarios con su bienestar emocional.

${emotionContext}

Directrices:
- Escucha activamente y valida sus sentimientos
- Ofrece orientación suave y estrategias prácticas de afrontamiento
- Mantén las respuestas cálidas, sin juicios y alentadoras`,
      fr: `Vous êtes un compagnon d'accompagnement émotionnel IA compatissant avec des capacités avancées de détection d'émotions. Fournissez des réponses empathiques et de soutien pour aider les utilisateurs avec leur bien-être émotionnel.

${emotionContext}`,
      de: `Sie sind ein mitfühlender KI-Emotional-Support-Begleiter mit fortschrittlichen Emotionserkennungsfunktionen. Bieten Sie einfühlsame, unterstützende Antworten, um Benutzern bei ihrem emotionalen Wohlbefinden zu helfen.

${emotionContext}`
    };

    const systemMessage = systemPrompts[language] || systemPrompts.en;

    // Prepare chat history for GROQ
    const messages = [
      { role: 'system', content: systemMessage }
    ];

    // Add chat history
    chatHistory.slice(-5).forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    // Add current user message
    messages.push({ role: 'user', content: message });

    // Call GROQ API
    const response = await groq.chat.completions.create({
      messages: messages,
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 500
    });

    let responseText = response.choices[0]?.message?.content || "I'm here to listen and support you.";

    // Occasionally suggest meditation (more likely for certain emotions)
    const shouldSuggestMeditation = Math.random() < (emotionData.emotion === 'fear' || emotionData.emotion === 'sadness' ? 0.4 : 0.2);
    let meditationSuggestion = null;

    if (shouldSuggestMeditation) {
      const randomVideo = meditationVideos[Math.floor(Math.random() * meditationVideos.length)];
      meditationSuggestion = randomVideo;
    }

    return {
      response: responseText,
      language: language,
      emotionData: emotionData,
      meditationSuggestion: meditationSuggestion,
      isCrisis: false
    };

  } catch (error) {
    console.error('Error in enhanced emotional support response:', error);
    return {
      response: "I'm sorry, I'm having trouble responding right now. Please try again later.",
      language: language,
      emotionData: null,
      meditationSuggestion: null,
      isCrisis: false
    };
  }
}

// Function to get meditation videos
function getMeditationVideos() {
  return meditationVideos;
}

const DAILY_LIMIT = 10;

// Get the current count for a user
export async function getUserRequestCount(key) {
  const record = await UserLimit.findOne({ key });
  return record ? record.count : 0;
}

// Increment the count for a user
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

// Enhanced function with emotion detection
export async function getEnhancedGroqResponse(userId, message) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${userId}:${today}`;
  const count = await getUserRequestCount(key);

  if (count >= DAILY_LIMIT) {
    return { error: "Daily limit reached. Please try again tomorrow." };
  }

  try {
    // Get emotion data
    const emotionData = await emotionDetectionService.detectEmotion(message);

    // Check for crisis
    if (emotionData.emotion === 'crisis') {
      await incrementUserRequestCount(key);
      return {
        reply: `I'm deeply concerned about what you're sharing with me. Your life has value, and you matter.

**Immediate Help Available:**
• **Call 9152987821** - Suicide & Crisis Lifeline (India)
• **Text "HELLO" to 741741** - Crisis Text Line
• **Call 112** - Emergency services

Please reach out - professional counselors are available 24/7.`,
        emotionData: emotionData,
        isCrisis: true
      };
    }

    const emotionContext = emotionDetectionService.getEmotionContext(emotionData.emotion, emotionData.confidence);

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a compassionate AI emotional support companion with advanced emotion detection.

${emotionContext}

Provide empathetic, supportive responses. Include one relevant emoji. Keep responses warm and encouraging.`
        },
        { role: 'user', content: message }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 512
    });

    await incrementUserRequestCount(key);

    const reply = response.choices[0]?.message?.content || "I'm here to listen and support you.";

    return {
      reply,
      emotionData,
      isCrisis: false
    };

  } catch (error) {
    console.error("Error in enhanced getGroqResponse:", error);
    return {
      error: "I'm sorry, I'm having trouble responding right now. Please try again later.",
      emotionData: null,
      isCrisis: false
    };
  }
}

export { getEnhancedEmotionalSupportResponse, getMeditationVideos, detectLanguage };
