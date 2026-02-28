const { getRAGResponse } = require('./index_logic.js'); // I need to export it first
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

async function debug() {
    try {
        console.log('Testing RAG Response...');
        const res = await getRAGResponse('test_book', 'Who is the author?');
        console.log('RESULT:', res);
    } catch (e) {
        console.error('DEBUG ERROR:', e);
    }
}
debug();
