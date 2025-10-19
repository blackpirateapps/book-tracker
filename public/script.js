// public/script.js
document.addEventListener('DOMContentLoaded', () => {
    const PUBLIC_API_ENDPOINT = '/api/public';
    const TAGS_API_ENDPOINT = '/api/tags'; // New endpoint
    const DETAILS_API_ENDPOINT = '/api/highlights'; // Assuming this is correct based on original file
    const RANDOM_HIGHLIGHT_ENDPOINT = '/api/random-highlight';
    const PUBLIC_CACHE_KEY = 'public-book-library-cache';
    const TAGS_CACHE_KEY = 'all-tags-cache'; // New cache key for tags

    let allTagsMap = new Map(); // Store all tags { id: { name, color } }

    const fetchAndDisplayRandomHighlight = async () => {
        const container = document.getElementById('random-highlight-container');
        if (!container) return;

        const skeleton = document.getElementById('highlight-skeleton');
        const contentContainer = document.getElementById('highlight-content');

        try {
            const response = await fetch(RANDOM_HIGHLIGHT_ENDPOINT);
            if (!response.ok) throw new Error('Could not fetch highlight.');

            const data = await response.json();

            const quoteHTML = `
                <blockquote class="text-gray-600 pr-10">
                    <p id="highlight-text" class="text-lg leading-relaxed">“${data.highlight}”</p>
                    <figcaption class="mt-4 text-sm text-right text-gray-500">
                        — ${data.author}, <cite class="font-semibold not-italic text-gray-700">${data.title}</cite>
                    </figcaption>
                </blockquote>
                <button id="expand-highlight-btn" title="Expand highlight" class="absolute bottom-4 right-4 p-2 rounded-full hover:bg-gray-100">
                    <svg id="expand-collapse-icon" class="w-5 h-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </button>
            `;
            contentContainer.innerHTML = quoteHTML;

            if(skeleton) skeleton.style.display = 'none';
            contentContainer.classList.remove('hidden');

            const highlightText = document.getElementById('highlight-text');
            const expandButton = document.getElementById('expand-highlight-btn');

            setTimeout(() => {
                const isOverflowing = highlightText.scrollHeight > highlightText.clientHeight;
                if (isOverflowing) {
                    highlightText.classList.add('has-overflow');
                    expandButton.classList.add('visible');
                }
            }, 100);

            expandButton.addEventListener('click', () => {
                const isExpanded = highlightText.classList.toggle('expanded');
                expandButton.setAttribute('title', isExpanded ? 'Collapse highlight' : 'Expand highlight');
            });

        } catch (error) {
            console.error(error);
            container.style.display = 'none';
        }
    };

    // NEW: Function to fetch all tags
    const fetchAllTags = async (forceRefresh = false) => {
        const cachedTags = localStorage.getItem(TAGS_CACHE_KEY);
        if (cachedTags && !forceRefresh) {
            try {
                const tags = JSON.parse(cachedTags);
                allTagsMap = new Map(tags.map(tag => [tag.id, tag]));
                return true;
            } catch (e) { localStorage.removeItem(TAGS_CACHE_KEY); }
        }
        try {
            const response = await fetch(TAGS_API_ENDPOINT);
            if (!response.ok) throw new Error('Failed to fetch tags.');
            const tags = await response.json();
            allTagsMap = new Map(tags.map(tag => [tag.id, tag])); // Populate the map
            localStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(tags));
            return true;
        } catch (error) {
            console.error('Error fetching tags:', error);
            return false;
        }
    };

    const getPublicLibrary = async (forceRefresh = false) => {
        const cachedData = localStorage.getItem(PUBLIC_CACHE_KEY);
        if (cachedData && !forceRefresh) {
            try { return JSON.parse(cachedData); } catch (e) { localStorage.removeItem(PUBLIC_CACHE_KEY); }
        }
        try {
            const response = await fetch(PUBLIC_API_ENDPOINT);
            if (!response.ok) throw new Error('Failed to fetch library.');
            const books = await response.json();
            const groupedLibrary = { currentlyReading: [], read: [], watchlist: [] };
            books.forEach(book => {
                try { book.authors = JSON.parse(book.authors || '[]'); } catch (e) { book.authors = []; }
                try { book.imageLinks = JSON.parse(book.imageLinks || '{}'); } catch (e) { book.imageLinks = {}; }
                // MODIFIED: Parse tags
                try { book.tags = JSON.parse(book.tags || '[]'); } catch (e) { book.tags = []; }
                if (groupedLibrary[book.shelf]) groupedLibrary[book.shelf].push(book);
            });
            localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify(groupedLibrary));
            return groupedLibrary;
        } catch (error) {
            console.error(error);
            return null;
        }
    };

     const showToast = (message, type = 'success') => { // Added type parameter
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        if (!toast || !toastMessage) return;
        toastMessage.textContent = message;
        // Apply class based on type
        toast.className = `fixed bottom-5 right-5 text-white py-2 px-5 rounded-lg shadow-xl opacity-0 transition-opacity duration-300 z-50 ${type === 'success' ? 'bg-slate-900' : 'bg-red-600'}`;
        toast.classList.remove('opacity-0');
        setTimeout(() => toast.classList.add('opacity-0'), 3000);
    };

    if (document.getElementById('public-library')) {
        fetchAndDisplayRandomHighlight();

        const currentlyReadingContainer = document.getElementById('public-currentlyReading');
        const readContainer = document.getElementById('public-read');
        const watchlistContainer = document.getElementById('public-watchlist');
        const menuButton = document.getElementById('menu-button');
        const menu = document.getElementById('menu');
        const forceRefreshBtn = document.getElementById('force-refresh-btn');

        const createBookListItem = (book, shelf) => {
            const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/80x120/e2e8f0/475569?text=N/A`;
            const authors = book.authors ? book.authors.join(', ') : 'Unknown Author';

            // MODIFIED: Build meta info including tags
            let metaItems = [];
            if (book.readingMedium && book.readingMedium !== 'Not set') {
                metaItems.push(`<span class="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">${book.readingMedium}</span>`);
            }
            if (shelf === 'read' && book.finishedOn) {
                const finishedDate = new Date(book.finishedOn).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                metaItems.push(`<span class="text-xs text-gray-500">Finished: ${finishedDate}</span>`);
            }
            if (book.hasHighlights) {
                metaItems.push(`<a href="/details.html?id=${book.id}" class="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline">View Highlights</a>`);
            }

            // NEW: Add tags to meta info
            if (book.tags && book.tags.length > 0) {
                 book.tags.forEach(tagId => {
                     const tagInfo = allTagsMap.get(tagId);
                     if (tagInfo) {
                         const bgColor = `${tagInfo.color}20`; // Add alpha transparency
                         const textColor = tagInfo.color;
                         metaItems.push(`<span class="text-xs font-medium px-2 py-0.5 rounded-lg" style="background-color: ${bgColor}; color: ${textColor};">${tagInfo.name}</span>`);
                     }
                 });
            }

            const metaInfoHTML = metaItems.join(''); // Join all items

            return `
                <div class="book-list-item flex items-start p-4 space-x-4">
                    <img src="${coverUrl}" alt="Cover of ${book.title}" class="w-14 h-20 object-cover rounded-md shadow-sm flex-shrink-0">
                    <div class="flex-grow">
                        <a href="/details.html?id=${book.id}" class="font-semibold text-gray-800 hover:underline">${book.title}</a>
                        <p class="text-sm text-gray-500 mb-2">${authors}</p>
                        <div class="flex items-center flex-wrap gap-x-3 gap-y-1">
                            ${metaInfoHTML} {/* Inject combined meta info */}
                        </div>
                    </div>
                    <a href="/details.html?id=${book.id}" class="flex-shrink-0 pt-1">
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </a>
                </div>`;
        };

        const renderAllShelves = (lib) => {
            const renderShelf = (shelf, container, shelfName) => container.innerHTML = shelf.length > 0 ? shelf.map(book => createBookListItem(book, shelfName)).join('') : `<p class="p-8 text-center text-gray-500">Nothing here yet.</p>`;
            renderShelf(lib.currentlyReading, currentlyReadingContainer, 'currentlyReading');
            const sortedRead = [...lib.read].sort((a,b) => new Date(b.finishedOn) - new Date(a.finishedOn));
            renderShelf(sortedRead, readContainer, 'read');
            renderShelf(lib.watchlist, watchlistContainer, 'watchlist');
        }

        // MODIFIED: Fetch tags first, then library
        const initializePublicPage = async (forceRefresh = false) => {
             const tagsSuccess = await fetchAllTags(forceRefresh);
             if (!tagsSuccess) {
                 showToast('Could not load tag information.', 'error');
             }
             const lib = await getPublicLibrary(forceRefresh);
             if (lib) {
                 renderAllShelves(lib);
                 return true;
             } else {
                 [currentlyReadingContainer, readContainer, watchlistContainer].forEach(c => c.innerHTML = `<p class="p-8 text-center text-red-500">Could not load library.</p>`);
                 return false;
             }
        };

        initializePublicPage(); // Initial load

        menuButton.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('hidden'); });
        forceRefreshBtn.addEventListener('click', async () => {
            showToast('Refreshing from database...');
            const success = await initializePublicPage(true); // Force refresh both tags and library
            if (success) {
                showToast('Library updated!');
            } else {
                showToast('Failed to update library.', 'error');
            }
            menu.classList.add('hidden');
        });
        document.body.addEventListener('click', () => menu.classList.add('hidden'));
    }

    if (document.getElementById('public-details-content')) {
        const detailsContainer = document.getElementById('public-details-content');

        const renderDetails = (book) => {
            if (!book) {
                detailsContainer.innerHTML = `<a href="/" class="text-blue-500 mb-8 inline-block">&larr; Back to Library</a><p class="text-center text-gray-500">Book not found.</p>`;
                return;
            }
            try { book.authors = JSON.parse(book.authors || '[]'); } catch (e) { book.authors = Array.isArray(book.authors) ? book.authors : []; }
            try { book.imageLinks = JSON.parse(book.imageLinks || '{}'); } catch (e) { book.imageLinks = typeof book.imageLinks === 'object' ? book.imageLinks : {}; }
            try { book.highlights = JSON.parse(book.highlights || '[]'); } catch (e) { book.highlights = []; }
            const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/128x192/e2e8f0/475569?text=N/A`;
            const authors = book.authors.join(', ') || 'Unknown Author';
            let highlightsHTML = book.highlights?.length > 0 ? `<div class="space-y-4">${book.highlights.map(h => `<p class="highlight-item text-gray-700">${h}</p>`).join('')}</div>` : '<p class="text-gray-500">No highlights for this book.</p>';

            detailsContainer.innerHTML = `<a href="/" class="text-blue-500 mb-8 inline-block">&larr; Back to Library</a><div class="text-center mb-8"><img src="${coverUrl}" alt="Cover of ${book.title}" class="w-32 h-48 object-cover rounded-lg shadow-lg mx-auto mb-4"><h1 class="text-2xl font-bold tracking-tight text-gray-900">${book.title}</h1><p class="text-md text-gray-600 mt-1">${authors}</p></div><div class="bg-white rounded-xl border border-gray-200/75 p-6"><h2 class="text-lg font-semibold text-gray-900 mb-4">Highlights</h2>${highlightsHTML}</div>`;
        };

        const loadBookDetails = async () => {
            const bookId = new URLSearchParams(window.location.search).get('id');
            if (!bookId) {
                renderDetails(null);
                return;
            }
            try {
                const response = await fetch(`${DETAILS_API_ENDPOINT}?id=${bookId}`);
                if (!response.ok) throw new Error('Book not found.');
                const book = await response.json();
                renderDetails(book);
            } catch (error) {
                console.error(error);
                detailsContainer.innerHTML = `<a href="/" class="text-blue-500 mb-8 inline-block">&larr; Back to Library</a><p class="text-center text-red-500">Could not load book details.</p>`;
            }
        };

        loadBookDetails();
    }
});