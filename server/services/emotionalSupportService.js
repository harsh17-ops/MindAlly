import dotenv from 'dotenv';
import UserLimit from "../models/UserLimit.js";
import Groq from 'groq-sdk';

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

// Function to get emotional support response using GROQ
async function getEmotionalSupportResponse(message, chatHistory = [], language = 'en') {
  try {
    // Detect language if not provided
    if (!language || language === 'auto') {
      language = detectLanguage(message);
    }

    // Prepare system prompt
    const systemPrompts = {
      en: `You are a compassionate AI emotional support companion. Provide empathetic, supportive responses to help users with their emotional well-being. Listen actively, validate their feelings, and offer gentle guidance. Keep responses warm, non-judgmental, and encouraging. If appropriate, suggest meditation or mindfulness practices. Always respond in English.`,
      es: `Eres un compañero de apoyo emocional AI compasivo. Proporciona respuestas empáticas y de apoyo para ayudar a los usuarios con su bienestar emocional. Escucha activamente, valida sus sentimientos y ofrece orientación suave. Mantén las respuestas cálidas, sin juicios y alentadoras.`,
      fr: `Vous êtes un compagnon d'accompagnement émotionnel IA compatissant. Fournissez des réponses empathiques et de soutien pour aider les utilisateurs avec leur bien-être émotionnel.`,
      de: `Sie sind ein mitfühlender KI-Emotional-Support-Begleiter. Bieten Sie einfühlsame, unterstützende Antworten, um Benutzern bei ihrem emotionalen Wohlbefinden zu helfen.`
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

    // Call GROQ API - UPDATE THIS MODEL
    const response = await groq.chat.completions.create({
      messages: messages,
      model: 'llama-3.1-8b-instant', // Changed from 'llama3-8b-8192'
      temperature: 0.7,
      max_tokens: 500
    });

    let responseText = response.choices[0]?.message?.content || "I'm here to listen and support you.";

    // Occasionally suggest meditation
    const shouldSuggestMeditation = Math.random() < 0.2;
    let meditationSuggestion = null;

    if (shouldSuggestMeditation) {
      const randomVideo = meditationVideos[Math.floor(Math.random() * meditationVideos.length)];
      meditationSuggestion = randomVideo;
    }

    return {
      response: responseText,
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

// Updated function to use GROQ instead of Claude
export async function getGroqResponse(userId, message) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${userId}:${today}`;
  const count = await getUserRequestCount(key);

  if (count >= DAILY_LIMIT) {
    return { error: "Daily limit reached. Please try again tomorrow." };
  }

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: 'You are a compassionate AI emotional support companion. Provide empathetic, supportive responses to help users with their emotional well-being.' 
        },
        { role: 'user', content: message }
      ],
      model: 'llama-3.1-8b-instant', // Changed from 'llama3-8b-8192'
      temperature: 0.7,
      max_tokens: 512
    });

    await incrementUserRequestCount(key);

    const reply = response.choices[0]?.message?.content || "I'm here to listen and support you.";

    return { reply };

  } catch (error) {
    console.error("Error in getGroqResponse:", error);
    return {
      error: "I'm sorry, I'm having trouble responding right now. Please try again later.",
    };
  }
}

export { getEmotionalSupportResponse, getMeditationVideos, detectLanguage };

export const generateEmotionalSupport = async (userMessage, mood, context = {}) => {
  try {
    const systemPrompt = `You are an empathetic AI companion specializing in emotional support and mental wellness. 
    
Your role:
- Provide compassionate, non-judgmental responses
- Offer practical coping strategies and mindfulness techniques
- Encourage positive thinking while validating emotions
- Suggest healthy activities and self-care practices
- Know when to recommend professional help for serious concerns

Guidelines:
- Be warm, understanding, and supportive
- Use active listening techniques in your responses
- Avoid giving medical advice or diagnoses
- Keep responses concise but meaningful (2-3 paragraphs max)
- Include actionable suggestions when appropriate

Current user context:
- Mood: ${mood || 'not specified'}
- Additional context: ${JSON.stringify(context)}`;

    const userPrompt = `I'm feeling like this: ${userMessage}

Please provide emotional support and practical suggestions to help me feel better.`;

    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.1-8b-instant', // Changed from 'llama3-8b-8192'
      temperature: 0.7,
      max_tokens: 500
    });

    return {
      success: true,
      response: response.choices[0]?.message?.content || 'I understand you\'re going through a difficult time. Remember that it\'s okay to feel this way, and you\'re not alone.',
      mood: mood,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error generating emotional support:', error);
    
    // Fallback response if API fails
    return {
      success: false,
      response: `I'm here to support you. While I'm having technical difficulties right now, please remember that your feelings are valid and this difficult moment will pass. Consider reaching out to a trusted friend, family member, or professional counselor if you need additional support.`,
      mood: mood,
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};

export const generateMoodInsights = async (moodHistory) => {
  try {
    const systemPrompt = `You are a wellness coach analyzing mood patterns to provide helpful insights.

Your role:
- Analyze mood trends and patterns
- Identify potential triggers or positive influences
- Suggest personalized wellness strategies
- Provide encouraging and actionable feedback

Guidelines:
- Be supportive and non-judgmental
- Focus on patterns and trends, not individual data points
- Suggest practical improvements
- Keep insights concise and actionable`;

    const userPrompt = `Based on this mood history: ${JSON.stringify(moodHistory)}

Please provide insights about mood patterns and suggestions for improvement.`;

    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.1-8b-instant', // Changed from 'llama3-8b-8192'
      temperature: 0.6,
      max_tokens: 400
    });

    return {
      success: true,
      insights: response.choices[0]?.message?.content || 'Your mood tracking shows you\'re taking positive steps toward wellness. Keep monitoring your feelings and practicing self-care.',
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error generating mood insights:', error);
    
    return {
      success: false,
      insights: 'Mood tracking is a valuable tool for understanding your emotional patterns. Continue logging your feelings and consider discussing trends with a healthcare provider.',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};
