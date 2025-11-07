import express from 'express';
import { getEnhancedEmotionalSupportResponse, getMeditationVideos } from '../services/enhancedEmotionalSupportService.js';
import { aiRateLimiter } from '../services/aiService.js';

const router = express.Router();

// In-memory storage for enhanced chat history (in production, use database)
const enhancedChatHistories = new Map();

// Apply rate limiter to enhanced chat routes
router.use('/enhanced-chat', aiRateLimiter);

// Send a message and get enhanced AI response with emotion detection
router.post('/enhanced-chat', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const { message, language = 'auto' } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required and must be a non-empty string' });
    }

    // Get or initialize enhanced chat history for this user
    if (!enhancedChatHistories.has(userId)) {
      enhancedChatHistories.set(userId, []);
    }

    const chatHistory = enhancedChatHistories.get(userId);

    // Get enhanced AI response with emotion detection
    const result = await getEnhancedEmotionalSupportResponse(message.trim(), chatHistory, language);

    // Add messages to chat history
    chatHistory.push({
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
      language: result.language
    });

    chatHistory.push({
      role: 'assistant',
      content: result.response,
      timestamp: new Date(),
      language: result.language,
      meditationSuggestion: result.meditationSuggestion,
      emotionData: result.emotionData,
      isCrisis: result.isCrisis
    });

    // Keep only last 50 messages to prevent memory issues
    if (chatHistory.length > 50) {
      chatHistory.splice(0, chatHistory.length - 50);
    }

    res.json({
      response: result.response,
      language: result.language,
      meditationSuggestion: result.meditationSuggestion,
      emotionData: result.emotionData,
      isCrisis: result.isCrisis,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error in enhanced emotional support chat:', error);

    // Handle rate limit errors
    if (error.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: error.retryAfter || 60
      });
    }

    res.status(500).json({
      error: 'Failed to process enhanced chat request',
      message: error.message || 'Internal server error'
    });
  }
});

// Get enhanced chat history
router.get('/enhanced-history', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const chatHistory = enhancedChatHistories.get(userId) || [];

    res.json({
      history: chatHistory,
      count: chatHistory.length
    });

  } catch (error) {
    console.error('Error retrieving enhanced chat history:', error);
    res.status(500).json({ error: 'Failed to retrieve enhanced chat history' });
  }
});

// Clear enhanced chat history
router.delete('/enhanced-history', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    enhancedChatHistories.delete(userId);

    res.json({ message: 'Enhanced chat history cleared successfully' });

  } catch (error) {
    console.error('Error clearing enhanced chat history:', error);
    res.status(500).json({ error: 'Failed to clear enhanced chat history' });
  }
});

// Get meditation videos (shared with regular chat)
router.get('/meditation-videos', async (req, res) => {
  try {
    const videos = getMeditationVideos();

    res.json({
      videos: videos,
      count: videos.length
    });

  } catch (error) {
    console.error('Error retrieving meditation videos:', error);
    res.status(500).json({ error: 'Failed to retrieve meditation videos' });
  }
});

// Get supported languages (shared with regular chat)
router.get('/languages', async (req, res) => {
  try {
    res.json({
      languages: [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Español' },
        { code: 'fr', name: 'Français' },
        { code: 'de', name: 'Deutsch' },
        { code: 'auto', name: 'Auto-detect' }
      ]
    });

  } catch (error) {
    console.error('Error retrieving languages:', error);
    res.status(500).json({ error: 'Failed to retrieve languages' });
  }
});

