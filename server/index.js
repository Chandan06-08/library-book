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

// Create uploads directory if it doesn't exist
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const METADATA_PATH = path.join(__dirname, 'metadata.json');

console.log('--- Server Startup ---');
console.log('Gemini API Key configured:', !!process.env.GOOGLE_API_KEY);
console.log('Groq API Key configured:', !!process.env.GROQ_API_KEY);
console.log('---------------------');

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded books statically
app.use('/uploads', express.static(UPLOADS_DIR));

const PORT = process.env.PORT || 5000;

// Multer Disk Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = uniqueSuffix + '-' + file.originalname;
        cb(null, filename);
    }
});
const upload = multer({ storage: storage });

const bookCache = new Map(); // Vector store cache (RAM only)
let bookMetadata = new Map(); // Global book registry

// Load persistent metadata from file
function loadMetadata() {
    try {
        if (fs.existsSync(METADATA_PATH)) {
            const data = fs.readFileSync(METADATA_PATH, 'utf8');
            const entries = JSON.parse(data);
            bookMetadata = new Map(Object.entries(entries));
            console.log(`Loaded metadata for ${bookMetadata.size} books from ${METADATA_PATH}.`);
        }
    } catch (e) {
        console.error('Error loading metadata:', e);
    }

    // Default: Ensure original book is in metadata
    if (!bookMetadata.has('978-0517543054')) {
        bookMetadata.set('978-0517543054', {
            isbn: '978-0517543054',
            title: 'The Psychology of Money',
            author: 'Morgan Housel',
            year: '2020',
            genre: 'Finance',
            available: true,
            summary: "Morgan Housel's masterpiece on finance and human behavior.",
            image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800",
            localPath: path.join(__dirname, '..', 'public', 'books', 'The-Psychology-of-Money-Morgan-Housel.pdf')
        });
        console.log('Added default book "The Psychology of Money" to metadata.');
    }
}

function saveMetadata() {
    try {
        const entries = Object.fromEntries(bookMetadata);
        fs.writeFileSync(METADATA_PATH, JSON.stringify(entries, null, 2));
        console.log(`Metadata saved to ${METADATA_PATH}.`);
    } catch (e) {
        console.error('Error saving metadata:', e);
    }
}

loadMetadata();

async function processBook(bookId, filePath, metadata) {
    if (bookCache.has(bookId)) {
        console.log(`Vector store for book ID ${bookId} already in cache.`);
        return bookCache.get(bookId);
    }

    console.log(`Indexing book: ${metadata.title} (ID: ${bookId})`);
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found at: ${filePath}`);
    }

    const dataBuffer = fs.readFileSync(filePath);
    console.log('Parsing PDF...');
    const pdfData = await pdf(dataBuffer);
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
    return vectorStore;
}

async function getRAGResponse(bookId, userQuestion, chatHistory = []) {
    const metadata = bookMetadata.get(bookId);
    if (!metadata) {
        throw new Error('Book not found in system library.');
    }

    const vectorStore = await processBook(bookId, metadata.localPath, metadata);

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
    You are a professional book assistant designed to answer questions strictly based on the provided context from the book "{title}" by {author}.

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
        title: metadata.title,
        author: metadata.author,
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
        const metadata = {
            isbn: bookId,
            title: req.file.originalname.replace('.pdf', '').replace(/-/g, ' '),
            author: "Uploaded PDF",
            year: new Date().getFullYear().toString(),
            genre: "Professional",
            rating: 5.0,
            numRatings: 1,
            available: true,
            summary: `Content from uploaded file: ${req.file.originalname}`,
            image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800",
            localPath: req.file.path,
            filename: req.file.filename
        };

        // Cache metadata persistently
        bookMetadata.set(bookId, metadata);
        saveMetadata();

        // Start processing background
        processBook(bookId, metadata.localPath, metadata).catch(e => console.error('BG Process Error:', e));

        // Return metadata so frontend can add it to library
        res.json({ success: true, book: metadata });
    } catch (e) {
        console.error('Upload error:', e);
        res.status(500).json({ error: 'Failed to process uploaded PDF.' });
    }
});

// Added route to get existing metadata list for frontend
app.get('/api/books', (req, res) => {
    res.json(Array.from(bookMetadata.values()));
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`RAG Server explicitly binding to 0.0.0.0 on port ${PORT}`);
    console.log(`Available at: http://127.0.0.1:${PORT}`);
    console.log('--- READY FOR CONNECTIONS ---');
});
