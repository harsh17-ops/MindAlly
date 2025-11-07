import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import routes
import chatbotRoutes from './routes/chatbot.js';
import curateResourcesRoutes from './routes/curateResources.js';
import generatePlanRoutes from './routes/generatePlan.js';
import emotionalSupportChatRoutes from './routes/emotionalSupportChat.js';
import enhancedEmotionalSupportChatRoutes from './routes/enhancedEmotionalSupportChat.js';
import pdfChatRoutes from './routes/pdfChat.js';


// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Basic security headers (without helmet dependency)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-user-id', 'X-User-Id'],
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for rate limiting (important for production)
app.set('trust proxy', 1);

// General rate limiter - more lenient
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 200, // Much higher limit for development
  message: {
    error: 'Too many requests from this IP, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  skip: (req) => {
    // Skip rate limiting in development mode
    return process.env.NODE_ENV === 'development';
  }
});

// PDF-specific rate limiter - separate and more lenient
const pdfLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes window
  max: process.env.NODE_ENV === 'development' ? 100 : 20, // 20 requests per 2 minutes in production
  message: {
    error: 'Too many PDF requests, please wait a moment before trying again',
    retryAfter: '2 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  skip: (req) => {
    // Skip PDF rate limiting in development
    return process.env.NODE_ENV === 'development';
  },
  // Add custom handler for better logging
  handler: (req, res) => {
    console.log(`PDF rate limit hit for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many PDF requests, please wait a moment before trying again',
      retryAfter: '2 minutes',
      resetTime: new Date(Date.now() + 2 * 60 * 1000).toISOString()
    });
  }
});

// Apply general rate limiting to all routes (except in development)
if (process.env.NODE_ENV !== 'development') {
  app.use(generalLimiter);
  console.log('General rate limiting enabled for production');
} else {
  console.log('Rate limiting disabled for development mode');
}

// Health check endpoint (no rate limiting)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Apply PDF-specific rate limiting only to PDF routes
if (process.env.NODE_ENV !== 'development') {
  app.use('/api/pdf', pdfLimiter);
  console.log('PDF rate limiting enabled for production');
}

// API Routes
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/curate-resources', curateResourcesRoutes);
app.use('/api/generate-plan', generatePlanRoutes);
app.use('/api/emotional-support', emotionalSupportChatRoutes);
app.use('/api/emotional-support', enhancedEmotionalSupportChatRoutes);
app.use('/api/pdf', pdfChatRoutes);


// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'MindAlly API Server',
    version: '1.0.0',
    status: 'Running',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Handle specific error types
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Request entity too large',
      message: 'The request payload is too large'
    });
  }
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.message
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format',
      message: 'The provided ID is not valid'
    });
  }
  
  // Default error response
  res.status(error.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Database connection
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔒 Rate limiting: ${process.env.NODE_ENV === 'development' ? 'DISABLED' : 'ENABLED'}`);
      console.log(`💾 Database: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  try {
    await mongoose.connection.close();
    console.log('📊 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Start the server
startServer();

export default app;