// Voice-enabled emotional support endpoint
router.post('/voice-support', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const { transcription, language = 'auto', voiceContext = {} } = req.body;

    if (!transcription || typeof transcription !== 'string' || transcription.trim().length === 0) {
      return res.status(400).json({ error: 'Transcription is required and must be a non-empty string' });
    }

    // Get or initialize enhanced chat history for this user
    if (!enhancedChatHistories.has(userId)) {
      enhancedChatHistories.set(userId, []);
    }

    const chatHistory = enhancedChatHistories.get(userId);

    // Import emotion detection service
    const emotionDetectionService = (await import('../services/emotionDetectionService.js')).default;

    // Detect emotion from transcription
    const emotionData = await emotionDetectionService.detectEmotion(transcription);

    // Check for crisis
    if (emotionData.emotion === 'crisis') {
      const crisisResponse = `I'm deeply concerned about what you're sharing with me. Your life has value, and you matter.

**Immediate Help Available:**
• **Call 9152987821** - Suicide & Crisis Lifeline (India)
• **Text "HELLO" to 741741** - Crisis Text Line
• **Call 112** - Emergency services

Please reach out - professional counselors are available 24/7.`;

      // Add to chat history
      chatHistory.push({
        role: 'user',
        content: transcription.trim(),
        timestamp: new Date(),
        language: language,
        source: 'voice'
      });

      chatHistory.push({
        role: 'assistant',
        content: crisisResponse,
        timestamp: new Date(),
        language: language,
        emotionData: emotionData,
        isCrisis: true,
        source: 'voice'
      });

      return res.json({
        response: crisisResponse,
        language: language,
        emotionData: emotionData,
        isCrisis: true,
        voiceResponse: true,
        timestamp: new Date()
      });
    }

    // Get emotion context for voice response
    const emotionContext = emotionDetectionService.getEmotionContext(emotionData.emotion, emotionData.confidence);

    // Prepare voice-optimized system prompt
    const systemPrompt = `You are a compassionate AI voice assistant specializing in emotional support. You are speaking directly to the user through voice.

${emotionContext}

Voice Guidelines:
- Keep responses conversational and natural for voice
- Use shorter sentences suitable for speaking
- Include brief pauses with commas
- Be warm and empathetic
- End with a gentle question to continue the conversation
- Include one relevant emoji in text form

Current user context:
- Emotion detected: ${emotionData.emotion} (${(emotionData.confidence * 100).toFixed(0)}% confidence)
- Voice interaction: Yes
- Language: ${language}`;

    // Get Groq response for voice
    const { getEnhancedEmotionalSupportResponse } = await import('../services/enhancedEmotionalSupportService.js');

    const result = await getEnhancedEmotionalSupportResponse(transcription.trim(), chatHistory, language);

    // Add voice context to response
    const voiceResponse = result.response.replace(/([.!?])\s+/g, '$1, '); // Add pauses

    // Add to chat history
    chatHistory.push({
      role: 'user',
      content: transcription.trim(),
      timestamp: new Date(),
      language: language,
      source: 'voice'
    });

    chatHistory.push({
      role: 'assistant',
      content: voiceResponse,
      timestamp: new Date(),
      language: language,
      emotionData: emotionData,
      isCrisis: false,
      source: 'voice'
    });

    // Keep only last 50 messages
    if (chatHistory.length > 50) {
      chatHistory.splice(0, chatHistory.length - 50);
    }

    res.json({
      response: voiceResponse,
      language: language,
      emotionData: emotionData,
      isCrisis: false,
      voiceResponse: true,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error in voice emotional support:', error);

    // Handle rate limit errors
    if (error.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: error.retryAfter || 60
      });
    }

    res.status(500).json({
      error: 'Failed to process voice support request',
      message: error.message || 'Internal server error'
    });
  }
});

// Test emotion detection endpoint
router.post('/test-emotion', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    // Import emotion detection service
    const emotionDetectionService = (await import('../services/emotionDetectionService.js')).default;
    const emotionData = await emotionDetectionService.detectEmotion(message);

    res.json({
      message: message,
      emotionData: emotionData,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error testing emotion detection:', error);
    res.status(500).json({
      error: 'Failed to test emotion detection',
      message: error.message
    });
  }
});

export default router;
