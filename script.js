document.addEventListener('DOMContentLoaded', () => {
    const API_ENDPOINT = '/api/public';
    const PUBLIC_CACHE_KEY = 'public-book-library-cache';
    let library = null;

    const getPublicLibrary = async (forceRefresh = false) => {
        const cachedData = localStorage.getItem(PUBLIC_CACHE_KEY);
        if (cachedData && !forceRefresh) {
            try {
                library = JSON.parse(cachedData);
                return library;
            } catch (e) {
                localStorage.removeItem(PUBLIC_CACHE_KEY);
            }
        }
        
        try {
            const response = await fetch(API_ENDPOINT);
            if (!response.ok) throw new Error('Failed to fetch library.');
            const books = await response.json();
            const groupedLibrary = { currentlyReading: [], read: [], watchlist: [] };
            books.forEach(book => {
                try { book.authors = JSON.parse(book.authors); } catch (e) { book.authors = []; }
                try { book.imageLinks = JSON.parse(book.imageLinks); } catch (e) { book.imageLinks = {}; }
                if (groupedLibrary[book.shelf]) groupedLibrary[book.shelf].push(book);
            });
            localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify(groupedLibrary));
            library = groupedLibrary;
            return library;
        } catch (error) {
            console.error(error);
            return null;
        }
    };

    const showToast = (message) => { 
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        if (!toast || !toastMessage) return;
        toastMessage.textContent = message; 
        toast.classList.remove('opacity-0'); 
        setTimeout(() => toast.classList.add('opacity-0'), 3000);
    };

    if (document.getElementById('public-library')) {
        const currentlyReadingContainer = document.getElementById('public-currentlyReading');
        const readContainer = document.getElementById('public-read');
        const watchlistContainer = document.getElementById('public-watchlist');
        const menuButton = document.getElementById('menu-button');
        const menu = document.getElementById('menu');
        const forceRefreshBtn = document.getElementById('force-refresh-btn');

        const createBookListItem = (book, shelf) => {
            const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/80x120/e2e8f0/475569?text=N/A`;
            const authors = book.authors ? book.authors.join(', ') : 'Unknown Author';

            let metaInfo = '';
            if (book.readingMedium) {
                metaInfo += `<span class="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">${book.readingMedium}</span>`;
            }
            if (shelf === 'read' && book.finishedOn) {
                const finishedDate = new Date(book.finishedOn).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                metaInfo += `<span class="text-xs text-gray-500">Finished: ${finishedDate}</span>`;
            }

            // MODIFIED: Check the 'hasHighlights' flag to decide whether to show the link.
            let highlightsButton = '';
            if (book.hasHighlights) {
                highlightsButton = `<a href="/details.html?id=${book.id}" class="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline">View Highlights</a>`;
            }

            return `
                <div class="book-list-item flex items-start p-4 space-x-4">
                    <img src="${coverUrl}" alt="Cover of ${book.title}" class="w-14 h-20 object-cover rounded-md shadow-sm flex-shrink-0">
                    <div class="flex-grow">
                        <a href="/details.html?id=${book.id}" class="font-semibold text-gray-800 hover:underline">${book.title}</a>
                        <p class="text-sm text-gray-500 mb-2">${authors}</p>
                        <div class="flex items-center space-x-3 flex-wrap gap-y-1">
                            ${metaInfo}
                            ${highlightsButton}
                        </div>
                    </div>
                    <a href="/details.html?id=${book.id}" class="flex-shrink-0 pt-1">
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </a>
                </div>
            `;
        };
        
        const renderAllShelves = (lib) => {
            renderShelf(lib.currentlyReading, currentlyReadingContainer, 'currentlyReading');
            const sortedRead = [...lib.read].sort((a,b) => new Date(b.finishedOn) - new Date(a.finishedOn));
            renderShelf(sortedRead, readContainer, 'read');
            renderShelf(lib.watchlist, watchlistContainer, 'watchlist');
        }

        const renderShelf = (shelf, container, shelfName) => {
            if (shelf.length > 0) {
                container.innerHTML = shelf.map(book => createBookListItem(book, shelfName)).join('');
            } else {
                container.innerHTML = `<p class="p-8 text-center text-gray-500">Nothing here yet.</p>`;
            }
        };

        getPublicLibrary().then(lib => {
            if (lib) {
                renderAllShelves(lib);
            } else {
                 currentlyReadingContainer.innerHTML = `<p class="p-8 text-center text-red-500">Could not load library.</p>`;
                 readContainer.innerHTML = `<p class="p-8 text-center text-red-500">Could not load library.</p>`;
                 watchlistContainer.innerHTML = `<p class="p-8 text-center text-red-500">Could not load library.</p>`;
            }
        });
        
        // ... (Event listeners for menu remain the same)
    }

    // --- MODIFIED: Entire logic for the details page is new ---
    if (document.getElementById('public-details-content')) {
        const detailsContainer = document.getElementById('public-details-content');
        
        const renderDetails = (book) => {
            if (!book) {
                detailsContainer.innerHTML = `<a href="/" class="text-blue-500 mb-8 inline-block">&larr; Back to Library</a><p class="text-center text-gray-500">Book not found.</p>`;
                return;
            }

            // Data from the new API call will need parsing just in case.
            try { book.authors = JSON.parse(book.authors); } catch (e) { book.authors = Array.isArray(book.authors) ? book.authors : []; }
            try { book.imageLinks = JSON.parse(book.imageLinks); } catch (e) { book.imageLinks = typeof book.imageLinks === 'object' ? book.imageLinks : {}; }
            try { book.highlights = JSON.parse(book.highlights); } catch (e) { book.highlights = []; }

            const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/128x192/e2e8f0/475569?text=N/A`;
            const authors = book.authors.join(', ') || 'Unknown Author';
            
            let highlightsHTML = '<p class="text-gray-500">No highlights for this book.</p>';
            if (book.highlights && book.highlights.length > 0) {
                highlightsHTML = `<div class="space-y-4">${book.highlights.map(h => `<p class="highlight-item text-gray-700">${h}</p>`).join('')}</div>`;
            }
            
            // ... (metaInfoHTML logic remains the same as before) ...

            detailsContainer.innerHTML = `
                <a href="/" class="text-blue-500 mb-8 inline-block">&larr; Back to Library</a>
                <div class="text-center mb-8">
                    <img src="${coverUrl}" alt="Cover of ${book.title}" class="w-32 h-48 object-cover rounded-lg shadow-lg mx-auto mb-4">
                    <h1 class="text-2xl font-bold tracking-tight text-gray-900">${book.title}</h1>
                    <p class="text-md text-gray-600 mt-1">${authors}</p>
                </div>
                <div class="bg-white rounded-xl border border-gray-200/75 p-6">
                    <h2 class="text-lg font-semibold text-gray-900 mb-4">Highlights</h2>
                    ${highlightsHTML}
                </div>
            `;
        };

        const fetchBookDetails = async () => {
            const params = new URLSearchParams(window.location.search);
            const bookId = params.get('id');

            if (!bookId) {
                renderDetails(null);
                return;
            }

            try {
                // Fetch full details for this specific book from the new endpoint.
                const response = await fetch(`/api/book?id=${bookId}`);
                if (!response.ok) throw new Error('Book not found.');
                const book = await response.json();
                renderDetails(book);
            } catch (error) {
                console.error(error);
                detailsContainer.innerHTML = `<a href="/" class="text-blue-500 mb-8 inline-block">&larr; Back to Library</a><p class="text-center text-red-500">Could not load book details.</p>`;
            }
        };

        fetchBookDetails();
    }
});