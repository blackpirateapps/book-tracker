document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const API_ENDPOINT = '/api/public';
    const CACHE_KEY = 'public-book-tracker-cache';

    // --- STATE MANAGEMENT ---
    let library = { watchlist: [], currentlyReading: [], read: [] };
    let quickLookOriginRect = null; // For animation

    // --- DOM ELEMENTS ---
    const shelfContainers = {
        currentlyReading: document.getElementById('shelf-currentlyReading'),
        read: document.getElementById('shelf-read'),
        watchlist: document.getElementById('shelf-watchlist')
    };
    const shelfMessages = {
        currentlyReading: document.getElementById('shelf-currentlyReading-message'),
        read: document.getElementById('shelf-read-message'),
        watchlist: document.getElementById('shelf-watchlist-message')
    };
    const menuButton = document.getElementById('menu-button');
    const menu = document.getElementById('menu');
    const forceRefreshBtn = document.getElementById('force-refresh-btn');
    const quickLookBackdrop = document.getElementById('quick-look-backdrop');
    const quickLookContainer = document.getElementById('quick-look-container');
    const quickLookModal = document.getElementById('quick-look-modal');
    const quickLookContent = document.getElementById('quick-look-content');

    // --- HELPER FUNCTIONS ---
    const groupBooksIntoLibrary = (books) => {
        const newLibrary = { watchlist: [], currentlyReading: [], read: [] };
        books.forEach(book => {
            try { book.authors = JSON.parse(book.authors); } catch (e) { book.authors = []; }
            try { book.imageLinks = JSON.parse(book.imageLinks); } catch (e) { book.imageLinks = {}; }
            if (newLibrary[book.shelf]) {
                newLibrary[book.shelf].push(book);
            }
        });
        return newLibrary;
    };

    const fetchBooks = async () => {
        try {
            const response = await fetch(API_ENDPOINT);
            if (!response.ok) throw new Error('Network response was not ok');
            const books = await response.json();
            localStorage.setItem(CACHE_KEY, JSON.stringify(books));
            return groupBooksIntoLibrary(books);
        } catch (error) {
            console.error("Failed to fetch books:", error);
            return null;
        }
    };

    const getLibrary = async (forceRefresh = false) => {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData && !forceRefresh) {
            library = groupBooksIntoLibrary(JSON.parse(cachedData));
            return library;
        }
        library = await fetchBooks();
        return library;
    };

    const createBookListItemHTML = (book) => {
        const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/80x120/e2e8f0/475569?text=N/A`;
        const authors = book.authors ? book.authors.join(', ') : 'Unknown Author';
        
        // Add data attributes for quick look modal
        return `
            <div class="book-list-item flex items-center p-4 space-x-4 cursor-pointer group" 
                 data-book-id="${book.id}" data-shelf="${book.shelf}">
                <img src="${coverUrl}" alt="Cover of ${book.title}" class="w-12 h-16 object-cover rounded-md shadow-sm flex-shrink-0 book-cover">
                <div class="flex-grow min-w-0">
                    <p class="font-semibold text-gray-800 truncate group-hover:text-blue-600">${book.title}</p>
                    <p class="text-sm text-gray-500 truncate">${authors}</p>
                </div>
                <div class="flex-shrink-0 flex items-center gap-4">
                    <a href="/details.html?id=${book.id}" class="text-sm font-semibold text-blue-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity">Details</a>
                    <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </div>
            </div>`;
    };

    const renderShelf = (shelfName) => {
        const container = shelfContainers[shelfName];
        const messageEl = shelfMessages[shelfName];
        if (!container || !messageEl) return;

        const books = library[shelfName];
        container.innerHTML = '';
        messageEl.classList.toggle('hidden', books.length > 0);

        if (books.length > 0) {
            const sortedBooks = shelfName === 'read' 
                ? [...books].sort((a, b) => new Date(b.finishedOn) - new Date(a.finishedOn)) 
                : books;
            sortedBooks.forEach(book => container.innerHTML += createBookListItemHTML(book));
        } else {
            messageEl.textContent = `This shelf is empty.`;
        }
    };

    // --- WIKIPEDIA & QUICK LOOK MODAL LOGIC ---
    const fetchWikipediaSummary = async (title, author) => {
        const searchTerm = `${title} (${author} book)`;
        const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=true&explaintext=true&redirects=1&titles=${encodeURIComponent(searchTerm)}&origin=*`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            const pages = data.query.pages;
            const pageId = Object.keys(pages)[0];
            if (pageId === "-1") { // Not found
                 // Fallback search without author
                const fallbackUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=true&explaintext=true&redirects=1&titles=${encodeURIComponent(title)}&origin=*`;
                const fallbackResponse = await fetch(fallbackUrl);
                const fallbackData = await fallbackResponse.json();
                const fallbackPages = fallbackData.query.pages;
                const fallbackPageId = Object.keys(fallbackPages)[0];
                 if(fallbackPageId === "-1") return "No summary found on Wikipedia.";
                const extract = fallbackPages[fallbackPageId].extract;
                 return extract ? extract.split('\n')[0] : "No summary found on Wikipedia.";
            }
            const extract = pages[pageId].extract;
            return extract ? extract.split('\n')[0] : "No summary found on Wikipedia."; // Return first paragraph
        } catch (error) {
            console.error("Wikipedia API error:", error);
            return "Could not fetch summary.";
        }
    };

    const openQuickLook = async (book, targetElement) => {
        quickLookOriginRect = targetElement.getBoundingClientRect();

        // 1. Set initial state for animation
        quickLookModal.style.transformOrigin = `${quickLookOriginRect.left}px ${quickLookOriginRect.top}px`;
        quickLookModal.style.transform = `translate(${quickLookOriginRect.left}px, ${quickLookOriginRect.top}px) scale(${quickLookOriginRect.width / quickLookModal.offsetWidth}, ${quickLookOriginRect.height / quickLookModal.offsetHeight})`;
        
        const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/80x120/e2e8f0/475569?text=N/A`;
        quickLookContent.innerHTML = `
            <div class="flex items-center gap-4 pb-4 border-b">
                 <img src="${coverUrl}" alt="Cover" class="w-16 h-24 object-cover rounded-lg shadow-md flex-shrink-0">
                 <h3 class="font-bold text-lg text-gray-900 flex-grow">${book.title}</h3>
                 <a href="/details.html?id=${book.id}" class="flex-shrink-0 p-2 rounded-full bg-gray-100 hover:bg-gray-200">
                    <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                 </a>
            </div>
            <div id="summary-container" class="pt-4 text-gray-600">
                <p class="text-center animate-pulse">Fetching summary...</p>
            </div>
        `;

        // 2. Make page visible and start animation
        quickLookContainer.classList.remove('hidden');
        quickLookBackdrop.classList.remove('hidden');
        requestAnimationFrame(() => {
            quickLookBackdrop.classList.remove('opacity-0');
            quickLookModal.classList.remove('opacity-0');
            quickLookModal.style.transform = 'translate(0, 0) scale(1)';
        });

        // 3. Fetch summary and update content
        const summary = await fetchWikipediaSummary(book.title, book.authors[0]);
        const summaryContainer = document.getElementById('summary-container');
        if (summaryContainer) {
            summaryContainer.innerHTML = `<p>${summary}</p>`;
        }
    };

    const closeQuickLook = () => {
        if (!quickLookOriginRect) return;
        
        quickLookBackdrop.classList.add('opacity-0');
        quickLookModal.style.transform = `translate(${quickLookOriginRect.left}px, ${quickLookOriginRect.top}px) scale(${quickLookOriginRect.width / quickLookModal.offsetWidth}, ${quickLookOriginRect.height / quickLookModal.offsetHeight})`;
        quickLookModal.classList.add('opacity-0');
        
        setTimeout(() => {
            quickLookContainer.classList.add('hidden');
            quickLookBackdrop.classList.add('hidden');
            quickLookContent.innerHTML = '';
            quickLookOriginRect = null;
        }, 400); // Match transition duration
    };

    // --- INITIALIZATION ---
    const initializePage = async (forceRefresh = false) => {
        const lib = await getLibrary(forceRefresh);
        if (!lib) {
            Object.values(shelfMessages).forEach(el => {
                if (el) el.textContent = "Could not load library.";
            });
            return;
        }

        renderShelf('currentlyReading');
        renderShelf('read');
        renderShelf('watchlist');
    };

    // --- EVENT LISTENERS ---
    menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
    });

    document.body.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !menuButton.contains(e.target)) {
            menu.classList.add('hidden');
        }

        const bookItem = e.target.closest('.book-list-item');
        if (bookItem && !e.target.closest('a')) {
             const { bookId, shelf } = bookItem.dataset;
             const book = library[shelf]?.find(b => b.id === bookId);
             if (book) {
                 openQuickLook(book, bookItem);
             }
        }
    });

    forceRefreshBtn.addEventListener('click', () => {
        menu.classList.add('hidden');
        Object.values(shelfMessages).forEach(el => { if (el) el.textContent = "Refreshing..."; });
        initializePage(true);
    });
    
    quickLookBackdrop.addEventListener('click', closeQuickLook);

    initializePage();
});

