# 📚 Lumina Books | Your AI-Powered Digital Library

Imagine you have a super-smart robot friend who can read an **entire book** in just 20 seconds and then answer any question you have about it. That is exactly what **Lumina Books** does!

Lumina Books isn't just a website to see book names; it's a "living library" where you can upload your own PDF books and chat with them instantly.

---

## 🚀 How does it work? (The Simple Explanation)

In the world of AI, we use something called **RAG** (Retrieval-Augmented Generation). Think of it like a student taking an "Open Book Exam":

1.  **Reading (Loading)**: The system reads your PDF book.
2.  **Highlighting (Chunking)**: It breaks the book into small paragraphs, just like you might highlight important parts with a marker.
3.  **The Memory Box (Vector DB)**: It stores these "highlights" in a special digital memory box.
4.  **Searching (Retrieval)**: When you ask a question, the AI quickly searches its memory box for the most relevant paragraphs.
5.  **Answering (Generation)**: The AI reads those specific paragraphs and gives you a perfect answer!

---

## 🛠️ The Tech "Superpowers" Inside

We used some of the world's most advanced technology to build this:

*   **HTML/CSS/JS**: This is the "Skin & Clothes" of the website. It makes everything look beautiful, like Netflix.
*   **Node.js & Express**: This is the "Brain" on the server. it handles all the heavy thinking and file management.
*   **Groq (Llama 3)**: This is the "Ultra-Fast Speaker." It's the AI that talks to you and answers your questions at lightning speed.
*   **Gemini AI**: This is the "Translator." It helps the computer understand human language by turning words into mathematical points (Embeddings).
*   **LangChain**: This is the "Orchestra Conductor." It helps all the different AI parts work together in perfect harmony.
*   **Multer**: This is the "Mailman." It safely carries the PDF files you upload from your computer to the server.

---

## 🌟 Cool Features

*   **Netflix-Style UI**: A premium, dark-mode design that feels like a modern streaming app.
*   **Dynamic PDF Uploader**: Upload any book! It doesn't just work for one book; it works for *all* of them.
*   **Persistent Storage**: If you upload a book today, it will still be there tomorrow when you come back.
*   **Conversational Memory**: The AI remembers what you said just a moment ago, so you can have a real conversation.

---

## ⚙️ How to Start the Magic

If you want to run this on your own computer:

1.  **Get your secrets**: Add your `GEMINI_API_KEY` and `GROQ_API_KEY` to the `.env` file in the `server` folder.
2.  **Start the Brain (Backend)**:
    ```bash
    cd server
    npm install
    node index.js
    ```
3.  **Start the Beauty (Frontend)**:
    ```bash
    # Open a new terminal
    npm install
    npm run dev
    ```
4.  **Enjoy**: Open [http://localhost:5173](http://localhost:5173) and start your AI reading journey!

---

**Built with ❤️ for Book Lovers**
