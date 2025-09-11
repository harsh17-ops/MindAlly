import express from 'express';
import { getEmotionalSupportResponse, getMeditationVideos } from '../services/emotionalSupportService.js';
import { aiRateLimiter } from '../services/aiService.js';

const router = express.Router();

// In-memory storage for chat history (in production, use database)
const chatHistories = new Map();

// Apply rate limiter to chat routes
router.use('/chat', aiRateLimiter);

// Send a message and get AI response
router.post('/chat', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const { message, language = 'auto' } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required and must be a non-empty string' });
    }

    // Get or initialize chat history for this user
    if (!chatHistories.has(userId)) {
      chatHistories.set(userId, []);
    }

    const chatHistory = chatHistories.get(userId);

    // Get AI response
    const result = await getEmotionalSupportResponse(message.trim(), chatHistory, language);

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
      meditationSuggestion: result.meditationSuggestion
    });

    // Keep only last 50 messages to prevent memory issues
    if (chatHistory.length > 50) {
      chatHistory.splice(0, chatHistory.length - 50);
    }

    res.json({
      response: result.response,
      language: result.language,
      meditationSuggestion: result.meditationSuggestion,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error in emotional support chat:', error);

    // Handle rate limit errors
    if (error.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: error.retryAfter || 60
      });
    }

    res.status(500).json({
      error: 'Failed to process chat request',
      message: error.message || 'Internal server error'
    });
  }
});

// Get chat history
router.get('/history', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const chatHistory = chatHistories.get(userId) || [];

    res.json({
      history: chatHistory,
      count: chatHistory.length
    });

  } catch (error) {
    console.error('Error retrieving chat history:', error);
    res.status(500).json({ error: 'Failed to retrieve chat history' });
  }
});

// Clear chat history
router.delete('/history', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    chatHistories.delete(userId);

    res.json({ message: 'Chat history cleared successfully' });

  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

// Get meditation videos
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

// Get supported languages
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

export default router;
