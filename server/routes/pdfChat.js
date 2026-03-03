import express from 'express';
import multer from 'multer';
import PdfDocument from '../models/pdfDocument.js';
import { processPdf } from '../services/pdfService.js';
import { chatWithPdf } from '../services/pdfService.js';
import { bufferToBase64, base64ToBuffer } from '../services/storageService.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Get all PDFs for a user
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const pdfs = await PdfDocument.find({ userId })
      .select('title pageCount createdAt')
      .sort({ createdAt: -1 });

    res.json({ pdfs });
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    res.status(500).json({ error: 'Failed to fetch PDFs' });
  }
});

// Get a specific PDF
router.get('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const pdf = await PdfDocument.findOne({ 
      _id: req.params.id,
      userId: userId 
    });

    if (!pdf) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!pdf.pdfData) {
      return res.status(500).json({ error: 'PDF data is missing' });
    }

    // Add validation for base64 data
    if (!pdf.pdfData.startsWith('data:application/pdf;base64,')) {
      return res.status(500).json({ error: 'Invalid PDF data format' });
    }

    // Return the full PDF data
    res.json({ 
      data: pdf.pdfData,
      title: pdf.title,
      pageCount: pdf.pageCount
    });
  } catch (error) {
    console.error('Error fetching PDF:', error);
    res.status(500).json({ error: 'Failed to fetch PDF' });
  }
});

// Upload and process PDF
router.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    console.log('Upload request received');

    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.headers['x-user-id'];
    if (!userId) {
      console.error('No user ID in request');
      return res.status(401).json({ error: 'User ID is required' });
    }

    try {
      // Convert buffer to Base64
      const pdfData = bufferToBase64(req.file.buffer);

      // Process PDF using the service
      const { documentChunks, pageCount } = await processPdf(req.file.buffer);

      // Create new PDF document in database
      const pdfDoc = new PdfDocument({
        userId,
        title: req.file.originalname,
        pdfData,
        pageCount,
        documentChunks,
        chatHistory: []
      });

      await pdfDoc.save();

      res.json({
        _id: pdfDoc._id,
        title: pdfDoc.title,
        pageCount: pdfDoc.pageCount,
        createdAt: pdfDoc.createdAt
      });
    } catch (processingError) {
      console.error('Error processing PDF:', processingError);
      res.status(500).json({ 
        error: 'Error processing PDF file',
        details: processingError.message 
      });
    }
  } catch (error) {
    console.error('Error in upload route:', error);
    res.status(500).json({ 
      error: 'Server error during upload',
      details: error.message 
    });
  }
});

// Delete PDF
router.delete('/:documentId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const doc = await PdfDocument.findOneAndDelete({
      _id: req.params.documentId,
      userId: userId
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting PDF:', error);
    res.status(500).json({ error: 'Error deleting PDF' });
  }
});

// Chat with PDF
router.post('/:id/chat', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const pdf = await PdfDocument.findOne({ 
      _id: req.params.id,
      userId: userId 
    });

    if (!pdf) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    if (!req.body.content || !req.body.content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Check for required API keys (use GROQ_API_KEY_RAG if available, otherwise GROQ_API_KEY)
    const groqApiKey = process.env.GROQ_API_KEY_RAG || process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      console.error('Neither GROQ_API_KEY_RAG nor GROQ_API_KEY is set');
      return res.status(500).json({ error: 'AI service is not configured. Please set GROQ_API_KEY or GROQ_API_KEY_RAG in environment variables.' });
    }

    if (!process.env.HUGGINGFACE_API_KEY) {
      console.error('HUGGINGFACE_API_KEY is not set');
      return res.status(500).json({ error: 'AI service is not configured. Please set HUGGINGFACE_API_KEY in environment variables.' });
    }

    try {
      // Use stored document chunks if available (much faster than reprocessing)
      const storedChunks = pdf.documentChunks && pdf.documentChunks.length > 0 
        ? pdf.documentChunks 
        : null;
      
      // Process the chat message using the PDF content
      const pdfBuffer = base64ToBuffer(pdf.pdfData);
      const { answer, sourcePages, sources } = await chatWithPdf(
        pdfBuffer,
        req.body.content.trim(),
        pdf.chatHistory || [],
        storedChunks // Pass stored chunks for faster processing
      );

    // Add messages to chat history
    const userMessage = {
      role: 'user',
      content: req.body.content,
      timestamp: new Date()
    };
    
    const assistantMessage = {
      role: 'assistant',
      content: answer,
      sourcePages: sourcePages,
      sources: sources,
      timestamp: new Date()
    };

    pdf.chatHistory.push(userMessage);
    pdf.chatHistory.push(assistantMessage);

    await pdf.save();

    // Ensure messages have _id fields (MongoDB adds them automatically)
    const formattedHistory = pdf.chatHistory.map((msg, index) => ({
      ...msg.toObject ? msg.toObject() : msg,
      _id: msg._id ? msg._id.toString() : `msg-${index}`
    }));

      res.json({ 
        message: answer,
        sourcePages: sourcePages,
        sources: sources,
        chatHistory: formattedHistory
      });
    } catch (processingError) {
      console.error('Error processing PDF chat:', processingError);
      console.error('Error name:', processingError.name);
      console.error('Error message:', processingError.message);
      console.error('Error stack:', processingError.stack);
      
      // Return more detailed error information
      const errorMessage = processingError.message || 'Failed to process chat request';
      
      // Check for specific error types
      if (processingError.message?.includes('API key')) {
        return res.status(500).json({ 
          error: 'AI service configuration error. Please check API keys.',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
      }
      
      if (processingError.message?.includes('timeout')) {
        return res.status(504).json({ 
          error: 'Request timeout. The AI service took too long to respond.',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
      }
      
      return res.status(500).json({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? processingError.stack : undefined
      });
    }
  } catch (error) {
    console.error('Error in PDF chat route:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to process chat request',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get chat history
router.get('/:documentId/history', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const doc = await PdfDocument.findOne({
      _id: req.params.documentId,
      userId: userId
    });
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Ensure messages have _id fields
    const formattedHistory = (doc.chatHistory || []).map((msg, index) => ({
      ...msg.toObject ? msg.toObject() : msg,
      _id: msg._id ? msg._id.toString() : `msg-${index}`
    }));
    
    res.json(formattedHistory);
  } catch (error) {
    console.error('Error retrieving chat history:', error);
    res.status(500).json({ error: 'Error retrieving chat history' });
  }
});

export default router; 