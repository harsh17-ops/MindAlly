import requests
import json
import os
import random
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch

# Global variables for models
emotion_classifier = None
sentiment_analyzer = None

def load_models():
    """Load transformer models for emotion detection"""
    global emotion_classifier, sentiment_analyzer
    
    try:
        print("Loading emotion detection model...")
        # Primary emotion detection model - trained on GoEmotions-like data
        emotion_classifier = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            top_k=None,  # Return all emotion scores
            device=-1  # CPU
        )
        print(" Emotion model loaded successfully")
        
        # Backup sentiment analyzer
        sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english",
            device=-1
        )
        print(" Sentiment model loaded successfully")
        
        return True
    except Exception as e:
        print(f" Error loading models: {e}")
        return False

# Crisis detection keywords
CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end my life", "want to die", "better off dead",
    "self harm", "hurt myself", "cut myself", "end it all", "no point living"
]

# Enhanced response templates
RESPONSE_TEMPLATES = {
    "joy": [
        "That's absolutely wonderful!  Your happiness is truly contagious! I can feel the positive energy radiating from your words.",
        "I'm beaming with joy reading this!  It's so beautiful to see someone experiencing such happiness.",
        "This is fantastic news!  I love hearing when people are thriving and feeling great!"
    ],
    "sadness": [
        "I can hear the pain in your words, and I want you to know that I'm here with you.  What you're feeling is completely valid.",
        "My heart goes out to you during this difficult time.  You don't have to carry this burden alone.",
        "I'm so sorry you're going through this.  Your feelings matter, and it's brave of you to reach out."
    ],
    "anger": [
        "I can feel the intensity of your anger, and I want you to know that your feelings are valid.  Let's work through this together.",
        "Your frustration is coming through loud and clear.  Anger often signals something important has been threatened.",
        "I hear you, and I understand why you're feeling this way.  Let's channel this constructively."
    ],
    "fear": [
        "I can sense your fear, and I want you to know that you're brave for sharing this.  You're not alone.",
        "What you're feeling sounds really scary.  Fear is natural, but courage is moving forward despite it.",
        "I hear the worry in your voice.  Let's break this down into manageable pieces together."
    ],
    "surprise": [
        "Wow!  I can practically feel your surprise! Life has a way of throwing curveballs when we least expect them.",
        "That sounds absolutely incredible!  I love how life can surprise us in unexpected ways.",
        "What an absolutely stunning surprise!  Life really knows how to keep us on our toes!"
    ],
    "disgust": [
        "I can sense your strong reaction to this.  Sometimes we encounter things that really don't sit well with us.",
        "Your response is completely understandable.  When something goes against our values, it creates these intense feelings."
    ],
    "neutral": [
        "I'm here and ready to listen.  What's on your mind today?",
        "Thank you for sharing with me. I appreciate you taking the time to connect.",
        "I'm glad you're here.  How has your day been treating you?"
    ],
    "love": [
        "The warmth and love in your message is beautiful!  Love is one of the most powerful forces.",
        "I can feel the deep affection in your words.  Love makes life so much richer and meaningful."
    ]
}

CRISIS_RESPONSE = """I'm deeply concerned about what you're sharing with me.  Your life has value, and you matter.

 **Immediate Help Available:**
• **Call 9152987821** - Suicide & Crisis Lifeline (India)
• **Text "HELLO" to 741741** - Crisis Text Line
• **Call 112** - Emergency services

**International:**
• **UK**: 116 123 (Samaritans)
• **Canada**: 1-833-456-4566
• **Australia**: 13 11 14 (Lifeline)

Please reach out - professional counselors are available 24/7."""

def detect_crisis(text):
    """Detect crisis/self-harm content"""
    text_lower = text.lower()
    for keyword in CRISIS_KEYWORDS:
        if keyword in text_lower:
            return True
    return False

