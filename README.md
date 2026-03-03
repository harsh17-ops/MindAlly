# MindAlly: AI-Powered Mental Health & Study Companion

An intelligent study and emotional wellness platform that combines personalized learning, smart resource discovery, and AI-driven mental health support.

## Table of Contents
- [Overview](#overview)
- [Features](#key-features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [API Integration](#api-integration)
- [Usage Guide](#usage-guide)
- [Contributing](#contributing)
- [License](#license)

## Demo

### Project Walkthrough

<video width="800" height="600" controls>
  <source src="mindally.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

**[Watch on GitHub](https://github.com/user-attachments/assets/1ea26947-1dca-408d-9741-b24c3429944a)**



## Overview

MindAlly is an intelligent companion that leverages AI to transform both the learning and emotional wellness experience. It combines personalized study planning, resource curation, interactive PDF assistance, and AI-powered emotional support with voice agent capabilities to help students achieve their academic and mental health goals efficiently.

## Key Features

### 1. AI-Powered Study Planning 📚
- **Dynamic Plan Generation**
  - Subject-based customization
  - Exam date optimization
  - Weekly learning milestones
  - Daily task breakdown
  - Personalized learning paths
- **Progress Tracking**
  - Visual progress indicators
  - Completion status
  - Adjustable schedules
  - Performance analytics
  - Study statistics

### 2. Smart Resource Curation 🔍
- **AI-Driven Content Discovery**
  - Tavily API integration for relevant educational content
  - Quality scoring algorithm
  - Content type diversity
- **Resource Types Support**
  - Video tutorials
  - Online courses
  - Documentation
  - Practice exercises
  - Academic papers
  - Research articles
- **Smart Filtering**
  - Difficulty level categorization
  - Format-based organization
  - Topic relevance ranking
  - Source verification

### 3. Interactive PDF Chat Assistant 📄
- **Document Analysis**
  - Upload and process PDF documents
  - AI-powered document comprehension
  - Contextual question answering
  - Text extraction and analysis
- **Smart Features**
  - Source page references
  - Relevant excerpt highlighting
  - Chat history persistence
  - Context-aware responses
  - Document metadata extraction
- **PDF Viewer Integration**
  - Page navigation and tracking
  - Zoom and rotation controls
  - Fullscreen mode
  - Synchronized chat and document view
  - Page jumping from chat references

### 4. Emotional Support Chat 💬
- **AI-Powered Conversation**
  - Empathetic, supportive responses
  - Mental health resource recommendations
  - Active listening simulation
  - Conversation history tracking
- **Emotion Detection**
  - Real-time emotion analysis
  - Sentiment-aware responses
  - Mood tracking over sessions
  - Personalized support based on emotional state

### 5. Voice Agent Integration 🎙️
- **Voice Call Support**
  - Integrated Vapi voice assistant
  - Voice-based emotional support conversations
  - Speech-to-text transcription
  - Natural language processing
  - Voice call controls and status indicators
- **Hybrid Communication**
  - Seamless text-to-voice interaction
  - Voice response playback
  - Multi-modal support (text + voice)
  - Call history management

### 6. Study Timer & Session Management ⏱️
- **Pomodoro Timer**
  - Customizable work/break intervals
  - Session tracking
  - Break reminders
  - Focus mode
- **Session Analytics**
  - Session history
  - Productivity statistics
  - Time spent per subject
  - Performance insights
  - Session summaries

### 7. Notes Management 📝
- **Rich Text Notes**
  - Create and edit notes with formatting
  - Organize by subjects/topics
  - Search functionality
  - Tag-based organization
  - Note categorization
- **Advanced Features**
  - Syntax highlighting
  - Note sharing
  - Export capabilities
  - Cloud synchronization

### 8. User Profile & Authentication 👤
- **Secure Authentication**
  - NextAuth.js with JWT
  - Google OAuth integration
  - Secure password management
  - Session management
- **User Dashboard**
  - Profile customization
  - Study preferences
  - Goal tracking
  - Achievement badges
  - User statistics

### 9. Modern User Experience 🎯
- **Responsive Design**
  - Mobile-friendly interface
  - Desktop optimization
  - Tablet support
  - Dark/Light mode
- **UI/UX Features**
  - Toast notifications
  - Loading states
  - Error handling
  - Pagination system
  - Smooth animations

## Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: 
  - Tailwind CSS for utility-first styling
  - Shadcn UI for component library
- **State Management**: 
  - Zustand for global state (timer management)
  - React Query for server state caching
  - Context API for auth state
- **Authentication**: NextAuth.js with JWT and OAuth2
- **PDF Processing**:
  - React-PDF for document viewing
  - PDF.js for text extraction
  - Custom chat interface
- **Voice Integration**:
  - Vapi SDK for voice agent functionality
  - Speech synthesis and recognition
- **Real-time Features**:
  - WebSocket support (optional for live updates)
  - Optimistic UI updates

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **AI & ML Services**:
  - Groq API for study plan generation and PDF analysis
  - HuggingFace for emotion detection and embeddings
  - Tavily API for resource curation
  - Vapi API for voice agent backend
- **Security**: 
  - JWT authentication with expiration
  - Rate limiting middleware
  - Input validation and sanitization
  - CORS configuration
  - Environment variable protection
- **File Handling**:
  - Multer for file uploads
  - PDF file parsing
  - Document storage and retrieval

## Installation

### Prerequisites
- Node.js 18+ and npm/yarn
- MongoDB instance (local or cloud-based)
- Git

### Step 1: Clone the repository
```bash
git clone https://github.com/harsh17-ops/MindAlly.git
cd MindAlly
```

### Step 2: Install dependencies

**Frontend dependencies:**
```bash
npm install
```

**Backend dependencies:**
```bash
cd server
npm install
cd ..
```

### Step 3: Set up environment variables

Create `.env.local` file in the root directory:

```env
# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Database
MONGODB_URI=your-mongodb-connection-string

# Voice Agent (Vapi)
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your-vapi-public-key
VAPI_ASSISTANT_ID=your-vapi-assistant-id
```

Create `.env` file in the `server` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=your-mongodb-connection-string

# AI Services
GROQ_API_KEY=your-groq-api-key
TAVILY_API_KEY=your-tavily-api-key
HUGGINGFACE_API_KEY=your-huggingface-api-key

# Authentication
JWT_SECRET=your-jwt-secret-key
NEXTAUTH_SECRET=your-nextauth-secret

# Voice Agent
VAPI_API_KEY=your-vapi-api-key

# Allowed Origins (CORS)
ALLOWED_ORIGINS=http://localhost:3000
```

### Step 4: Start the development servers

**Terminal 1 - Frontend:**
```bash
npm run dev
```
Frontend will be available at `http://localhost:3000`

**Terminal 2 - Backend:**
```bash
cd server
npm run dev
```
Backend will be available at `http://localhost:5000`

## Environment Setup

### Required API Keys

1. **Groq API** - AI model for study plans and PDF analysis
   - Sign up at https://console.groq.com/
   - Generate API key in settings

2. **Tavily API** - Educational resource curation
   - Sign up at https://tavily.com/
   - Get API key from dashboard

3. **HuggingFace API** - Emotion detection
   - Create account at https://huggingface.co/
   - Generate token from settings

4. **Vapi API** - Voice agent integration
   - Sign up at https://vapi.ai/
   - Get public key and assistant ID

5. **MongoDB** - Database setup
   - Use MongoDB Atlas (cloud) or local installation
   - Connection string format: `mongodb+srv://user:password@cluster.mongodb.net/mindally`

6. **NextAuth** - Authentication
   - Generate JWT secret: `openssl rand -base64 32`
   - Configure OAuth providers (optional)

## API Integration

### Groq API
Used for:
- Study plan generation with Groq models
- PDF document analysis and comprehension
- Resource description enhancement
- Learning path recommendations
- Emotional support response generation

### Tavily API
Used for:
- Educational resource curation
- Content relevance scoring
- Resource metadata extraction
- Web search for study materials

### HuggingFace API
Used for:
- Real-time emotion detection
- Sentiment analysis
- Text embeddings for semantic search
- Model inference for NLP tasks

### Vapi API
Used for:
- Voice agent initialization and management
- Speech-to-text transcription
- Text-to-speech synthesis
- Voice call session management
- Natural conversation handling

## Usage Guide

### 1. Getting Started
1. Sign up or log in with your credentials
2. Complete your profile setup
3. Set your study preferences
4. Navigate to your dashboard

### 2. Study Plan Generation
1. Go to the **Study Plan** section
2. Enter your subject/exam name
3. Set your target exam date
4. Click "Generate Plan"
5. Review your personalized weekly schedule
6. Customize milestones if needed
7. Start tracking your progress

### 3. Smart Resource Discovery
1. Navigate to **Resources** section
2. Enter your topic or search query
3. Filter by difficulty level or format
4. Click on resources to view details
5. Save resources to your library
6. Track resources you've completed

### 4. PDF Chat Assistant
1. Go to the **PDF** section
2. Upload your PDF document (lecture notes, textbooks, papers)
3. Wait for the document to be processed
4. Ask questions in the chat interface
5. View answers with page references
6. Use the PDF viewer to navigate
7. Access chat history anytime
8. Download conversation transcripts

### 5. Emotional Support Chat
1. Click the **Support** section or button
2. Start a conversation about your concerns
3. The AI provides empathetic support
4. Get personalized mental health resources
5. Track your emotional patterns
6. Access 24/7 support anytime

### 6. Voice Agent (Optional)
1. In the Emotional Support Chat, click the **phone icon**
2. Grant microphone permissions
3. Start speaking naturally
4. The voice agent responds in real-time
5. Voice responses are displayed as text
6. Access voice call history

### 7. Study Timer (Pomodoro)
1. Navigate to the **Timer** section
2. Set your work duration (default: 25 minutes)
3. Set your break duration (default: 5 minutes)
4. Click "Start Session"
5. Focus on your study goals
6. Get break reminders
7. View your session statistics
8. Analyze productivity patterns

### 8. Notes Management
1. Go to **Notes** section
2. Click "New Note"
3. Add title and content
4. Use formatting options
5. Organize with tags/subjects
6. Search for specific notes
7. Export notes as PDF/Markdown
8. Share notes with others (optional)

### 9. Profile & Settings
1. Click your profile avatar
2. Update personal information
3. Manage study preferences
4. Set notification preferences
5. Connect OAuth accounts
6. View account statistics
7. Manage linked services

## Contributing

We welcome contributions from the community! Here's how you can help:

### Development Process
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following our code style
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Code Guidelines
- Use TypeScript for frontend code
- Follow ESLint and Prettier configurations
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes before submitting

### Areas for Contribution
- Bug fixes and performance improvements
- New AI features and integrations
- UI/UX enhancements
- Documentation improvements
- Accessibility features
- Internationalization (i18n)
- Mobile optimization
- Testing and test coverage

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support & Feedback

- 📧 Email: support@mindally.dev
- 🐛 Report bugs on GitHub Issues
- 💡 Suggest features on GitHub Discussions
- 📖 Check documentation for more help

## Acknowledgments

- Groq for providing powerful AI models
- Tavily for educational resource search
- HuggingFace for NLP models
- Vapi for voice agent infrastructure
- MongoDB for database solutions
- Next.js team for amazing framework

---

Built with ❤️ by the MindAlly team

**Status**: Active Development 🚀
