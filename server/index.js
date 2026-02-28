const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

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

const bookCache = new Map();

async function getRAGResponse(bookId, userQuestion) {
    const bookPath = path.join(__dirname, '..', 'public', 'books', 'The-Psychology-of-Money-Morgan-Housel.pdf');

    console.log(`Starting RAG process for book: ${bookPath}`);

    if (!fs.existsSync(bookPath)) {
        console.error(`File NOT found at: ${bookPath}`);
        throw new Error('Book file not found on server.');
    }

    let vectorStore;

    if (bookCache.has(bookId)) {
        console.log('Using cached vector store');
        vectorStore = bookCache.get(bookId);
    } else {
        console.log('Reading PDF file...');
        const dataBuffer = fs.readFileSync(bookPath);
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

        vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);
        console.log('SUCCESS: Vector store ready and cached');
        bookCache.set(bookId, vectorStore);
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
    You are a professional book assistant for the book "The Psychology of Money" by Morgan Housel.
    You have access to snippets from the book being read by the user.
    
    Context:
    {context}
    
    User Question: {question}
    
    Answer the user's question accurately based on the provided context. 
    If the answer is clearly related to the book "The Psychology of Money" or its author Morgan Housel, you can use your general knowledge, but prioritize the context.
    If you don't know the answer or it isn't mentioned in the context and isn't about general book info, say: "I'm sorry, I couldn't find specific information about that in this part of the book."
  `);

    const chain = prompt.pipe(model);
    const response = await chain.invoke({
        context: context,
        question: userQuestion,
    });

    return response.content;
}

app.get('/', (req, res) => {
    res.send('RAG Server is running. Use POST /api/chat for interaction.');
});

app.post('/api/chat', async (req, res) => {
    const { bookId, message } = req.body;
    console.log(`Received message for book ${bookId}: ${message}`);

    if (!message) {
        return res.status(400).json({ error: 'Message is required.' });
    }

    const apiKey = (process.env.GOOGLE_API_KEY || '').trim();

    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE' || apiKey === '') {
        return res.status(500).json({ error: 'Server API key is not configured.' });
    }

    try {
        const aiResponse = await getRAGResponse(bookId || 'default_book', message);
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
