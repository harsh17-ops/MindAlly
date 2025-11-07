import fetch from 'node-fetch';

// Emotion detection service - ported from chatbot.py
class EmotionDetectionService {
  constructor() {
    this.huggingFaceApiKey = process.env.HUGGINGFACE_API_KEY;
    this.modelUrl = 'https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base';
  }

  // Crisis detection keywords (from chatbot.py)
  getCrisisKeywords() {
    return [
      "suicide", "kill myself", "end my life", "want to die", "better off dead",
      "self harm", "hurt myself", "cut myself", "end it all", "no point living"
    ];
  }

  // Detect crisis content
  detectCrisis(text) {
    const textLower = text.toLowerCase();
    const keywords = this.getCrisisKeywords();
    return keywords.some(keyword => textLower.includes(keyword));
  }

  // Fallback emotion detection using keywords
  fallbackEmotionDetection(text) {
    const textLower = text.toLowerCase();

    const keywords = {
      "joy": ["happy", "excited", "joy", "wonderful", "amazing", "great", "love", "adore", "cherish"],
      "sadness": ["sad", "depressed", "upset", "hurt", "crying", "unhappy", "miserable"],
      "anger": ["angry", "mad", "furious", "frustrated", "hate", "rage"],
      "fear": ["scared", "afraid", "worried", "anxious", "nervous", "terrified", "panic"],
      "surprise": ["surprised", "shocked", "amazed", "wow", "unexpected"],
      "disgust": ["disgusted", "gross", "repulsive", "sick", "nauseous"]
    };

    const scores = {};
    for (const [emotion, words] of Object.entries(keywords)) {
      const score = words.reduce((count, word) => count + (textLower.includes(word) ? 1 : 0), 0);
      if (score > 0) {
        scores[emotion] = score / words.length;
      }
    }

    if (Object.keys(scores).length === 0) {
      return { emotion: "neutral", confidence: 0.5, allEmotions: { neutral: 0.5 } };
    }

    const topEmotion = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b);
    return {
      emotion: topEmotion[0],
      confidence: topEmotion[1],
      allEmotions: scores
    };
  }

  // Main emotion detection using Hugging Face API
  async detectEmotion(text) {
    if (!text || !text.trim()) {
      return { emotion: "neutral", confidence: 0.5, allEmotions: { neutral: 0.5 } };
    }

    // Check for crisis first
    if (this.detectCrisis(text)) {
      return { emotion: "crisis", confidence: 1.0, allEmotions: { crisis: 1.0 } };
    }

    try {
      // Try Hugging Face API first
      if (this.huggingFaceApiKey) {
        const response = await fetch(this.modelUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.huggingFaceApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ inputs: text })
        });

        if (response.ok) {
          const results = await response.json();

          if (Array.isArray(results) && results[0] && Array.isArray(results[0])) {
            const emotions = {};
            results[0].forEach(result => {
              emotions[result.label.toLowerCase()] = result.score;
            });

            const topEmotion = Object.entries(emotions).reduce((a, b) => a[1] > b[1] ? a : b);

            return {
              emotion: topEmotion[0],
              confidence: topEmotion[1],
              allEmotions: emotions,
              method: "huggingface_transformer"
            };
          }
        }
      }

      // Fallback to keyword detection
      const fallbackResult = this.fallbackEmotionDetection(text);
      return {
        ...fallbackResult,
        method: "keyword_fallback"
      };

    } catch (error) {
      console.error('Emotion detection error:', error);

      // Return fallback result
      const fallbackResult = this.fallbackEmotionDetection(text);
      return {
        ...fallbackResult,
        method: "keyword_fallback_error"
      };
    }
  }

  // Get emotion context for AI responses
  getEmotionContext(emotion, confidence) {
    const contexts = {
      "joy": `The user is experiencing joy (confidence: ${(confidence * 100).toFixed(0)}%). Match their energy with enthusiasm and positivity.`,
      "sadness": `The user is feeling sad (confidence: ${(confidence * 100).toFixed(0)}%). Respond with deep empathy and compassion.`,
      "anger": `The user is angry (confidence: ${(confidence * 100).toFixed(0)}%). Stay calm and acknowledge their frustration.`,
      "fear": `The user is experiencing fear/anxiety (confidence: ${(confidence * 100).toFixed(0)}%). Provide reassurance and support.`,
      "love": `The user is expressing love (confidence: ${(confidence * 100).toFixed(0)}%). Respond warmly and celebrate their feelings.`,
      "surprise": `The user is surprised (confidence: ${(confidence * 100).toFixed(0)}%). Show genuine curiosity and interest.`,
      "disgust": `The user is feeling disgusted (confidence: ${(confidence * 100).toFixed(0)}%). Acknowledge their strong reaction.`,
      "neutral": `The user's emotional state is unclear (confidence: ${(confidence * 100).toFixed(0)}%). Be warm and supportive.`,
      "crisis": `CRISIS DETECTED: The user is expressing suicidal thoughts or self-harm intentions. Provide immediate crisis resources and professional help information.`
    };

    return contexts[emotion] || contexts["neutral"];
  }
}

export default new EmotionDetectionService();
