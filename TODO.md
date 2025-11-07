# Integration Plan: Voice Agent and Chatbot into Emotional Support Chat

## Current Status
- ✅ Plan approved by user
- ✅ Server setup completed (Next.js on 3000, Express on 5000)
- ✅ Task 1: Integrate Vapi SDK - COMPLETED
- ✅ Task 2: Port Emotion Detection - COMPLETED
- ✅ Task 3: Create Voice-Enabled API Endpoint - COMPLETED
- ✅ Task 4: Update EmotionalSupportChat.tsx UI - COMPLETED
- 🔄 Starting Task 5: Testing and Integration

## Tasks

### 1. Integrate Vapi SDK into EmotionalSupportChat.tsx
- [x] Install Vapi SDK dependency (`npm install @vapi-ai/web`)
- [x] Add phone call button to EmotionalSupportChat component
- [x] Implement Vapi initialization with keys from environment
- [x] Add voice call state management (connecting, listening, speaking)
- [x] Add visual indicators for call status

### 2. Port Emotion Detection from chatbot.py to JavaScript
- [x] Create emotion detection utility in server/services/
- [x] Implement transformer-based emotion detection using Hugging Face API
- [x] Add fallback keyword-based detection
- [x] Integrate emotion context into Groq responses

### 3. Create Voice-Enabled API Endpoint
- [x] Add new route for voice emotional support in server/routes/
- [x] Modify emotionalSupportService.js to handle voice context
- [x] Combine voice transcription with emotion detection
- [x] Return structured response for voice interactions

### 4. Update EmotionalSupportChat.tsx UI
- [x] Add phone button with proper styling
- [x] Implement call controls (start/stop)
- [x] Add voice status indicators
- [x] Handle voice response display

### 5. Testing and Integration
- [ ] Start development servers (Next.js and Express)
- [ ] Test Vapi voice calls integration
- [ ] Verify emotion detection enhancement
- [ ] Test combined voice + text workflow
- [ ] Ensure proper error handling

## Dependencies
- Vapi SDK: `@vapi-ai/web`
- Environment variables: VAPI_PUBLIC_KEY, VAPI_ASSISTANT_ID
- Hugging Face API for emotion detection

## Notes
- Voice agent uses Vapi for real-time voice interaction
- Chatbot.py has advanced emotion detection using transformers
- Current system uses Groq for text responses
- Integration should enhance emotional support with voice capabilities
