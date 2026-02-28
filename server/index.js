const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const multer = require('multer');

// Verified modular LangChain packages
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { MemoryVectorStore } = require('@langchain/classic/vectorstores/memory');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { ChatGroq } = require("@langchain/groq");
const { PromptTemplate } = require('@langchain/core/prompts');

dotenv.config({ path: path.join(__dirname, '.env') });

console.log('--- Server Startup ---');
console.log('Gemini API Key configured:', !!process.env.GOOGLE_API_KEY);
console.log('Groq API Key configured:', !!process.env.GROQ_API_KEY);
console.log('---------------------');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const upload = multer({ storage: multer.memoryStorage() });

const bookCache = new Map();
const bookMetadata = new Map();

async function processBook(bookId, buffer, filename) {
    console.log(`Processing new book: ${filename} (ID: ${bookId})`);
    console.log('Parsing PDF...');
    const pdfData = await pdf(buffer);
    const fullText = pdfData.text;
    console.log(`Extracted ${fullText.length} characters`);

    console.log('Splitting text into chunks...');
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 3000,
        chunkOverlap: 500,
    });
    const docs = await splitter.createDocuments([fullText]);
    console.log(`Created ${docs.length} document chunks`);

    console.log('--- Starting Embedding Process (this can take ~30 seconds) ---');
    const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: (process.env.GOOGLE_API_KEY || '').trim(),
        modelName: "gemini-embedding-001",
    });

    const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);
    console.log('SUCCESS: Vector store ready and cached');
    bookCache.set(bookId, vectorStore);

    // Store metadata
    bookMetadata.set(bookId, {
        isbn: bookId,
        title: filename.replace('.pdf', '').replace(/-/g, ' '),
        author: "Uploaded PDF",
        year: new Date().getFullYear().toString(),
        genre: "Professional",
        rating: 5.0,
        numRatings: 1,
        available: true,
        summary: `Dynamic book content from uploaded file: ${filename}`,
        image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800"
    });

    return bookMetadata.get(bookId);
}