def transformer_emotion_detection(text):
    """
    Emotion detection using DistilRoBERTa transformer model
    Returns: emotion, confidence, all_scores
    """
    if not emotion_classifier:
        return fallback_emotion_detection(text)
    
    try:
        # Get predictions from transformer model
        results = emotion_classifier(text)[0]
        
        # Parse results
        emotion_scores = {}
        for result in results:
            emotion = result['label'].lower()
            score = result['score']
            emotion_scores[emotion] = score
        
        # Get top emotion
        top_emotion = max(emotion_scores.items(), key=lambda x: x[1])
        
        return top_emotion[0], top_emotion[1], emotion_scores
        
    except Exception as e:
        print(f"Transformer detection error: {e}")
        return fallback_emotion_detection(text)

def fallback_emotion_detection(text):
    """Fallback rule-based detection if transformer fails"""
    text_lower = text.lower()
    
    keywords = {
        "joy": ["happy", "excited", "joy", "wonderful", "amazing", "great"],
        "sadness": ["sad", "depressed", "upset", "hurt", "crying"],
        "anger": ["angry", "mad", "furious", "frustrated"],
        "fear": ["scared", "afraid", "worried", "anxious", "nervous"],
        "love": ["love", "adore", "cherish", "affection"],
        "surprise": ["surprised", "shocked", "amazed", "wow"]
    }
    
    scores = {}
    for emotion, words in keywords.items():
        score = sum(1 for word in words if word in text_lower)
        if score > 0:
            scores[emotion] = score / len(words)
    
    if not scores:
        return "neutral", 0.5, {"neutral": 0.5}
    
    top = max(scores.items(), key=lambda x: x[1])
    return top[0], top[1], scores

