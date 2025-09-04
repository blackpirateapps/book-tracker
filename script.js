document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const API_ENDPOINT = '/api/books';
    const CACHE_KEY = 'cloud-book-tracker-cache';
    const PWD_COOKIE = 'book-tracker-admin-pwd';
    
    // --- STATE MANAGEMENT ---
    let library = { watchlist: [], currentlyReading: [], read: [] };
    let tempHighlights = [];
    let afterPasswordCallback = null;

    // --- SHARED DOM ELEMENTS (present on both pages) ---
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // --- COOKIE HELPERS ---
    const setCookie = (name, value, days) => { let expires = ""; if (days) { const date = new Date(); date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000)); expires = "; expires=" + date.toUTCString(); } document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax; Secure"; };
    const getCookie = (name) => { const nameEQ = name + "="; const ca = document.cookie.split(';'); for (let i = 0; i < ca.length; i++) { let c = ca[i]; while (c.charAt(0) === ' ') c = c.substring(1, c.length); if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length); } return null; };

    // --- CORE & SHARED LOGIC ---
    const showToast = (message, type = 'success') => { toastMessage.textContent = message; toast.className = `fixed bottom-5 right-5 text-white py-2 px-5 rounded-lg shadow-xl transition-opacity duration-300 z-50 ${type === 'success' ? 'bg-slate-900' : 'bg-red-600'}`; toast.classList.remove('opacity-0'); setTimeout(() => toast.classList.add('opacity-0'), 3000);};
    const openModal = (modal) => { modal.classList.remove('hidden'); setTimeout(() => { modal.classList.remove('opacity-0'); modal.querySelector('.modal-content').classList.remove('scale-95'); }, 10);};
    const closeModal = (modal) => { modal.classList.add('opacity-0'); modal.querySelector('.modal-content').classList.add('scale-95'); setTimeout(() => modal.classList.add('hidden'), 300);};
    const groupBooksIntoLibrary = (books) => { const newLibrary = { watchlist: [], currentlyReading: [], read: [] }; books.forEach(book => { try { book.authors = JSON.parse(book.authors); } catch (e) { book.authors = []; } try { book.imageLinks = JSON.parse(book.imageLinks); } catch (e) { book.imageLinks = {}; } try { book.industryIdentifiers = JSON.parse(book.industryIdentifiers); } catch (e) { book.industryIdentifiers = []; } try { book.highlights = JSON.parse(book.highlights); } catch (e) { book.highlights = []; } if (newLibrary[book.shelf]) { newLibrary[book.shelf].push(book); }}); return newLibrary;};
    
    const fetchBooksFromServer = async () => {
        try {
            const response = await fetch(API_ENDPOINT);
            if (!response.ok) throw new Error('Network response was not ok');
            const books = await response.json();
            localStorage.setItem(CACHE_KEY, JSON.stringify(books));
            return groupBooksIntoLibrary(books);
        } catch (error) {
            console.error("Failed to fetch books:", error);
            showToast("Could not connect to the database.", "error");
            return null;
        }
    };

    const getLibrary = async (forceRefresh = false) => {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData && !forceRefresh) {
            library = groupBooksIntoLibrary(JSON.parse(cachedData));
            return library;
        }
        showToast("Fetching from database...", "success");
        library = await fetchBooksFromServer();
        if(library) showToast("Library updated from database!", "success");
        return library;
    };

    // --- AUTHENTICATION & API CALLS ---
    const performAuthenticatedAction = async (payload) => {
        let password = getCookie(PWD_COOKIE);
        const passwordModal = document.getElementById('password-modal');
        const passwordInput = document.getElementById('password-input');
        const rememberMeCheckbox = document.getElementById('remember-me');

        if (!password) {
            password = passwordInput.value;
             if (rememberMeCheckbox.checked) {
                setCookie(PWD_COOKIE, password, 30); // Save for 30 days
            }
        }
         if (!password) { showToast("Password cannot be empty.", "error"); return; }
         closeModal(passwordModal);
        
        try {
            const response = await fetch(API_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, password })});
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');
            showToast(result.message || 'Action successful!', 'success');
            await getLibrary(true); // Force refresh local cache
            
            // Re-render the current view after successful action
            if (document.getElementById('main-dashboard')) {
                renderAllShelves();
            } else if (document.getElementById('details-page-content')) {
                const params = new URLSearchParams(window.location.search);
                const bookId = params.get('id');
                const book = Object.values(library).flat().find(b => b.id === bookId);
                if (book) renderDetailsPage(book); else document.getElementById('details-page-content').innerHTML = `<p>Book not found or moved.</p><a href="/" class="text-indigo-600 hover:underline">&larr; Back to Library</a>`;
            }
        } catch (error) {
            console.error("Authenticated action failed:", error);
            showToast(error.message, "error");
        } finally {
            if (passwordInput) passwordInput.value = '';
            if (rememberMeCheckbox) rememberMeCheckbox.checked = false;
            afterPasswordCallback = null;
        }
    };
    
    const requestPassword = (callback) => {
        if (getCookie(PWD_COOKIE)) { // If cookie exists, bypass the modal
            callback();
            return;
        }
        const passwordModal = document.getElementById('password-modal');
        afterPasswordCallback = callback;
        openModal(passwordModal);
    };

    // --- PAGE-SPECIFIC INITIALIZATION ---

    // ===================================================================
    // --- MAIN PAGE (index.html) LOGIC ---
    // ===================================================================
    if (document.getElementById('main-dashboard')) {
        const searchForm = document.getElementById('search-form');
        const searchInput = document.getElementById('search-input');
        const searchSection = document.getElementById('search-section');
        const searchResultsContainer = document.getElementById('search-results');
        const searchMessage = document.getElementById('search-message');
        const clearSearchBtn = document.getElementById('clear-search-btn');
        const libraryBtn = document.getElementById('library-btn');
        const libraryModal = document.getElementById('library-modal');
        const shelfContainers = { watchlist: document.getElementById('shelf-watchlist'), currentlyReading: document.getElementById('shelf-currentlyReading'), read: document.getElementById('shelf-read') };
        const shelfMessages = { watchlist: document.getElementById('shelf-watchlist-message'), currentlyReading: document.getElementById('shelf-currentlyReading-message'), read: document.getElementById('shelf-read-message') };
        const homepageContainers = { currentlyReading: document.getElementById('homepage-currentlyReading'), recentReads: document.getElementById('homepage-recentReads') };
        const homepageMessages = { currentlyReading: document.getElementById('homepage-currentlyReading-message'), recentReads: document.getElementById('homepage-recentReads-message') };

        const createBookCardHTML = (book, shelf) => {
            const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/128x192/e2e8f0/475569?text=N/A`;
            const authors = book.authors ? book.authors.join(', ') : 'Unknown Author';
            return `<div class="book-card bg-white rounded-lg shadow-sm overflow-hidden flex flex-col p-3"> <img src="${coverUrl}" alt="Cover of ${book.title}" class="w-full h-48 object-contain rounded-md mb-3"> <div class="flex flex-col flex-grow"> <h3 class="font-bold text-sm leading-tight flex-grow">${book.title}</h3> <p class="text-xs text-slate-500 mt-1">${authors}</p> <div class="relative mt-2"> <button class="move-btn-toggle w-full text-sm bg-slate-200 text-slate-700 font-semibold py-2 px-3 rounded-md hover:bg-slate-300">Move to...</button> <div class="absolute bottom-full mb-1 w-full bg-white border rounded-md shadow-lg hidden z-10"> ${shelf !== 'currentlyReading' ? `<button class="w-full text-left text-sm px-3 py-2 hover:bg-slate-100" data-book-id="${book.id}" data-current-shelf="${shelf}" data-target-shelf="currentlyReading">Currently Reading</button>` : ''} ${shelf !== 'watchlist' ? `<button class="w-full text-left text-sm px-3 py-2 hover:bg-slate-100" data-book-id="${book.id}" data-current-shelf="${shelf}" data-target-shelf="watchlist">Watchlist</button>` : ''} ${shelf !== 'read' ? `<button class="w-full text-left text-sm px-3 py-2 hover:bg-slate-100" data-book-id="${book.id}" data-current-shelf="${shelf}" data-target-shelf="read">Read</button>` : ''} </div> </div> <a href="details.html?id=${book.id}&shelf=${shelf}" class="details-btn-link w-full text-center mt-2 text-sm bg-gray-500 text-white font-semibold py-2 px-3 rounded-md hover:bg-gray-600">Details</a> <button data-book-id="${book.id}" class="remove-btn w-full mt-2 text-sm bg-red-500 text-white font-semibold py-2 px-3 rounded-md hover:bg-red-600">Remove</button> </div> </div>`;
        };
        const createSearchResultItemHTML = (book) => {
            const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/128x192/e2e8f0/475569?text=N/A`;
            const authors = book.authors ? book.authors.join(', ') : 'Unknown Author';
             return `<div class="book-card bg-white rounded-lg shadow-sm overflow-hidden flex flex-col p-3 text-center">
                <img src="${coverUrl}" alt="Cover of ${book.title}" class="w-full h-48 object-contain rounded-md mb-3">
                <div class="flex flex-col flex-grow">
                    <h3 class="font-bold text-sm leading-tight flex-grow">${book.title}</h3>
                    <p class="text-xs text-slate-500 mt-1">${authors}</p>
                </div>
                <div class="flex gap-2 mt-3">
                    <button data-book-info='${JSON.stringify(book)}' data-target-shelf="currentlyReading" title="Add to Currently Reading" class="add-btn flex-1 text-sm bg-blue-600 text-white font-semibold py-2 px-2 rounded-md hover:bg-blue-700">Reading</button>
                    <button data-book-info='${JSON.stringify(book)}' data-target-shelf="read" title="Add to Read" class="add-btn flex-1 text-sm bg-green-600 text-white font-semibold py-2 px-2 rounded-md hover:bg-green-700">Finished</button>
                </div>
            </div>`;
        };

        const renderShelf = (shelfName) => { const container = shelfContainers[shelfName]; const message = shelfMessages[shelfName]; const books = library[shelfName]; container.innerHTML = ''; message.classList.toggle('hidden', books.length > 0); if (books.length > 0) books.forEach(book => container.innerHTML += createBookCardHTML(book, shelfName)); else message.textContent = `Your ${shelfName.replace(/([A-Z])/g, ' $1').toLowerCase()} is empty.`};
        const renderHomepageSummaries = () => { const crBooks = library.currentlyReading; homepageContainers.currentlyReading.innerHTML = ''; homepageMessages.currentlyReading.classList.toggle('hidden', crBooks.length > 0); if (crBooks.length > 0) crBooks.forEach(book => homepageContainers.currentlyReading.innerHTML += createBookCardHTML(book, 'currentlyReading')); else homepageMessages.currentlyReading.textContent = "You're not reading anything. Add a book to get started!"; const rrBooks = [...library.read].sort((a,b) => new Date(b.finishedOn) - new Date(a.finishedOn)).slice(0, 6); homepageContainers.recentReads.innerHTML = ''; homepageMessages.recentReads.classList.toggle('hidden', rrBooks.length > 0); if(rrBooks.length > 0) rrBooks.forEach(book => homepageContainers.recentReads.innerHTML += createBookCardHTML(book, 'read')); else homepageMessages.recentReads.textContent = "You haven't finished any books yet.";};
        const renderSearchResults = (books) => { searchResultsContainer.innerHTML = ''; const hasBooks = books && books.length > 0; searchMessage.classList.toggle('hidden', hasBooks); if (!hasBooks) searchMessage.textContent = 'No books found.'; else books.forEach(apiBook => { const book = { id: apiBook.id, title: apiBook.volumeInfo.title, authors: apiBook.volumeInfo.authors, imageLinks: apiBook.volumeInfo.imageLinks, pageCount: apiBook.volumeInfo.pageCount, publishedDate: apiBook.volumeInfo.publishedDate, industryIdentifiers: apiBook.volumeInfo.industryIdentifiers, highlights: [], startedOn: null, finishedOn: null, readingMedium: '' }; searchResultsContainer.innerHTML += createSearchResultItemHTML(book); });};
        const handleSearch = async (e) => { e.preventDefault(); const searchTerm = searchInput.value.trim(); if (!searchTerm) return; searchMessage.textContent = 'Searching...'; searchSection.classList.remove('hidden'); searchResultsContainer.innerHTML = ''; searchMessage.classList.remove('hidden'); try { const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchTerm)}&maxResults=18`); if (!response.ok) throw new Error('Network error'); renderSearchResults((await response.json()).items); } catch (error) { console.error('Fetch error:', error); searchMessage.textContent = 'Failed to fetch books.'; } };
        const handleAddBook = (bookData, targetShelf) => { const bookWithShelf = { ...bookData, shelf: targetShelf }; if (targetShelf === 'currentlyReading') bookWithShelf.startedOn = new Date().toISOString().split('T')[0]; if (targetShelf === 'read') bookWithShelf.finishedOn = new Date().toISOString().split('T')[0]; requestPassword(() => performAuthenticatedAction({ action: 'add', data: bookWithShelf })); };
        const handleRemoveBook = (bookId) => { requestPassword(() => performAuthenticatedAction({ action: 'delete', data: { id: bookId } })); };
        const handleMoveBook = (bookId, currentShelf, targetShelf) => { const bookToMove = { ...library[currentShelf].find(b => b.id === bookId) }; if (!bookToMove) return; bookToMove.shelf = targetShelf; if (targetShelf === 'currentlyReading' && !bookToMove.startedOn) bookToMove.startedOn = new Date().toISOString().split('T')[0]; if (targetShelf === 'read' && !bookToMove.finishedOn) { bookToMove.finishedOn = new Date().toISOString().split('T')[0]; if (!bookToMove.startedOn) bookToMove.startedOn = bookToMove.finishedOn; } requestPassword(() => performAuthenticatedAction({ action: 'update', data: bookToMove }));};
        const renderAllShelves = () => { Object.keys(shelfContainers).forEach(renderShelf); renderHomepageSummaries();};
        
        searchForm.addEventListener('submit', handleSearch);
        libraryBtn.addEventListener('click', () => openModal(libraryModal));
        clearSearchBtn.addEventListener('click', () => { searchSection.classList.add('hidden'); searchInput.value = ''; });
        document.body.addEventListener('click', (e) => {
            const target = e.target;
            const closest = (selector) => target.closest(selector);
            const addBtn = closest('.add-btn');
            if (addBtn) handleAddBook(JSON.parse(addBtn.dataset.bookInfo), addBtn.dataset.targetShelf);
            if (closest('.remove-btn')) handleRemoveBook(closest('.remove-btn').dataset.bookId);
            if (target.dataset.targetShelf) handleMoveBook(target.dataset.bookId, target.dataset.currentShelf, target.dataset.targetShelf);
            if (closest('.move-btn-toggle')) closest('.move-btn-toggle').nextElementSibling.classList.toggle('hidden');
        });

        // Initialize main page
        getLibrary().then(lib => { if (lib) renderAllShelves(); });
    }

    // ===================================================================
    // --- DETAILS PAGE (details.html) LOGIC ---
    // ===================================================================
    if (document.getElementById('details-page-content')) {
        const detailsContainer = document.getElementById('details-page-content');
        
        const renderDetailsPage = (book) => {
            if (!book) { detailsContainer.innerHTML = `<p class="text-center">Book not found.</p> <a href="/" class="block text-center mt-4 text-indigo-600 hover:underline">&larr; Back to Library</a>`; return; }
            const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/128x192/e2e8f0/475569?text=N/A`;
            const authors = book.authors ? book.authors.join(', ') : 'Unknown Author';
            const pageCount = book.pageCount ? `${book.pageCount} pages` : 'N/A';
            const publishedDate = book.publishedDate ? new Date(book.publishedDate).getFullYear() : 'N/A';
            const isbn = book.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier || book.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier || 'N/A';
            const goodreadsLink = `https://www.goodreads.com/search?q=${encodeURIComponent(book.title + ' ' + (book.authors ? book.authors[0] : ''))}`;
            detailsContainer.innerHTML = `
                <div class="mb-6"><a href="/" class="text-indigo-600 hover:underline">&larr; Back to Library</a></div>
                <div class="bg-white p-6 rounded-xl shadow-md">
                    <h2 class="text-3xl font-bold mb-2">${book.title}</h2>
                    <p class="text-slate-600 mb-6 text-xl">by ${authors}</p>
                    <div class="flex flex-col md:flex-row gap-8">
                        <div class="w-40 flex-shrink-0 text-center"><img src="${coverUrl}" alt="Cover" class="w-40 h-60 object-contain rounded-md shadow-md mx-auto"></div>
                        <div class="flex-1">
                            <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-700 mb-6 p-4 bg-slate-50 rounded-md border">
                                <div><strong>Published:</strong> ${publishedDate}</div>
                                <div><strong>Pages:</strong> ${pageCount}</div>
                                <div><strong>ISBN:</strong> ${isbn}</div>
                                <div><a href="${goodreadsLink}" target="_blank" class="text-indigo-600 hover:underline font-semibold">Find on Goodreads</a></div>
                            </div>
                            <div id="reading-log-container" data-book-id="${book.id}" data-shelf="${book.shelf}"></div>
                            <div class="mt-6"><h4 class="text-lg font-semibold">Highlights</h4><div id="highlights-container" class="mt-2"></div></div>
                        </div>
                    </div>
                </div>`;
            renderReadingLogView(book.id, book.shelf);
            renderHighlights(book.id, book.shelf);
        };

        const renderReadingLogView = (bookId, shelf) => { const container = document.getElementById('reading-log-container'); const book = library[shelf]?.find(b => b.id === bookId); if (!container || !book) return; let durationHTML = ''; if (shelf === 'read' && book.startedOn && book.finishedOn) { const start = new Date(book.startedOn); const end = new Date(book.finishedOn); const diffTime = Math.abs(end - start); const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24))); durationHTML = `<div class="flex justify-between items-center"><span class="font-semibold">Time to Finish:</span><span>${diffDays} day${diffDays !== 1 ? 's' : ''}</span></div>`; } container.innerHTML = `<div class="flex justify-between items-center"><h4 class="text-lg font-semibold">Reading Log</h4><button id="edit-log-btn" class="text-sm text-indigo-600 hover:underline font-semibold">Edit</button></div><div class="space-y-2 mt-2 text-sm text-slate-700 p-3 bg-slate-50 rounded-md border"><div class="flex justify-between items-center"><span class="font-semibold">Medium:</span><span>${book.readingMedium || 'Not set'}</span></div><div class="flex justify-between items-center"><span class="font-semibold">Started On:</span><span>${book.startedOn || 'Not set'}</span></div>${shelf === 'read' ? `<div class="flex justify-between items-center"><span class="font-semibold">Finished On:</span><span>${book.finishedOn || 'Not set'}</span></div>${durationHTML}` : ''}</div>`;};
        const renderReadingLogEdit = (bookId, shelf) => { const container = document.getElementById('reading-log-container'); const book = library[shelf]?.find(b => b.id === bookId); if (!container || !book) return; const mediums = ["Paperback", "Kindle Paperwhite", "Mobile", "Tablet"]; const mediumOptions = mediums.map(m => `<option value="${m}" ${book.readingMedium === m ? 'selected' : ''}>${m}</option>`).join(''); container.innerHTML = `<h4 class="text-lg font-semibold">Reading Log</h4><div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 text-sm text-slate-700 p-3 bg-slate-50 rounded-md border"><div><label for="reading-medium" class="font-semibold block mb-1">Medium</label><select id="reading-medium" data-book-id="${bookId}" data-shelf="${shelf}" class="w-full p-2 border rounded-md bg-white"><option value="">Not set</option>${mediumOptions}</select></div><div><label for="started-on" class="font-semibold block mb-1">Started On</label><input type="date" id="started-on" data-book-id="${bookId}" data-shelf="${shelf}" value="${book.startedOn || ''}" class="w-full p-2 border rounded-md bg-white"></div>${shelf === 'read' ? `<div><label for="finished-on" class="font-semibold block mb-1">Finished On</label><input type="date" id="finished-on" data-book-id="${bookId}" data-shelf="${shelf}" value="${book.finishedOn || ''}" class="w-full p-2 border rounded-md bg-white"></div>` : ''}</div>`;};
        const renderHighlights = (bookId, shelf) => { const container = document.getElementById('highlights-container'); const book = library[shelf]?.find(b => b.id === bookId); if (!container || !book) return; if (book.highlights && book.highlights.length > 0) { container.innerHTML = '<ul class="list-disc list-inside space-y-2 text-slate-600">' + book.highlights.map(h => `<li class="border-l-4 border-amber-300 pl-3">${h}</li>`).join('') + '</ul>'; } else { container.innerHTML = '<p class="text-slate-500">No highlights imported for this book.</p>'; }};
        const handleUpdateBookDetails = (book) => { requestPassword(() => performAuthenticatedAction({ action: 'update', data: book }));};

        detailsContainer.addEventListener('change', (e) => {
            const target = e.target;
            if (target.matches('#reading-medium, #started-on, #finished-on')) {
                const { bookId, shelf } = target.dataset;
                const book = { ...library[shelf]?.find(b => b.id === bookId) };
                if (book) {
                    if (target.id === 'reading-medium') book.readingMedium = target.value;
                    if (target.id === 'started-on') book.startedOn = target.value;
                    if (target.id === 'finished-on') book.finishedOn = target.value;
                    handleUpdateBookDetails(book);
                }
            }
        });
        detailsContainer.addEventListener('click', (e) => {
            if (e.target.id === 'edit-log-btn') {
                const container = e.target.closest('#reading-log-container');
                const { bookId, shelf } = container.dataset;
                renderReadingLogEdit(bookId, shelf);
            }
        });

        // Initialize details page
        getLibrary().then(lib => {
            if (lib) {
                const params = new URLSearchParams(window.location.search);
                const bookId = params.get('id');
                const book = Object.values(lib).flat().find(b => b.id === bookId);
                renderDetailsPage(book);
            }
        });
    }

    // --- SHARED EVENT LISTENERS (Modals, Data Management) ---
    const passwordModal = document.getElementById('password-modal');
    if (passwordModal) {
        passwordModal.querySelector('#password-submit-btn').addEventListener('click', () => { if (afterPasswordCallback) afterPasswordCallback(); });
        passwordModal.querySelector('#password-cancel-btn').addEventListener('click', () => closeModal(passwordModal));
    }
    document.body.addEventListener('click', (e) => {
        const target = e.target;
        const closest = (selector) => target.closest(selector);
        const modalToClose = closest('.modal-backdrop');
        if (target.classList.contains('close-modal-btn') && modalToClose) closeModal(modalToClose);
        if (target.classList.contains('close-highlight-modal-btn')) closeModal(document.getElementById('highlight-import-modal'));
        if (target.matches('.modal-backdrop:not(#password-modal)')) closeModal(target);
    });

    const forceRefreshBtn = document.getElementById('force-refresh-btn');
    if (forceRefreshBtn) {
        forceRefreshBtn.addEventListener('click', () => {
            localStorage.removeItem(CACHE_KEY);
            getLibrary(true).then(lib => {
                if(lib && document.getElementById('main-dashboard')) renderAllShelves();
            });
            closeModal(document.getElementById('library-modal'));
        });
    }
    // ... other data management event listeners can be added here if needed
});
