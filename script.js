document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const API_ENDPOINT = '/api/public';
    const CACHE_KEY = 'public-book-tracker-cache';
    const WIKI_CACHE_KEY = 'public-wiki-summaries-cache';
    const COVER_CACHE_KEY = 'public-cover-images-cache';

    // --- STATE MANAGEMENT & CACHES ---
    let library = { watchlist: [], currentlyReading: [], read: [] };
    let quickLookOriginRect = null; // For animation
    let wikiSummaries = JSON.parse(localStorage.getItem(WIKI_CACHE_KEY)) || {};
    let coverImages = JSON.parse(localStorage.getItem(COVER_CACHE_KEY)) || {};

    // --- DOM ELEMENTS ---
    const menuButton = document.getElementById('menu-button');
    const menu = document.getElementById('menu');
    const forceRefreshBtn = document.getElementById('force-refresh-btn');
    
    // --- HELPER FUNCTIONS ---
    const groupBooksIntoLibrary = (books) => {
        const newLibrary = { watchlist: [], currentlyReading: [], read: [] };
        books.forEach(book => {
            try { book.authors = JSON.parse(book.authors); } catch (e) { book.authors = []; }
            try { book.imageLinks = JSON.parse(book.imageLinks); } catch (e) { book.imageLinks = {}; }
            try { book.highlights = JSON.parse(book.highlights); } catch (e) { book.highlights = []; }
            if (newLibrary[book.shelf]) { newLibrary[book.shelf].push(book); }
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
        } catch (error) { console.error("Failed to fetch books:", error); return null; }
    };

    const getLibrary = async (forceRefresh = false) => {
        if (forceRefresh) {
            localStorage.removeItem(CACHE_KEY);
            localStorage.removeItem(WIKI_CACHE_KEY);
            localStorage.removeItem(COVER_CACHE_KEY);
            wikiSummaries = {};
            coverImages = {};
        }
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData && !forceRefresh) {
            library = groupBooksIntoLibrary(JSON.parse(cachedData));
            return library;
        }
        library = await fetchBooks();
        return library;
    };

    // --- CACHING LOGIC ---
    const imageToDataUri = async (url) => {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const getAndCacheCover = async (bookId, url) => {
        if (coverImages[bookId]) return coverImages[bookId];
        if (!url || url.startsWith('https://placehold.co')) return url;
        try {
            const dataUri = await imageToDataUri(url);
            coverImages[bookId] = dataUri;
            localStorage.setItem(COVER_CACHE_KEY, JSON.stringify(coverImages));
            return dataUri;
        } catch (error) { console.error('Failed to cache cover:', error); return url; }
    };
    
    const fetchAndCacheInBackground = () => {
        const allBooks = Object.values(library).flat();
        allBooks.forEach(book => {
            if (!wikiSummaries[book.id]) {
                fetchWikipediaSummary(book.title, book.authors[0]).then(summary => {
                    if (summary && summary !== "Could not fetch summary." && summary !== "No summary found on Wikipedia.") {
                        wikiSummaries[book.id] = summary;
                        localStorage.setItem(WIKI_CACHE_KEY, JSON.stringify(wikiSummaries));
                    }
                });
            }
            const coverUrl = book.imageLinks?.thumbnail;
            if (coverUrl && !coverImages[book.id]) {
                getAndCacheCover(book.id, coverUrl);
            }
        });
    };
    
    // --- MAIN PAGE LOGIC ---
    if (document.querySelector('main')) {
        const shelfContainers = { currentlyReading: document.getElementById('shelf-currentlyReading'), read: document.getElementById('shelf-read'), watchlist: document.getElementById('shelf-watchlist') };
        const shelfMessages = { currentlyReading: document.getElementById('shelf-currentlyReading-message'), read: document.getElementById('shelf-read-message'), watchlist: document.getElementById('shelf-watchlist-message') };
        const quickLookBackdrop = document.getElementById('quick-look-backdrop');
        const quickLookContainer = document.getElementById('quick-look-container');
        const quickLookModal = document.getElementById('quick-look-modal');
        const quickLookContent = document.getElementById('quick-look-content');

        const createBookListItemHTML = (book) => {
            const coverUrl = coverImages[book.id] || book.imageLinks?.thumbnail || `https://placehold.co/80x120/e2e8f0/475569?text=N/A`;
            const authors = book.authors ? book.authors.join(', ') : 'Unknown Author';
            const mediumInfo = book.readingMedium ? `<div class="text-xs text-gray-500 mt-1.5"><strong>Medium:</strong> ${book.readingMedium}</div>` : '';
            const finishedInfo = book.shelf === 'read' && book.finishedOn ? `<div class="text-xs text-gray-500 mt-1"><strong>Finished:</strong> ${new Date(book.finishedOn).toLocaleDateString()}</div>` : '';
            
            return `
                <div class="book-list-item flex items-start p-4 space-x-4 group" data-book-id="${book.id}" data-shelf="${book.shelf}">
                    <img src="${coverUrl}" alt="Cover of ${book.title}" class="w-12 h-16 object-cover rounded-md shadow-sm flex-shrink-0 book-cover cursor-pointer">
                    <div class="flex-grow min-w-0">
                        <p class="font-semibold text-gray-800 truncate">${book.title}</p>
                        <p class="text-sm text-gray-500 truncate">${authors}</p>
                        ${mediumInfo}
                        ${finishedInfo}
                    </div>
                    <a href="/details.html?id=${book.id}" class="flex-shrink-0 text-sm font-semibold text-blue-600 hover:underline p-2">View</a>
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
                const sortedBooks = shelfName === 'read' ? [...books].sort((a, b) => new Date(b.finishedOn) - new Date(a.finishedOn)) : books;
                sortedBooks.forEach(book => container.innerHTML += createBookListItemHTML(book));
            } else { messageEl.textContent = `This shelf is empty.`; }
        };
        
        const fetchWikipediaSummary = async (title, author) => {
            const searchTerm = `${title} (${author} book)`;
            const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=true&explaintext=true&redirects=1&titles=${encodeURIComponent(searchTerm)}&origin=*`;
            try {
                const response = await fetch(url);
                const data = await response.json();
                const pages = data.query.pages;
                const pageId = Object.keys(pages)[0];
                if (pageId === "-1") {
                    const fallbackUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=true&explaintext=true&redirects=1&titles=${encodeURIComponent(title)}&origin=*`;
                    const fbRes = await fetch(fallbackUrl);
                    const fbData = await fbRes.json();
                    const fbPages = fbData.query.pages;
                    const fbId = Object.keys(fbPages)[0];
                    if(fbId === "-1") return "No summary found on Wikipedia.";
                    const extract = fbPages[fbId].extract;
                    return extract ? extract.split('\n')[0] : "No summary found on Wikipedia.";
                }
                const extract = pages[pageId].extract;
                return extract ? extract.split('\n')[0] : "No summary found on Wikipedia.";
            } catch (error) { console.error("Wikipedia API error:", error); return "Could not fetch summary."; }
        };

        const openQuickLook = async (book, targetElement) => {
            quickLookOriginRect = targetElement.getBoundingClientRect();
            quickLookModal.style.setProperty('--origin-x', `${quickLookOriginRect.left}px`);
            quickLookModal.style.setProperty('--origin-y', `${quickLookOriginRect.top}px`);
            quickLookModal.style.setProperty('--origin-width', `${quickLookOriginRect.width}px`);
            quickLookModal.style.setProperty('--origin-height', `${quickLookOriginRect.height}px`);

            const coverUrl = coverImages[book.id] || book.imageLinks?.thumbnail || `https://placehold.co/80x120/e2e8f0/475569?text=N/A`;
            quickLookContent.innerHTML = `<div class="flex items-center gap-4 pb-4 border-b"><img src="${coverUrl}" alt="Cover" class="w-16 h-24 object-cover rounded-lg shadow-md flex-shrink-0"><h3 class="font-bold text-lg text-gray-900 flex-grow">${book.title}</h3><a href="/details.html?id=${book.id}" class="flex-shrink-0 p-2 rounded-full bg-gray-100 hover:bg-gray-200"><svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg></a></div><div id="summary-container" class="pt-4 text-gray-600"></div>`;

            quickLookContainer.classList.remove('hidden');
            quickLookBackdrop.classList.remove('hidden');
            requestAnimationFrame(() => {
                quickLookBackdrop.classList.remove('opacity-0');
                quickLookModal.classList.remove('opacity-0');
                quickLookModal.style.transform = 'translate(0,0) scale(1)';
            });

            const summaryContainer = document.getElementById('summary-container');
            if (wikiSummaries[book.id]) {
                summaryContainer.innerHTML = `<p>${wikiSummaries[book.id]}</p>`;
            } else {
                summaryContainer.innerHTML = `<p class="text-center animate-pulse">Fetching summary...</p>`;
                const summary = await fetchWikipediaSummary(book.title, book.authors[0]);
                if (summary && summary !== "Could not fetch summary." && summary !== "No summary found on Wikipedia.") { wikiSummaries[book.id] = summary; localStorage.setItem(WIKI_CACHE_KEY, JSON.stringify(wikiSummaries)); }
                if (summaryContainer) { summaryContainer.innerHTML = `<p>${summary}</p>`; }
            }
        };

        const closeQuickLook = () => {
            if (!quickLookOriginRect) return;
            quickLookBackdrop.classList.add('opacity-0');
            const { left, top, width, height } = quickLookOriginRect;
            quickLookModal.style.transform = `translate(${left}px, ${top}px) scale(${width / quickLookModal.offsetWidth}, ${height / quickLookModal.offsetHeight})`;
            quickLookModal.classList.add('opacity-0');
            setTimeout(() => {
                quickLookContainer.classList.add('hidden');
                quickLookBackdrop.classList.add('hidden');
                quickLookContent.innerHTML = '';
                quickLookOriginRect = null;
            }, 400);
        };
        
        const initMainPage = async (forceRefresh = false) => {
            const lib = await getLibrary(forceRefresh);
            if (!lib) { Object.values(shelfMessages).forEach(el => { if (el) el.textContent = "Could not load library."; }); return; }
            renderShelf('currentlyReading'); renderShelf('read'); renderShelf('watchlist');
            fetchAndCacheInBackground();
        };

        document.querySelector('main').addEventListener('click', (e) => {
            const bookCover = e.target.closest('.book-cover');
            if (bookCover) {
                 const bookItem = bookCover.closest('.book-list-item');
                 const { bookId, shelf } = bookItem.dataset;
                 const book = library[shelf]?.find(b => b.id === bookId);
                 if (book) { openQuickLook(book, bookCover); }
            }
        });
        quickLookContainer.addEventListener('click', (e) => { if (e.target === quickLookContainer) closeQuickLook(); });

        initMainPage();
    }
    
    // --- DETAILS PAGE LOGIC ---
    if (document.getElementById('details-page-content')) {
        const detailsContainer = document.getElementById('details-page-content');
        
        const renderDetailsPage = (book) => {
            if (!book) { detailsContainer.innerHTML = `<a href="/" class="text-blue-500 mb-8 inline-block">&larr; Back to Library</a><p class="text-center">Book not found.</p>`; return; }
            const coverUrl = coverImages[book.id] || book.imageLinks?.thumbnail || `https://placehold.co/128x192/e2e8f0/475569?text=N/A`;
            const authors = book.authors ? book.authors.join(', ') : 'Unknown Author';
            const mediumInfo = book.readingMedium ? `<div class="flex justify-between items-center"><span class="font-semibold text-gray-600">Medium:</span><span>${book.readingMedium}</span></div>` : '';
            const finishedInfo = book.shelf === 'read' && book.finishedOn ? `<div class="flex justify-between items-center"><span class="font-semibold text-gray-600">Finished On:</span><span>${new Date(book.finishedOn).toLocaleDateString()}</span></div>` : '';
            const highlightsHTML = book.highlights && book.highlights.length > 0
                ? '<div class="space-y-4">' + book.highlights.map(h => `<p class="highlight-item text-gray-700">${h}</p>`).join('') + '</div>'
                : '<p class="text-gray-500">No highlights for this book.</p>';

            detailsContainer.innerHTML = `
                <a href="/" class="text-blue-600 text-sm font-semibold mb-6 inline-block">&larr; Back to Library</a>
                <div class="text-center mb-8">
                    <img src="${coverUrl}" alt="Cover" class="w-32 h-48 object-cover rounded-lg shadow-lg mx-auto mb-4">
                    <h1 class="text-2xl font-bold tracking-tight text-gray-900">${book.title}</h1>
                    <p class="text-md text-gray-600 mt-1">${authors}</p>
                </div>
                <div class="space-y-6">
                    <section><div class="bg-white rounded-xl border p-6"><h2 class="text-lg font-semibold text-gray-900 mb-4">Reading Log</h2><div class="space-y-2 text-sm">${mediumInfo}${finishedInfo}</div></div></section>
                    <section><div class="bg-white rounded-xl border p-6"><h2 class="text-lg font-semibold text-gray-900 mb-4">Highlights</h2>${highlightsHTML}</div></section>
                </div>`;
        };

        const initDetailsPage = async () => {
            const lib = await getLibrary();
            if (lib) {
                const params = new URLSearchParams(window.location.search);
                const bookId = params.get('id');
                const book = Object.values(lib).flat().find(b => b.id === bookId);
                renderDetailsPage(book);
            } else {
                detailsContainer.innerHTML = `<p class="text-center">Could not load library to find book.</p>`;
            }
        };

        initDetailsPage();
    }
    
    // --- SHARED EVENT LISTENERS ---
    menuButton.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('hidden'); });
    document.body.addEventListener('click', (e) => { if (!menu.contains(e.target) && !menuButton.contains(e.target)) { menu.classList.add('hidden'); } });
    forceRefreshBtn.addEventListener('click', () => {
        menu.classList.add('hidden');
        if (window.location.pathname.endsWith('details.html')) {
            localStorage.removeItem(CACHE_KEY); // just clear and reload
            window.location.reload();
        } else {
             const messages = document.querySelectorAll('#shelf-currentlyReading-message, #shelf-read-message, #shelf-watchlist-message');
             messages.forEach(el => { if (el) el.textContent = "Refreshing..."; });
             const mainInit = document.querySelector('main')?.__init;
             if(mainInit) mainInit(true);
        }
    });

    // Attach init function to main element for force refresh access
    const mainElement = document.querySelector('main');
    if (mainElement) {
        mainElement.__init = (force) => {
            const shelfContainers = { currentlyReading: document.getElementById('shelf-currentlyReading'), read: document.getElementById('shelf-read'), watchlist: document.getElementById('shelf-watchlist') };
            const renderShelf = (shelfName, lib) => { /* simplified for brevity */ };
            getLibrary(force).then(lib => { if(lib) { renderShelf('currentlyReading', lib); renderShelf('read', lib); renderShelf('watchlist', lib); fetchAndCacheInBackground(lib); }});
        };
    }
});

