document.addEventListener('DOMContentLoaded', () => {
    const API_ENDPOINT = '/api/public';
    let library = null;

    const getPublicLibrary = async () => {
        if (library) return library;
        try {
            const response = await fetch(API_ENDPOINT);
            if (!response.ok) throw new Error('Failed to fetch library.');
            const books = await response.json();
            const groupedLibrary = { currentlyReading: [], read: [], watchlist: [] };
            books.forEach(book => {
                try { book.authors = JSON.parse(book.authors); } catch (e) { book.authors = []; }
                try { book.imageLinks = JSON.parse(book.imageLinks); } catch (e) { book.imageLinks = {}; }
                try { book.highlights = JSON.parse(book.highlights); } catch (e) { book.highlights = []; }
                if (groupedLibrary[book.shelf]) groupedLibrary[book.shelf].push(book);
            });
            library = groupedLibrary;
            return library;
        } catch (error) {
            console.error(error);
            return null;
        }
    };

    // --- Main Page Logic ---
    if (document.getElementById('public-library')) {
        const currentlyReadingContainer = document.getElementById('public-currentlyReading');
        const readContainer = document.getElementById('public-read');

        const createBookListItem = (book) => {
            const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/80x120/e2e8f0/475569?text=N/A`;
            const authors = book.authors ? book.authors.join(', ') : 'Unknown Author';
            return `
                <a href="public-details.html?id=${book.id}" class="book-list-item flex items-center p-4 space-x-4 hover:bg-gray-50 transition-colors">
                    <img src="${coverUrl}" alt="Cover of ${book.title}" class="w-14 h-20 object-cover rounded-md shadow-sm flex-shrink-0">
                    <div class="flex-grow">
                        <p class="font-semibold text-gray-800">${book.title}</p>
                        <p class="text-sm text-gray-500">${authors}</p>
                    </div>
                    <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </a>
            `;
        };
        
        const renderShelf = (shelf, container) => {
            if (shelf.length > 0) {
                container.innerHTML = shelf.map(createBookListItem).join('');
            } else {
                container.innerHTML = `<p class="p-8 text-center text-gray-500">Nothing here yet.</p>`;
            }
        };

        getPublicLibrary().then(lib => {
            if (lib) {
                renderShelf(lib.currentlyReading, currentlyReadingContainer);
                const sortedRead = [...lib.read].sort((a,b) => new Date(b.finishedOn) - new Date(a.finishedOn));
                renderShelf(sortedRead, readContainer);
            } else {
                 currentlyReadingContainer.innerHTML = `<p class="p-8 text-center text-red-500">Could not load library.</p>`;
                 readContainer.innerHTML = `<p class="p-8 text-center text-red-500">Could not load library.</p>`;
            }
        });
    }

    // --- Details Page Logic ---
    if (document.getElementById('public-details-content')) {
        const detailsContainer = document.getElementById('public-details-content');
        
        const renderDetails = (book) => {
            if (!book) {
                detailsContainer.innerHTML = `<a href="public.html" class="text-blue-500 mb-8 inline-block">&larr; Back to Library</a><p class="text-center text-gray-500">Book not found.</p>`;
                return;
            }
            const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/128x192/e2e8f0/475569?text=N/A`;
            const authors = book.authors ? book.authors.join(', ') : 'Unknown Author';
            
            let highlightsHTML = '<p class="text-gray-500">No highlights for this book.</p>';
            if (book.highlights && book.highlights.length > 0) {
                highlightsHTML = `<div class="space-y-4">${book.highlights.map(h => `<p class="highlight-item text-gray-700">${h}</p>`).join('')}</div>`;
            }

            detailsContainer.innerHTML = `
                <a href="public.html" class="text-blue-500 mb-8 inline-block">&larr; Back to Library</a>
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

        getPublicLibrary().then(lib => {
            if (lib) {
                const params = new URLSearchParams(window.location.search);
                const bookId = params.get('id');
                const book = Object.values(lib).flat().find(b => b.id === bookId);
                renderDetails(book);
            } else {
                detailsContainer.innerHTML = `<a href="public.html" class="text-blue-500 mb-8 inline-block">&larr; Back to Library</a><p class="text-center text-red-500">Could not load book details.</p>`;
            }
        });
    }
});
