const fetch = require('node-fetch');

async function test_chat() {
    try {
        console.log('Sending message to chatbot...');
        const response = await fetch('http://localhost:5000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bookId: '978-0517543054',
                message: 'Who is the author of this book?'
            })
        });
        const data = await response.json();
        console.log('Chatbot response:', data);
    } catch (e) {
        console.error('Test failed:', e.message);
    }
}

test_chat();
