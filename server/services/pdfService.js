import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { ChatGroq } from '@langchain/groq';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

// Initialize cache with 1 hour TTL
const cache = new NodeCache({ stdTTL: 3600 });

// Initialize Groq - Use GROQ_API_KEY_RAG if available, otherwise fall back to GROQ_API_KEY
let model;
try {
  const groqApiKey = process.env.GROQ_API_KEY_RAG || process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    console.warn('Neither GROQ_API_KEY_RAG nor GROQ_API_KEY is set - PDF chat will not work');
  } else {
    model = new ChatGroq({
      apiKey: groqApiKey,
      modelName: "llama-3.3-70b-versatile",
      timeout: 60000, // 60 second timeout
    });
    console.log('Groq model initialized for PDF chat');
  }
} catch (modelError) {
  console.error('Error initializing Groq model:', modelError);
}

// Initialize HuggingFace embeddings with optimized settings
let embeddings;
try {
  if (!process.env.HUGGINGFACE_API_KEY) {
    console.warn('HUGGINGFACE_API_KEY is not set - PDF chat will not work');
  } else {
    embeddings = new HuggingFaceInferenceEmbeddings({
      apiKey: process.env.HUGGINGFACE_API_KEY,
      model: "sentence-transformers/all-MiniLM-L6-v2",
      batchSize: 512, // Process more text at once
      stripNewLines: true // Remove unnecessary newlines
    });
  }
} catch (embeddingError) {
  console.error('Error initializing HuggingFace embeddings:', embeddingError);
}

// Vector store to hold embeddings
const vectorStores = new Map();

// Define uploads directory path
const uploadsDir = path.join(process.cwd(), 'uploads');

// PDF parsing options for better performance
const PDF_OPTIONS = {
  pagerender: function(pageData) {
    return pageData.getTextContent().then(function(textContent) {
      let lastY, text = '';
      for (const item of textContent.items) {
        if (lastY == item.transform[5] || !lastY) {
          text += item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[5];
      }
      return text;
    });
  },
  max: 0,
  version: 'v2.0.550'
};

// Define RAG prompt template
const promptTemplate = ChatPromptTemplate.fromTemplate(`
You are an advanced AI educational assistant specializing in document analysis and comprehension. Your primary goal is to help users deeply understand the content of their documents by providing comprehensive, well-structured, and insightful responses.

Context from the document:
{context}

Question: {question}

Instructions for crafting your response:

1. ANALYSIS AND COMPREHENSION:
   - Provide a thorough analysis of the relevant information from the context
   - Break down complex concepts into understandable components
   - Highlight key terms, definitions, and important concepts
   - Make connections between different parts of the document when relevant

2. RESPONSE STRUCTURE:
   - Begin with a clear, direct answer to the question
   - Follow with supporting details and explanations
   - Include relevant examples or illustrations from the document
   - Organize information using appropriate headings or bullet points for clarity
   - Conclude with a brief summary if the response is lengthy

3. ACCURACY AND SOURCING:
   - Base your response EXCLUSIVELY on the provided context
   - Quote relevant passages directly, citing the specific location in the document
   - If information is incomplete, clearly state what is and isn't available in the context
   - Distinguish between explicit statements and reasonable inferences from the text

4. EDUCATIONAL ELEMENTS:
   - Explain technical terms or jargon when they appear
   - Provide relevant background information when it helps understanding
   - Include practical applications or real-world relevance when applicable
   - Suggest related topics or concepts for further exploration within the document

5. ENGAGEMENT AND CLARITY:
   - Use clear, professional language while maintaining an engaging tone
   - Incorporate rhetorical questions or thought-provoking points when appropriate
   - Break up long explanations with examples or practical applications
   - Use analogies or comparisons when they help clarify complex concepts

6. LIMITATIONS AND TRANSPARENCY:
   - Clearly acknowledge when information is partial or unclear
   - Specify any assumptions made in your interpretation
   - Indicate when additional context would be helpful
   - Suggest specific sections of the document for further reading

FORMAT YOUR RESPONSE AS FOLLOWS:

📌 Direct Answer:
[Provide the immediate, clear answer to the question]

🔍 Detailed Explanation:
[Expand on the answer with thorough analysis and supporting details]

💡 Key Insights:
[List important concepts, terms, or takeaways]

📑 Source References:
[Quote relevant passages with their location in the document]

🔄 Related Concepts:
[Mention connected topics or suggested further reading from the document]

Remember: Your goal is to not just answer the question, but to help the user build a comprehensive understanding of the topic within the context of their document.

Answer: `);

// Ensure uploads directory exists
async function ensureUploadsDirectory() {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (err) {
    console.error('Error creating uploads directory:', err);
    throw new Error(`Failed to create uploads directory: ${err.message}`);
  }
}

/**
 * Process PDF file or buffer and create embeddings
 */
export async function processPdf(input) {
  try {
    let buffer;
    
    if (Buffer.isBuffer(input)) {
      buffer = input;
    } else {
      const normalizedPath = path.normalize(input);
      const uploadsPath = path.normalize(uploadsDir);
      
      if (!normalizedPath.startsWith(uploadsPath)) {
        throw new Error('Invalid file path. Files must be in the uploads directory.');
      }

      try {
        await fs.access(normalizedPath);
      } catch {
        throw new Error(`PDF file not found at path: ${normalizedPath}`);
      }

      buffer = await fs.readFile(normalizedPath);
    }

    // Parse PDF with optimized options
    const data = await pdfParse(buffer, PDF_OPTIONS);

    if (!data || !data.text) {
      throw new Error('PDF parsing resulted in no text content');
    }

    // Get the text content per page
    const pages = data.text.split(/\f/); // Split by form feed character which typically separates PDF pages

    // Split text into optimized chunks with page tracking
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 2000,
      chunkOverlap: 100,
      separators: ['\n\n', '\n', '. ', ' ', ''],
      lengthFunction: (text) => text.length,
    });

    // Process each page separately to maintain page numbers
    let documentChunks = [];
    for (let pageNum = 0; pageNum < pages.length; pageNum++) {
      const pageText = pages[pageNum];
      if (!pageText.trim()) continue; // Skip empty pages
      
      const pageChunks = await textSplitter.createDocuments([pageText]);
      const pageChunksWithMetadata = pageChunks.map(chunk => ({
        text: chunk.pageContent,
        metadata: {
          pageNumber: pageNum + 1,
          location: `page_${pageNum + 1}`
        }
      }));
      
      documentChunks = documentChunks.concat(pageChunksWithMetadata);
    }

    return {
      documentChunks,
      pageCount: data.numpages
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw new Error(`Failed to process PDF document: ${error.message}`);
  }
}