async function getRAGResponse(bookId, userQuestion, chatHistory = []) {
    let bookPath = null;
    if (bookId === '978-0517543054') {
        bookPath = path.join(__dirname, '..', 'public', 'books', 'The-Psychology-of-Money-Morgan-Housel.pdf');
    }

    console.log(`Starting RAG process for book: ${bookPath}`);

    if (!fs.existsSync(bookPath)) {
        console.error(`File NOT found at: ${bookPath}`);
        throw new Error('Book file not found on server.');
    }

    let vectorStore;

    if (bookCache.has(bookId)) {
        console.log('Using cached vector store');
        vectorStore = bookCache.get(bookId);
    } else if (bookPath && fs.existsSync(bookPath)) {
        console.log('Reading known book from file...');
        const dataBuffer = fs.readFileSync(bookPath);
        await processBook(bookId, dataBuffer, path.basename(bookPath));
        vectorStore = bookCache.get(bookId);
    } else {
        console.error(`Book NOT found. Cache: ${bookCache.has(bookId)}, Path: ${bookPath}`);
        throw new Error('Book file not found or not uploaded yet.');
    }

    console.log(`Retrieving relevant docs for question: ${userQuestion}`);
    const retriever = vectorStore.asRetriever(4);
    const relevantDocs = await retriever.invoke(userQuestion);
    console.log(`Found ${relevantDocs.length} relevant chunks`);
    const context = relevantDocs.map(d => d.pageContent).join('\n---\n');

    console.log('Calling AI model...');
    let model;
    if (process.env.GROQ_API_KEY) {
        console.log('Using Groq (Llama 3) for faster response');
        model = new ChatGroq({
            apiKey: process.env.GROQ_API_KEY,
            model: "llama-3.3-70b-versatile",
        });
    } else {
        console.log('Using Gemini as fallback');
        model = new ChatGoogleGenerativeAI({
            model: "gemini-2.0-flash",
            apiKey: (process.env.GOOGLE_API_KEY || '').trim(),
        });
    }

    const prompt = PromptTemplate.fromTemplate(`
    You are a professional book assistant designed to answer questions strictly based on the provided context from the book "The Psychology of Money".

    ### IMPORTANT RULES:
    1. Use ONLY the retrieved context to answer.
    2. Do NOT use external knowledge.
    3. If the answer is not present in the retrieved context, say: "This information is not available in the provided context."
    4. Do NOT guess.
    5. Do NOT summarize beyond what is asked.
    6. Do NOT mix information from different chapters if a specific chapter is mentioned.

    ### CHAPTER-SPECIFIC RULE:
    If the user mentions a chapter number or chapter title:
    - Answer strictly using content from that chapter only.
    - If retrieved context includes content from other chapters, ignore it.
    - If the specified chapter content is not available, say: "The requested chapter content is not available in the retrieved context."

    ### STRUCTURAL QUESTION RULE:
    If the user asks: "What is the next paragraph?", "What comes after this?", "What comes before this?", or "Repeat this paragraph exactly.":
    - Only return the exact paragraph from context.
    - Do NOT summarize.
    - Do NOT add explanation.
    - If the exact next/previous paragraph is not available, respond: "The requested paragraph is not available in the retrieved context."

    ### FORMATTING RULE:
    - If user requests bullet points, use bullet points.
    - If user requests summary, summarize strictly from context.
    - Keep answers concise and precise.

    ### HALLUCINATION PREVENTION:
    Never generate information that is not explicitly present in the provided context. If unsure, clearly state that the information is unavailable.

    ---
    Conversation History:
    {history}
    
    Context from the book:
    {context}
    
    User Question: {question}
    ---
  `);

    const historyText = chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');

    const chain = prompt.pipe(model);
    const response = await chain.invoke({
        context: context,
        question: userQuestion,
        history: historyText || "No previous history."
    });

    return response.content;
}

app.get('/', (req, res) => {
    res.send('RAG Server is running. Use POST /api/chat for interaction.');
});

app.post('/api/upload', upload.single('book'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded.' });

        const bookId = 'up-' + Date.now();
        const metadata = await processBook(bookId, req.file.buffer, req.file.originalname);

        res.json({ success: true, book: metadata });
    } catch (e) {
        console.error('Upload error:', e);
        res.status(500).json({ error: 'Failed to process uploaded PDF.' });
    }
});

app.post('/api/chat', async (req, res) => {
    const { bookId, message, history } = req.body;
    console.log(`Received message for book ${bookId}: ${message}`);

    if (!message) {
        return res.status(400).json({ error: 'Message is required.' });
    }

    const apiKey = (process.env.GOOGLE_API_KEY || '').trim();

    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE' || apiKey === '') {
        return res.status(500).json({ error: 'Server API key is not configured.' });
    }

    try {
        const aiResponse = await getRAGResponse(bookId || 'default_book', message, history || []);
        res.json({ response: aiResponse });
    } catch (error) {
        console.error('--- EXCEPTION IN RAG PROCESS ---');
        console.error(error);
        console.error('--------------------------------');

        let errorMessage = 'Failed to process request.';
        const errorStr = (error.message || '').toLowerCase() + JSON.stringify(error).toLowerCase();

        if (errorStr.includes('429') || errorStr.includes('quota') || errorStr.includes('limit')) {
            errorMessage = 'API Rate Limit reached. Please wait 1 minute and try again.';
        } else if (errorStr.includes('api_key') || errorStr.includes('unauthorized') || errorStr.includes('auth')) {
            errorMessage = 'Invalid API Key. Please check your .env file for Gemini and Groq keys.';
        }

        res.status(500).json({ error: errorMessage });
    }
});

app.listen(PORT, () => {
    console.log(`RAG Server running on http://localhost:${PORT}`);
});
