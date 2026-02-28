import './style.css'

// --- HYPER-EXPANDED TOP 200 SIMULATION DATASET ---
// --- HYPER-EXPANDED TOP 200 SIMULATION DATASET ---
const BASE_INVENTORY = [
  { isbn: "978-0552149518", title: "The Midnight Library", author: "Matt Haig", year: "2020", genre: "Fiction", rating: 4.8, numRatings: 1250, available: true, image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800", summary: "Between life and death there is a library where shelves go on forever." },
  { isbn: "978-0062315007", title: "The Alchemist", author: "Paulo Coelho", year: "1988", genre: "Fable", rating: 4.7, numRatings: 3400, available: true, image: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&q=80&w=800", summary: "A fable about following your dream and following your heart." },
  { isbn: "978-0735211292", title: "Atomic Habits", author: "James Clear", year: "2018", genre: "Self-Help", rating: 4.9, numRatings: 5200, available: true, image: "https://images.unsplash.com/photo-1589998059171-988d887df646?auto=format&fit=crop&q=80&w=800", summary: "An easy and proven way to build good habits and break bad ones." },
  { isbn: "978-1524743032", title: "The Silent Patient", author: "Alex Michaelides", year: "2019", genre: "Thriller", rating: 4.5, numRatings: 2800, available: true, image: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&q=80&w=800", summary: "Alicia Berenson's life is perfect until she shoots her husband." },
  { isbn: "978-0593135204", title: "Project Hail Mary", author: "Andy Weir", year: "2021", genre: "Sci-Fi", rating: 4.9, numRatings: 1800, available: true, image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800", summary: "A lone astronaut must save the earth from an internal threat." },
  { isbn: "978-0517543054", title: "The Psychology of Money", author: "Morgan Housel", year: "2020", genre: "Finance", rating: 4.8, numRatings: 2500, available: true, image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=800", pdfUrl: "/books/The-Psychology-of-Money-Morgan-Housel.pdf", summary: "Doing well with money isn’t necessarily about what you know. It's about how you behave." },
];

const imagePool = [
  "1544947950-fa07a98d237f", "1589998059171-988d887df646", "1541963463532-d68292c34b19",
  "1544716278-ca5e3f4abd8c", "1512820790803-83ca734da794", "1507842217357-196395b5b1fb",
  "1521587760476-6c120c0dc36c", "1476275483035-3d8865ca61c2", "1531346878377-ad5b202bd74e",
  "1550399105-05c4a76d181e", "1526243128108-aa15bfdf8917", "1600180753896-74fc67406692",
  "1535905590362-3873ee2b43c4", "1513001900722-370f803f498d", "1495446815901-a7297e633e8d",
  "1512820790803-83ca734da794", "1456513080510-7bf3a84b82f8", "1516979187457-637abb4f9353"
];

// Generate 194 more mock books to reach "Top 200"
const LIBRARY_INVENTORY = [...BASE_INVENTORY];
const additionalAuthors = ["Stephen King", "J.K. Rowling", "James Patterson", "Colleen Hoover", "Michelle Obama", "Yuval Noah Harari", "Elon Musk", "Jordan Peterson", "Ryan Holiday", "Mark Manson"];
const genres = ["Fiction", "Sci-Fi", "Thriller", "Self-Help", "Finance", "Education", "History", "Fantasy", "Philosophy", "Biography"];

for (let i = 0; i < 194; i++) {
  const g = genres[i % genres.length];
  const imgId = imagePool[i % imagePool.length];
  LIBRARY_INVENTORY.push({
    isbn: `978-${Math.floor(Math.random() * 899999999) + 100000000}`,
    title: `Innovative Read Vol. ${i + 1}`,
    author: additionalAuthors[i % additionalAuthors.length],
    year: (2000 + (i % 24)).toString(),
    genre: g,
    rating: parseFloat((4 + Math.random() * 1).toFixed(1)),
    numRatings: Math.floor(Math.random() * 5000),
    available: Math.random() > 0.15,
    image: `https://images.unsplash.com/photo-${imgId}?auto=format&fit=crop&q=60&w=800`,
    summary: "An innovative perspective on modern literature, theory, and professional growth."
  });
}

// --- USER FEEDBACK SYSTEM ---
let userRatings = []; // Stores { isbn, rating, genre }

const RecommendationEngine = {
  getPopularBooks() {
    return [...LIBRARY_INVENTORY]
      .filter(b => b.available)
      .sort((a, b) => b.numRatings - a.numRatings)
      .slice(0, 5);
  },

  getPersonalizedBooks() {
    if (userRatings.length === 0) return this.getPopularBooks();

    const favoriteGenres = userRatings
      .filter(r => r.rating >= 4)
      .map(r => r.genre);

    const alreadyRatedIsbns = userRatings.map(r => r.isbn);

    let candidates = LIBRARY_INVENTORY.filter(b =>
      b.available &&
      !alreadyRatedIsbns.includes(b.isbn)
    );

    let matched = candidates.filter(b => favoriteGenres.includes(b.genre));

    if (matched.length < 5) {
      const remaining = candidates
        .filter(b => !favoriteGenres.includes(b.genre))
        .sort((a, b) => b.rating - a.rating);
      matched = [...matched, ...remaining].slice(0, 5);
    } else {
      matched = matched.sort((a, b) => b.rating - a.rating).slice(0, 5);
    }

    return matched;
  }
};

// DOM Elements
const bookGrid = document.getElementById('book-grid');
const popularGrid = document.getElementById('popular-grid');
const personalizedGrid = document.getElementById('personalized-grid');
const searchInput = document.getElementById('search-input');
const genreFilter = document.getElementById('genre-filter');
const ratingFilter = document.getElementById('rating-filter');
const cursorGlow = document.getElementById('cursor-glow');

// Modal Elements
const modal = document.getElementById('book-modal');
const ratingPrompt = document.getElementById('rating-prompt');
const promptTitle = document.getElementById('prompt-book-title');
const submitRatingBtn = document.getElementById('submit-rating');
const promptStars = document.querySelectorAll('#user-rating-input button');

let activeBook = null;
let selectedUserRating = 0;

// Chat Elements
const chatWidget = document.getElementById('chat-widget');
const openChatBtn = document.getElementById('open-chat-btn');
const closeChatBtn = document.getElementById('close-chat');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat');
const chatMessages = document.getElementById('chat-messages');
const chatBookTitle = document.getElementById('chat-book-title');

// Cursor Glow Effect
document.addEventListener('mousemove', (e) => {
  if (cursorGlow) {
    cursorGlow.style.left = e.clientX + 'px';
    cursorGlow.style.top = e.clientY + 'px';
  }
});

// Update filter events
[searchInput, genreFilter, ratingFilter].forEach(el => {
  el.addEventListener('change', () => handleSearch());
});
searchInput.addEventListener('input', () => handleSearch());

// Rating Prompt Logic
promptStars.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedUserRating = parseInt(btn.dataset.value);
    promptStars.forEach(s => {
      const starVal = parseInt(s.dataset.value);
      s.classList.toggle('selected', starVal <= selectedUserRating);
    });
  });
});

submitRatingBtn.addEventListener('click', () => {
  if (selectedUserRating > 0 && activeBook) {
    userRatings.push({
      isbn: activeBook.isbn,
      rating: selectedUserRating,
      genre: activeBook.genre
    });
    ratingPrompt.classList.remove('active');
    handleSearch();
    selectedUserRating = 0;
    promptStars.forEach(s => s.classList.remove('selected'));
  }
});

function getStarRating(rating) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;
  let starsHtml = '';
  for (let i = 0; i < fullStars; i++) starsHtml += `<svg class="star" width="18" height="18" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
  if (halfStar) starsHtml += `<svg class="star" width="18" height="18" viewBox="0 0 24 24"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4V6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>`;
  for (let i = 0; i < emptyStars; i++) starsHtml += `<svg class="star" style="color: rgba(255,255,255,0.2)" width="18" height="18" viewBox="0 0 24 24"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>`;
  return starsHtml;
}

function openModal(book) {
  activeBook = book;
  document.getElementById('modal-title').textContent = book.title;
  document.getElementById('modal-banner').src = book.image;
  document.getElementById('modal-year').textContent = book.year;
  document.getElementById('modal-summary').textContent = book.summary;
  document.getElementById('modal-author').textContent = book.author;
  document.getElementById('modal-genre').textContent = book.genre;
  document.getElementById('modal-status').textContent = book.available ? 'Available' : 'Borrowed';
  document.getElementById('modal-stars').innerHTML = getStarRating(book.rating);

  const readBtn = document.getElementById('modal-read-btn');
  if (book.pdfUrl) {
    readBtn.style.display = 'flex';
    readBtn.href = book.pdfUrl;
    readBtn.onclick = () => {
      // Simulate reading - just open PDF and keep current book active for rating later
    };
  } else {
    readBtn.style.display = 'none';
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function handleCloseBook() {
  modal.classList.remove('active');
  chatWidget.classList.remove('active'); // Close chat when modal closes
  document.body.style.overflow = '';
  if (activeBook) {
    promptTitle.textContent = activeBook.title;
    ratingPrompt.classList.add('active');
  }
}

document.getElementById('close-modal').addEventListener('click', handleCloseBook);

function createBookCard(book, index) {
  const card = document.createElement('div');
  card.className = 'book-card';
  card.style.opacity = '0';
  card.style.transform = 'translateY(20px)';
  card.addEventListener('click', () => openModal(book));

  const statusClass = book.available ? 'status-available' : 'status-borrowed';
  const statusText = book.available ? 'Available' : 'Borrowed';

  card.innerHTML = `
    <span class="tag">${book.genre}</span>
    <span class="status-badge ${statusClass}">${statusText}</span>
    <div class="book-image-container">
      <img src="${book.image}" alt="${book.title}" class="book-image" loading="lazy">
    </div>
    <div class="book-details">
      <h3 class="book-title" title="${book.title}">${book.title}</h3>
      <p class="book-author">${book.author}</p>
      <div class="meta-info">
        <span class="book-year">${book.year} • ISBN: ${book.isbn.slice(-4)}</span>
        <div class="rating-pill">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
          ${book.rating}
        </div>
      </div>
      <p class="book-summary">${book.summary}</p>
    </div>
  `;

  setTimeout(() => {
    card.style.transition = 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';
  }, index * 100);

  return card;
}

function renderGrids(allBooks, personalizedBooks, popularBooks) {
  bookGrid.innerHTML = '';
  personalizedGrid.innerHTML = '';
  popularGrid.innerHTML = '';
  popularBooks.forEach((book, index) => popularGrid.appendChild(createBookCard(book, index)));
  personalizedBooks.forEach((book, index) => personalizedGrid.appendChild(createBookCard(book, index)));
  allBooks.forEach((book, index) => bookGrid.appendChild(createBookCard(book, index)));
}

function handleSearch() {
  const query = searchInput.value.toLowerCase();
  const genre = genreFilter.value;
  const minRating = parseFloat(ratingFilter.value);

  const filteredAll = LIBRARY_INVENTORY.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query);
    const matchesGenre = genre === 'all' || b.genre === genre;
    const matchesRating = b.rating >= minRating;
    return matchesSearch && matchesGenre && matchesRating;
  });

  const popular = RecommendationEngine.getPopularBooks();
  const personalized = RecommendationEngine.getPersonalizedBooks();
  renderGrids(filteredAll, personalized, popular);
}

// --- CHATBOT LOGIC ---
let chatHistory = [];

function appendMessage(text, isUser = false) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
  msgDiv.textContent = text;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getMockAIResponse(userInput, book) {
  const input = userInput.toLowerCase();

  if (input.includes('who') && input.includes('author')) {
    return `The author of "${book.title}" is ${book.author}. Would you like to know more about their other works?`;
  }

  if (input.includes('summary') || input.includes('about') || input.includes('plot')) {
    return `"${book.title}" is about: ${book.summary}`;
  }

  if (input.includes('year') || input.includes('published')) {
    return `This book was published in ${book.year}. It's considered a classic in the ${book.genre} genre.`;
  }

  if (input.includes('rating') || input.includes('good')) {
    return `"${book.title}" has a rating of ${book.rating}/5 stars from ${book.numRatings} readers. It's highly recommended!`;
  }

  if (input.includes('hello') || input.includes('hi')) {
    return `Hello! I'm your digital librarian. I can tell you about the plot, author, or ratings of "${book.title}". What's on your mind?`;
  }

  return `That's an interesting question about "${book.title}". While I'm still learning, I can tell you it's a ${book.genre} book by ${book.author}. You might enjoy its unique perspective on ${book.summary.split(' ').slice(0, 5).join(' ')}...`;
}