def call_claude_api(message, emotion, confidence):
    """Enhanced Claude API call with emotion context"""
    api_key = os.getenv("CLAUDE_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
    
    if not api_key:
        return None, "No API key"
    
    try:
        emotion_contexts = {
            "joy": f"The user is experiencing joy (confidence: {confidence:.0%}). Match their energy with enthusiasm.",
            "sadness": f"The user is feeling sad (confidence: {confidence:.0%}). Respond with deep empathy and compassion.",
            "anger": f"The user is angry (confidence: {confidence:.0%}). Stay calm and acknowledge their frustration.",
            "fear": f"The user is experiencing fear/anxiety (confidence: {confidence:.0%}). Provide reassurance.",
            "love": f"The user is expressing love (confidence: {confidence:.0%}). Respond warmly and celebrate their feelings.",
            "surprise": f"The user is surprised (confidence: {confidence:.0%}). Show genuine curiosity and interest.",
            "disgust": f"The user is feeling disgusted (confidence: {confidence:.0%}). Acknowledge their strong reaction.",
            "neutral": f"The user's emotional state is unclear (confidence: {confidence:.0%}). Be warm and supportive."
        }
        
        system_prompt = f"You are an empathetic AI assistant. {emotion_contexts.get(emotion, emotion_contexts['neutral'])}\n\n"
        system_prompt += "Respond in 2-4 sentences with genuine warmth. Include one relevant emoji. Focus on understanding and connection."
        
        headers = {
            "x-api-key": api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        data = {
            "model": "claude-3-haiku-20240307",
            "max_tokens": 200,
            "temperature": 0.8,
            "system": system_prompt,
            "messages": [{"role": "user", "content": message}]
        }
        
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return result["content"][0]["text"].strip(), "Claude API + Transformer"
        else:
            return None, f"API Error: {response.status_code}"
    
    except Exception as e:
        return None, f"Exception: {str(e)}"

def get_template_response(emotion):
    """Get template response for emotion"""
    responses = RESPONSE_TEMPLATES.get(emotion, RESPONSE_TEMPLATES["neutral"])
    return random.choice(responses)

def format_emotion_analysis(emotion, confidence, all_emotions, response_source):
    """Format emotion analysis display"""
    analysis = f" **Detected Emotion:** {emotion.title()} ({confidence:.0%} confidence)\n"
    analysis += f" **Detection Method:** Transformer Model (DistilRoBERTa)\n"
    analysis += f" **Response Source:** {response_source}\n\n"
    
    analysis += " **Emotion Breakdown (Transformer Output):**\n"
    
    # Sort and display top emotions
    sorted_emotions = sorted(all_emotions.items(), key=lambda x: x[1], reverse=True)
    for i, (emo, score) in enumerate(sorted_emotions[:6]):
        if score > 0.05:  # Show emotions above 5%
            bar_length = int(score * 15)
            bar = "█" * bar_length + "░" * (15 - bar_length)
            analysis += f"• {emo.title()}: {bar} {score:.1%}\n"
    
    return analysis

def enhanced_chat_bot(message):
    """Main chat function with transformer-based emotion detection"""
    if not message or not message.strip():
        return ("Hello! I'm your emotional support companion powered by transformer AI. 🌟\n\n"
                "I use DistilRoBERTa transformer model for emotion detection and Claude for empathetic responses. "
                "Share what's on your mind!",
                "Waiting for your message...")
    
    message = message.strip()
    
    # Crisis detection first
    if detect_crisis(message):
        return CRISIS_RESPONSE, " **CRISIS DETECTED** - Immediate help recommended"
    
    # Transformer-based emotion detection
    emotion, confidence, all_emotions = transformer_emotion_detection(message)
    
    # Generate response using Claude API
    claude_response, source = call_claude_api(message, emotion, confidence)
    
    if claude_response:
        bot_response = claude_response
        response_source = source
    else:
        bot_response = get_template_response(emotion)
        response_source = "Transformer + Template"
    
    # Format emotion analysis
    emotion_info = format_emotion_analysis(emotion, confidence, all_emotions, response_source)
    
    return bot_response, emotion_info

def api_chat_response(message):
    """API endpoint with transformer results"""
    if not message or not message.strip():
        return json.dumps({"error": "No message provided"}, indent=2)
    
    message = message.strip()
    
    if detect_crisis(message):
        result = {
            "input": message,
            "crisis_detected": True,
            "emotion_analysis": {
                "primary_emotion": "crisis",
                "confidence": 1.0,
                "detection_method": "keyword_matching",
                "all_emotions": {"crisis": 1.0}
            },
            "response": CRISIS_RESPONSE,
            "safety_warning": True
        }
    else:
        emotion, confidence, all_emotions = transformer_emotion_detection(message)
        claude_response, source = call_claude_api(message, emotion, confidence)
        response = claude_response if claude_response else get_template_response(emotion)
        
        result = {
            "input": message,
            "crisis_detected": False,
            "emotion_analysis": {
                "primary_emotion": emotion,
                "confidence": confidence,
                "detection_method": "distilroberta_transformer",
                "model": "j-hartmann/emotion-english-distilroberta-base",
                "all_emotions": all_emotions
            },
            "response": response,
            "response_source": source,
            "safety_warning": False
        }
    
    return json.dumps(result, indent=2)

# Initialize models at startup
print("Initializing transformer models...")
models_loaded = load_models()

if not models_loaded:
    print(" Running with fallback detection (models failed to load)")

# Import and setup Gradio
try:
    import gradio as gr
    
    # Create chat interface
    chat_interface = gr.Interface(
        fn=enhanced_chat_bot,
        inputs=gr.Textbox(
            label="Your Message",
            placeholder="Tell me how you're feeling...",
            lines=3
        ),
        outputs=[
            gr.Textbox(label="AI Response", lines=5),
            gr.Textbox(label="Emotion Analysis (Transformer)", lines=10)
        ],
        title=" Emotion Support Chatbot ",
        examples=[
            ["I'm so excited about my promotion at work!"],
            ["Feeling really down after the breakup"],
            ["This traffic is making me so frustrated"],
            ["I'm nervous about my presentation tomorrow"],
            ["I love spending quality time with my family"]
        ],
        theme="soft"
    )
    
    # Create API interface
    api_interface = gr.Interface(
        fn=api_chat_response,
        inputs=gr.Textbox(
            label="Message",
            placeholder="Enter message for JSON response...",
            lines=2
        ),
        outputs=gr.JSON(label="API Response (with Transformer Data)"),
        title="🔌 Transformer API Endpoint",
        description="JSON API with detailed transformer model outputs and emotion scores"
    )
    
    # Launch app
    demo = gr.TabbedInterface(
        [chat_interface, api_interface],
        ["💬 Chat", "🔌 API"],
        title=" Transformer-Powered Emotion Support"
    )
    
    demo.launch()
    
except Exception as e:
    print(f"Error launching Gradio: {e}")