/**
 * Chat with PDF using RAG
 * @param {Buffer|string} pdfInput - PDF buffer or base64 string
 * @param {string} question - User's question
 * @param {Array} chatHistory - Previous chat messages
 * @param {Array} storedChunks - Pre-processed document chunks (optional, for performance)
 */
export async function chatWithPdf(pdfInput, question, chatHistory = [], storedChunks = null) {
  try {
    let documentChunks;
    
    // Use stored chunks if available (much faster)
    if (storedChunks && Array.isArray(storedChunks) && storedChunks.length > 0) {
      console.log(`Using ${storedChunks.length} stored document chunks for faster processing`);
      // Convert MongoDB documents to plain objects if needed
      documentChunks = storedChunks.map(chunk => {
        if (chunk.toObject) {
          return chunk.toObject();
        }
        return chunk;
      });
    } else {
      // Process the PDF to get chunks (slower, but necessary if chunks aren't stored)
      console.log('Processing PDF to extract chunks...');
      let buffer;
      if (Buffer.isBuffer(pdfInput)) {
        buffer = pdfInput;
      } else {
        try {
          buffer = base64ToBuffer(pdfInput);
        } catch (bufferError) {
          throw new Error(`Failed to convert PDF data: ${bufferError.message}`);
        }
      }
      const processed = await processPdf(buffer);
      documentChunks = processed.documentChunks;
    }

    if (!documentChunks || documentChunks.length === 0) {
      throw new Error('No document chunks available. The PDF may be empty or corrupted.');
    }

    // Convert chunks to the format expected by the vector store
    const vectorStoreDocuments = documentChunks
      .map(chunk => {
        // Handle different chunk formats
        const text = chunk.text || chunk.pageContent || '';
        const metadata = chunk.metadata || { 
          pageNumber: chunk.pageNumber || 1, 
          location: chunk.location || '' 
        };
        
        return {
          pageContent: text,
          metadata: metadata
        };
      })
      .filter(chunk => chunk.pageContent && chunk.pageContent.trim().length > 0);

    if (vectorStoreDocuments.length === 0) {
      throw new Error('No valid document chunks found. The PDF may be empty or corrupted.');
    }

    // Validate embeddings are initialized
    if (!embeddings) {
      throw new Error('HuggingFace embeddings are not initialized. Please check HUGGINGFACE_API_KEY environment variable.');
    }

    // Create vector store from chunks
    console.log(`Creating vector store with ${vectorStoreDocuments.length} chunks...`);
    let vectorStore;
    try {
      // Limit the number of chunks to process to avoid timeout
      const maxChunks = 100; // Process max 100 chunks at a time
      const chunksToProcess = vectorStoreDocuments.slice(0, maxChunks);
      
      if (chunksToProcess.length < vectorStoreDocuments.length) {
        console.log(`Processing ${chunksToProcess.length} of ${vectorStoreDocuments.length} chunks to avoid timeout`);
      }
      
      vectorStore = await MemoryVectorStore.fromDocuments(
        chunksToProcess,
        embeddings
      );
    } catch (embeddingError) {
      console.error('Error creating embeddings:', embeddingError);
      console.error('Embedding error details:', {
        name: embeddingError.name,
        message: embeddingError.message,
        stack: embeddingError.stack
      });
      throw new Error(`Failed to create document embeddings: ${embeddingError.message}`);
    }

    // Cache key for the query
    const cacheKey = `pdf_query_${question}_${chatHistory.length}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Retrieve relevant documents
    console.log('Searching for relevant document sections...');
    let retrievedDocs;
    try {
      retrievedDocs = await vectorStore.similaritySearch(question, 3);
    } catch (searchError) {
      console.error('Error in similarity search:', searchError);
      throw new Error(`Failed to search document: ${searchError.message}`);
    }
    
    if (!retrievedDocs || retrievedDocs.length === 0) {
      throw new Error('No relevant content found in the document for your question.');
    }
    
    // Format documents content
    const context = retrievedDocs.map(doc => doc.pageContent).join('\n\n');

    if (!context || context.trim().length === 0) {
      throw new Error('No context extracted from document for answering the question.');
    }

    // Validate model is initialized
    if (!model) {
      throw new Error('Groq model is not initialized. Please check GROQ_API_KEY_RAG or GROQ_API_KEY environment variable.');
    }

    // Create the RAG chain
    const chain = RunnableSequence.from([
      {
        context: () => context,
        question: (input) => input.question
      },
      promptTemplate,
      model,
      new StringOutputParser()
    ]);

    // Generate response with timeout
    console.log('Generating AI response...');
    let response;
    try {
      response = await Promise.race([
        chain.invoke({
          question: question
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI response timeout - the request took too long')), 60000)
        )
      ]);
    } catch (chainError) {
      console.error('Error in AI chain:', chainError);
      throw new Error(`Failed to generate AI response: ${chainError.message}`);
    }

    if (!response || typeof response !== 'string') {
      throw new Error('Invalid response format from AI model');
    }

    // Extract source pages
    const sourcePages = [...new Set(
      retrievedDocs.map(doc => doc.metadata.pageNumber)
    )].sort((a, b) => a - b);

    // Format sources for MongoDB storage
    const formattedSources = retrievedDocs.map(doc => ({
      page: doc.metadata.pageNumber,
      content: doc.pageContent.substring(0, 150) + '...' // Preview of content
    }));

    const result = {
      answer: response,
      sourcePages: sourcePages,
      sources: formattedSources
    };

    // Cache the result
    cache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error('Error in PDF chat:', error);
    throw error;
  }
}

/**
 * Clean up uploaded file
 */
export async function cleanupFile(filePath) {
  try {
    const normalizedPath = path.normalize(filePath);
    await fs.unlink(normalizedPath);
    vectorStores.delete(normalizedPath);
  } catch (error) {
    console.error('Error cleaning up file:', error);
    // Don't throw error for cleanup failures
  }
}

// Initialize uploads directory when module loads
ensureUploadsDirectory().catch(console.error);