async function handleSendMessage() {
  const text = chatInput.value.trim();
  if (!text || !activeBook) return;

  const currentBookId = activeBook.isbn; // Use ISBN as ID for caching
  appendMessage(text, true);
  const userMessage = { role: 'user', text: text };
  chatInput.value = '';

  // Simulate AI Thinking
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message ai-message';
  typingDiv.textContent = '... Analyzing book context ...';
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const response = await fetch('http://localhost:5000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookId: currentBookId,
        message: text,
        history: chatHistory
      })
    });

    const data = await response.json();
    chatMessages.removeChild(typingDiv);

    if (data.error) {
      appendMessage(`Error: ${data.error}`, false);
    } else {
      appendMessage(data.response, false);
      chatHistory.push(userMessage);
      chatHistory.push({ role: 'assistant', text: data.response });
      // Keep only last 10 messages for speed (5 rounds of Q&A)
      if (chatHistory.length > 10) chatHistory = chatHistory.slice(-10);
    }
  } catch (error) {
    chatMessages.removeChild(typingDiv);
    appendMessage("The assistant is currently offline. Please make sure the backend server is running and your API key is configured.", false);
    console.error('Chat Error:', error);
  }
}

openChatBtn.addEventListener('click', () => {
  if (activeBook) {
    chatBookTitle.textContent = `${activeBook.title} Assistant`;
    // Clear previous chat except welcome message
    const welcomeMsg = chatMessages.firstElementChild;
    chatMessages.innerHTML = '';
    chatMessages.appendChild(welcomeMsg);
    welcomeMsg.textContent = `Hi! I'm your automated assistant for "${activeBook.title}". How can I help you today?`;
    chatHistory = []; // Reset history for new book session

    chatWidget.classList.add('active');
  }
});

closeChatBtn.addEventListener('click', () => {
  chatWidget.classList.remove('active');
});

sendChatBtn.addEventListener('click', handleSendMessage);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleSendMessage();
});

handleSearch();

