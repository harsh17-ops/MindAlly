# TODO: Create Emotional Support Chatbot

## Backend Implementation
- [x] Create server/services/emotionalSupportService.js
  - Implement AI-powered emotional support chat using Groq
  - Add multilingual support
  - Curate guided meditation video links
  - Maintain chat history

- [x] Create server/routes/emotionalSupportChat.js
  - Handle POST /chat for sending messages
  - Handle GET /history for retrieving chat history
  - Handle GET /meditation-videos for video recommendations
  - Integrate with emotionalSupportService

## Frontend Implementation
- [x] Create src/components/EmotionalSupportChat.tsx
  - Chat interface with message input and display
  - Support for displaying meditation videos
  - Multilingual language selection
  - Real-time chat updates

## Integration and Testing
- [x] Update server/index.js to include new route
- [x] Add navigation to chatbot in dashboard
- [x] Test end-to-end functionality
- [x] Add error handling and loading states
