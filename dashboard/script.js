document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const API_ENDPOINT = '/api/books';
    const CACHE_KEY = 'cloud-book-tracker-cache';
    const PWD_COOKIE = 'book-tracker-admin-pwd';
    
    // --- STATE MANAGEMENT ---
    let library = { watchlist: [], currentlyReading: [], read: [] };
    let tempHighlights = [];
    let afterPasswordCallback = null;

    // --- SHARED DOM ELEMENTS & HELPERS ---
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    const setCookie = (name, value, days) => { let expires = ""; if (days) { const date = new Date(); date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000)); expires = "; expires=" + date.toUTCString(); } document.cookie = name + "=" + (value || "") + expires + "; path=/dashboard; SameSite=Lax; Secure"; };
    const getCookie = (name) => { const nameEQ = name + "="; const ca = document.cookie.split(';'); for (let i = 0; i < ca.length; i++) { let c = ca[i]; while (c.charAt(0) === ' ') c = c.substring(1, c.length); if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length); } return null; };
    const showToast = (message, type = 'success') => { if(!toast || !toastMessage) return; toastMessage.textContent = message; toast.className = `fixed bottom-5 right-5 text-white py-2 px-5 rounded-lg shadow-xl transition-opacity duration-300 z-50 ${type === 'success' ? 'bg-slate-900' : 'bg-red-600'}`; toast.classList.remove('opacity-0'); setTimeout(() => toast.classList.add('opacity-0'), 3000);};
    const openModal = (modal) => { modal.classList.remove('hidden'); setTimeout(() => { modal.classList.remove('opacity-0'); modal.querySelector('.modal-content').classList.remove('scale-95', 'opacity-0'); }, 10);};
    const closeModal = (modal) => { modal.classList.add('opacity-0'); modal.querySelector('.modal-content').classList.add('scale-95', 'opacity-0'); setTimeout(() => modal.classList.add('hidden'), 300);};
    const groupBooksIntoLibrary = (books) => { const newLibrary = { watchlist: [], currentlyReading: [], read: [] }; books.forEach(book => { try { book.authors = JSON.parse(book.authors); } catch (e) { book.authors = []; } try { book.imageLinks = JSON.parse(book.imageLinks); } catch (e) { book.imageLinks = {}; } try { book.industryIdentifiers = JSON.parse(book.industryIdentifiers); } catch (e) { book.industryIdentifiers = []; } try { book.highlights = JSON.parse(book.highlights); } catch (e) { book.highlights = []; } if (newLibrary[book.shelf]) { newLibrary[book.shelf].push(book); }}); return newLibrary;};
    
    const fetchBooksFromServer = async () => {
        try {
            const response = await fetch(API_ENDPOINT);
            if (!response.ok) throw new Error('Network response was not ok');
            const books = await response.json();
            localStorage.setItem(CACHE_KEY, JSON.stringify(books));
            return groupBooksIntoLibrary(books);
        } catch (error) { console.error("Failed to fetch books:", error); showToast("Could not connect to the database.", "error"); return null; }
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

    const performAuthenticatedAction = async (payload) => {
        let password = getCookie(PWD_COOKIE);
        const passwordModal = document.getElementById('password-modal');
        const passwordInput = document.getElementById('password-input');
        const rememberMeCheckbox = document.getElementById('remember-me');

        if (!password) {
            password = passwordInput.value;
            if (rememberMeCheckbox.checked) {
                setCookie(PWD_COOKIE, password, 30);
                manageViewOnlyBanner(); // Hide banner immediately
            }
        }
        if (!password) { showToast("Password cannot be empty.", "error"); return {success: false}; }
        if (passwordModal) closeModal(passwordModal);
        
        try {
            const response = await fetch(API_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, password })});
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');
            if (payload.action !== 'export') {
                 showToast(result.message || 'Action successful!', 'success');
            }
            return {success: true, data: result};
        } catch (error) {
            console.error("Authenticated action failed:", error);
            showToast(error.message, "error");
            setCookie(PWD_COOKIE, '', -1); // Clear invalid cookie
            manageViewOnlyBanner(); // Show banner again
            return {success: false};
        } finally {
            if (passwordInput) passwordInput.value = '';
            if (rememberMeCheckbox) rememberMeCheckbox.checked = false;
            afterPasswordCallback = null;
        }
    };
    
    const requestPassword = (callback) => {
        if (getCookie(PWD_COOKIE)) { callback(); return; }
        const passwordModal = document.getElementById('password-modal');
        if (passwordModal) {
            afterPasswordCallback = callback;
            openModal(passwordModal);
        } else {
            showToast("Could not open password prompt.", "error");
        }
    };

    const manageViewOnlyBanner = () => {
        const banner = document.getElementById('view-only-banner');
        if (!banner) return;
        if (getCookie(PWD_COOKIE)) {
            banner.classList.add('hidden');
        } else {
            banner.classList.remove('hidden');
        }
    };
    
    const createBookListItemHTML = (book, shelf) => {
        const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/80x120/e2e8f0/475569?text=N/A`;
        const authors = book.authors ? book.authors.join(', ') : 'Unknown Author';
        // The main part of the item is now a link, wrapping the image and text
        return `
            <div class="book-list-item flex items-center p-4 space-x-4 relative group">
                <a href="/dashboard/details.html?id=${book.id}" class="flex items-center space-x-4 flex-grow min-w-0">
                    <img src="${coverUrl}" alt="Cover of ${book.title}" class="w-12 h-16 object-cover rounded-md shadow-sm flex-shrink-0">
                    <div class="flex-grow min-w-0">
                        <p class="font-semibold text-gray-800 truncate group-hover:underline">${book.title}</p>
                        <p class="text-sm text-gray-500 truncate">${authors}</p>
                    </div>
                </a>
                <div class="flex-shrink-0">
                     <button class="options-btn-toggle p-2 rounded-full hover:bg-gray-200">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                     </button>
                     <div class="absolute right-4 top-14 mt-2 w-48 bg-white rounded-xl shadow-lg border text-sm z-10 hidden">
                        <p class="px-4 pt-2 pb-1 text-xs text-gray-400 font-semibold">Move to</p>
                        ${shelf !== 'currentlyReading' ? `<button class="w-full text-left px-4 py-2 hover:bg-gray-100" data-book-id="${book.id}" data-current-shelf="${shelf}" data-target-shelf="currentlyReading">Currently Reading</button>` : ''}
                        ${shelf !== 'watchlist' ? `<button class="w-full text-left px-4 py-2 hover:bg-gray-100" data-book-id="${book.id}" data-current-shelf="${shelf}" data-target-shelf="watchlist">Watchlist</button>` : ''}
                        ${shelf !== 'read' ? `<button class="w-full text-left px-4 py-2 hover:bg-gray-100" data-book-id="${book.id}" data-current-shelf="${shelf}" data-target-shelf="read">Read</button>` : ''}
                        <div class="border-t my-1"></div>
                        <button data-book-id="${book.id}" class="remove-btn w-full text-left px-4 py-2 text-red-600 hover:bg-red-50">Remove Book</button>
                    </div>
                </div>
            </div>`;
    };
    
    // --- MAIN DASHBOARD PAGE LOGIC ---
    if (document.getElementById('main-dashboard')) {
        const searchForm = document.getElementById('search-form');
        const searchInput = document.getElementById('search-input');
        const searchSection = document.getElementById('search-section');
        const searchResultsContainer = document.getElementById('search-results');
        const searchMessage = document.getElementById('search-message');
        const clearSearchBtn = document.getElementById('clear-search-btn');
        const homepageContainers = { currentlyReading: document.getElementById('homepage-currentlyReading'), recentReads: document.getElementById('homepage-recentReads') };
        const homepageMessages = { currentlyReading: document.getElementById('homepage-currentlyReading-message'), recentReads: document.getElementById('homepage-recentReads-message') };
        
        const renderHomepageSummaries = () => { 
            const crBooks = library.currentlyReading; homepageContainers.currentlyReading.innerHTML = ''; 
            homepageMessages.currentlyReading.classList.toggle('hidden', crBooks.length > 0); 
            if (crBooks.length > 0) crBooks.forEach(book => homepageContainers.currentlyReading.innerHTML += createBookListItemHTML(book, 'currentlyReading')); 
            else homepageMessages.currentlyReading.textContent = "You're not reading anything."; 
            
            const rrBooks = [...library.read].sort((a,b) => new Date(b.finishedOn) - new Date(a.finishedOn)).slice(0, 4); 
            homepageContainers.recentReads.innerHTML = ''; 
            homepageMessages.recentReads.classList.toggle('hidden', rrBooks.length > 0); 
            if(rrBooks.length > 0) rrBooks.forEach(book => homepageContainers.recentReads.innerHTML += createBookListItemHTML(book, 'read')); 
            else homepageMessages.recentReads.textContent = "You haven't finished any books yet.";
        };

        const createSearchResultItemHTML = (book) => {
            const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/80x120/e2e8f0/475569?text=N/A`;
            const authors = book.authors ? book.authors.join(', ') : 'Unknown Author';
            return `
                <div class="book-list-item flex items-center p-4 space-x-4">
                     <img src="${coverUrl}" alt="Cover of ${book.title}" class="w-12 h-16 object-cover rounded-md shadow-sm flex-shrink-0">
                    <div class="flex-grow min-w-0">
                        <p class="font-semibold text-gray-800 truncate">${book.title}</p>
                        <p class="text-sm text-gray-500 truncate">${authors}</p>
                    </div>
                    <div class="flex-shrink-0 flex gap-2">
                        <button data-book-info='${JSON.stringify(book)}' data-target-shelf="currentlyReading" title="Add to Currently Reading" class="add-btn text-sm bg-blue-100 text-blue-700 font-semibold py-1.5 px-3 rounded-lg hover:bg-blue-200">Reading</button>
                        <button data-book-info='${JSON.stringify(book)}' data-target-shelf="watchlist" title="Add to Watchlist" class="add-btn text-sm bg-gray-100 text-gray-700 font-semibold py-1.5 px-3 rounded-lg hover:bg-gray-200">Watch</button>
                    </div>
                </div>`;
        };

        const renderSearchResults = (books) => { 
            searchResultsContainer.innerHTML = ''; 
            const hasBooks = books && books.length > 0; 
            searchMessage.classList.toggle('hidden', hasBooks); 
            if (!hasBooks) searchMessage.textContent = 'No books found.'; 
            else books.forEach(apiBook => searchResultsContainer.innerHTML += createSearchResultItemHTML(apiBook));
        };

        const handleSearch = async (e) => {
            e.preventDefault(); const searchTerm = searchInput.value.trim(); if (!searchTerm) return;
            searchMessage.textContent = 'Searching...'; searchSection.classList.remove('hidden'); searchResultsContainer.innerHTML = ''; searchMessage.classList.remove('hidden');
            try {
                const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(searchTerm)}&limit=10`); if (!response.ok) throw new Error('Network error');
                const data = await response.json();
                const formattedBooks = data.docs.map(doc => ({ id: doc.key.replace('/works/', ''), title: doc.title, authors: doc.author_name || [], imageLinks: doc.cover_i ? { thumbnail: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` } : {}, pageCount: doc.number_of_pages_median || null, publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : null, industryIdentifiers: doc.isbn ? [{ type: 'ISBN_13', identifier: doc.isbn[0] }] : [], highlights: [], startedOn: null, finishedOn: null, readingMedium: '' }));
                renderSearchResults(formattedBooks);
            } catch (error) { console.error('Fetch error:', error); searchMessage.textContent = 'Failed to fetch books.'; }
        };

        searchForm.addEventListener('submit', handleSearch);
        clearSearchBtn.addEventListener('click', () => { searchSection.classList.add('hidden'); searchInput.value = ''; });
        
        getLibrary().then(lib => { if (lib) renderHomepageSummaries(); });
    }

    // --- LIBRARY PAGE LOGIC ---
    if (document.getElementById('library-page-content')) {
        const shelfContainers = { watchlist: document.getElementById('shelf-watchlist'), currentlyReading: document.getElementById('shelf-currentlyReading'), read: document.getElementById('shelf-read') };
        const shelfMessages = { watchlist: document.getElementById('shelf-watchlist-message'), currentlyReading: document.getElementById('shelf-currentlyReading-message'), read: document.getElementById('shelf-read-message') };

        const renderShelf = (shelfName) => { 
            const container = shelfContainers[shelfName];
            const messageEl = shelfMessages[shelfName];
            const books = library[shelfName]; 
            container.innerHTML = ''; 
            messageEl.classList.toggle('hidden', books.length > 0); 
            if (books.length > 0) {
                const sortedBooks = shelfName === 'read' ? [...books].sort((a,b) => new Date(b.finishedOn) - new Date(a.finishedOn)) : books;
                sortedBooks.forEach(book => container.innerHTML += createBookListItemHTML(book, shelfName));
            } else {
                messageEl.textContent = `This shelf is empty.`;
            }
        };

        const renderAllLibraryShelves = () => Object.keys(shelfContainers).forEach(renderShelf);
        
        const importHighlightsBtn = document.getElementById('import-highlights-btn');
        const highlightsFileInput = document.getElementById('highlights-file-input');
        const highlightImportModal = document.getElementById('highlight-import-modal');
        const highlightBookTitle = document.getElementById('highlight-book-title');
        const highlightBookSelect = document.getElementById('highlight-book-select');
        const confirmImportBtn = document.getElementById('confirm-import-btn');
        const exportDataBtn = document.getElementById('export-data-btn');
        const importDataBtn = document.getElementById('import-data-btn');
        const importFileInput = document.getElementById('import-file-input');
        const parseMDHighlights = (mdContent) => { const highlights = []; let title = 'Unknown Title'; const frontmatterMatch = mdContent.match(/---\s*title:\s*"(.*?)"\s*---/); if (frontmatterMatch && frontmatterMatch[1]) title = frontmatterMatch[1]; const lines = mdContent.split('\n'); for (const line of lines) { if (line.trim().startsWith('- ')) { const highlightText = line.trim().substring(2).replace(/\s*\(location.*?\)\s*$/, '').trim(); if (highlightText) highlights.push(highlightText); } } return { title, highlights }; };
        const parseHTMLHighlights = (htmlContent) => { const doc = new DOMParser().parseFromString(htmlContent, 'text/html'); const title = doc.querySelector('.bookTitle')?.textContent.trim() || 'Unknown Title'; const highlights = Array.from(doc.querySelectorAll('.noteText')).map(el => el.textContent.trim()); return { title, highlights }; };

        importHighlightsBtn.addEventListener('click', () => requestPassword(() => highlightsFileInput.click()));
        highlightsFileInput.addEventListener('change', (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { let parsed; if (file.name.endsWith('.md')) parsed = parseMDHighlights(event.target.result); else if (file.name.endsWith('.html')) parsed = parseHTMLHighlights(event.target.result); else { showToast('Unsupported file type. Please use .html or .md', 'error'); return; } if (parsed.highlights.length === 0) { showToast('No highlights found in the file.', 'error'); return; } tempHighlights = parsed.highlights; highlightBookTitle.textContent = parsed.title || 'Unknown Title'; highlightBookSelect.innerHTML = '<option value="">Select a book...</option>'; Object.values(library).flat().forEach(book => { const option = document.createElement('option'); option.value = `${book.shelf}:${book.id}`; option.textContent = book.title; highlightBookSelect.appendChild(option); }); openModal(highlightImportModal); }; reader.readAsText(file); e.target.value = null; });
        confirmImportBtn.addEventListener('click', () => { const selected = highlightBookSelect.value; if (!selected) return showToast('Please select a book.', 'error'); const [shelf, bookId] = selected.split(':'); const book = library[shelf]?.find(b => b.id === bookId); if (!book) return showToast('Could not find selected book.', 'error'); book.highlights = [...(book.highlights || []), ...tempHighlights]; requestPassword(async () => { const {success} = await performAuthenticatedAction({ action: 'update', data: book }); if (success) { tempHighlights = []; closeModal(highlightImportModal); await getLibrary(true); renderAllLibraryShelves(); }}); });
        exportDataBtn.addEventListener('click', () => { requestPassword(async () => { const {success, data} = await performAuthenticatedAction({ action: 'export' }); if (success) { const booksToExport = groupBooksIntoLibrary(data); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([JSON.stringify(booksToExport, null, 2)], { type: 'application/json' })); link.download = `book-tracker-backup-${new Date().toISOString().split('T')[0]}.json`; link.click(); URL.revokeObjectURL(link.href); showToast('Data exported successfully!'); }}); });
        importDataBtn.addEventListener('click', () => requestPassword(() => importFileInput.click()));
        importFileInput.addEventListener('change', (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { try { const importedLibrary = JSON.parse(event.target.result); if (!('watchlist' in importedLibrary && 'currentlyReading' in importedLibrary && 'read' in importedLibrary)) throw new Error('Invalid backup file format.'); const allBooks = Object.values(importedLibrary).flat(); if(allBooks.length === 0) return showToast('Backup file is empty.', 'error'); requestPassword(async () => { showToast(`Importing ${allBooks.length} books...`, 'success'); for (const book of allBooks) { await performAuthenticatedAction({ action: 'add', data: book }); } showToast('Import complete!', 'success'); await getLibrary(true); renderAllLibraryShelves(); }); } catch (error) { showToast('Failed to import data. Invalid file.', 'error'); }}; reader.readAsText(file); e.target.value = null; });
        
        getLibrary().then(lib => { if (lib) renderAllLibraryShelves(); });
    }

    // --- DETAILS PAGE LOGIC ---
    if (document.getElementById('details-page-content')) {
        const detailsContainer = document.getElementById('details-page-content');
        
        const renderDetailsPage = (book) => { if (!book) { detailsContainer.innerHTML = `<a href="/dashboard/" class="text-blue-500 mb-8 inline-block">&larr; Back to Dashboard</a><p class="text-center">Book not found.</p>`; return; } const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/128x192/e2e8f0/475569?text=N/A`; const authors = book.authors ? book.authors.join(', ') : 'Unknown Author'; const pageCount = book.pageCount ? `${book.pageCount} pages` : 'N/A'; const publishedDate = book.publishedDate ? book.publishedDate : 'N/A'; const isbn = book.industryIdentifiers?.find(id => id.type === 'ISBN_13' || id.type === 'ISBN_10')?.identifier || 'N/A'; const goodreadsLink = `https://www.goodreads.com/search?q=${encodeURIComponent(book.title + ' ' + (book.authors ? book.authors[0] : ''))}`; detailsContainer.innerHTML = `<a href="/dashboard/" class="text-blue-500 mb-8 inline-block">&larr; Back to Dashboard</a><div class="text-center mb-8"><img src="${coverUrl}" alt="Cover" class="w-32 h-48 object-cover rounded-lg shadow-lg mx-auto mb-4"><h1 class="text-2xl font-bold tracking-tight text-gray-900">${book.title}</h1><p class="text-md text-gray-600 mt-1">${authors}</p></div><div class="space-y-8"><section id="reading-log-container" data-book-id="${book.id}" data-shelf="${book.shelf}"></section><section><div class="bg-white rounded-xl border p-6"><h2 class="text-lg font-semibold text-gray-900 mb-4">Metadata</h2><div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-700"><div><strong>Published:</strong> ${publishedDate}</div><div><strong>Pages:</strong> ${pageCount}</div><div><strong>ISBN:</strong> ${isbn}</div><div><a href="${goodreadsLink}" target="_blank" class="text-blue-600 hover:underline font-semibold">Find on Goodreads</a></div></div></div></section><section><div class="bg-white rounded-xl border p-6"><h2 class="text-lg font-semibold text-gray-900 mb-4">Highlights</h2><div id="highlights-container"></div></div></section></div>`; renderReadingLogView(book.id, book.shelf); renderHighlights(book.id, book.shelf);};
        const renderReadingLogView = (bookId, shelf) => { const container = document.getElementById('reading-log-container'); const book = library[shelf]?.find(b => b.id === bookId); if (!container || !book) return; let durationHTML = ''; if (shelf === 'read' && book.startedOn && book.finishedOn) { const diffDays = Math.max(1, Math.ceil(Math.abs(new Date(book.finishedOn) - new Date(book.startedOn)) / (1000 * 60 * 60 * 24))); durationHTML = `<div class="flex justify-between items-center"><span class="font-semibold text-gray-600">Time to Finish:</span><span>${diffDays} day${diffDays !== 1 ? 's' : ''}</span></div>`; } container.innerHTML = `<div class="bg-white rounded-xl border p-6"><div class="flex justify-between items-center mb-4"><h2 class="text-lg font-semibold text-gray-900">Reading Log</h2><button id="edit-log-btn" class="text-sm font-semibold text-blue-600 hover:underline">Edit</button></div><div class="space-y-2 text-sm"><div class="flex justify-between items-center"><span class="font-semibold text-gray-600">Medium:</span><span>${book.readingMedium || 'Not set'}</span></div><div class="flex justify-between items-center"><span class="font-semibold text-gray-600">Started On:</span><span>${book.startedOn || 'Not set'}</span></div>${shelf === 'read' ? `<div class="flex justify-between items-center"><span class="font-semibold text-gray-600">Finished On:</span><span>${book.finishedOn || 'Not set'}</span></div>${durationHTML}` : ''}</div></div>`;};
        const renderReadingLogEdit = (bookId, shelf) => { const container = document.getElementById('reading-log-container'); const book = library[shelf]?.find(b => b.id === bookId); if (!container || !book) return; const mediums = ["Paperback", "Kindle Paperwhite", "Mobile", "Tablet"]; const mediumOptions = mediums.map(m => `<option value="${m}" ${book.readingMedium === m ? 'selected' : ''}>${m}</option>`).join(''); container.innerHTML = `<div class="bg-white rounded-xl border p-6"><h2 class="text-lg font-semibold text-gray-900 mb-4">Edit Reading Log</h2><div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm"><div><label for="reading-medium" class="font-semibold block mb-1 text-gray-600">Medium</label><select id="reading-medium" class="w-full p-2 border rounded-lg bg-gray-50"><option value="">Not set</option>${mediumOptions}</select></div><div><label for="started-on" class="font-semibold block mb-1 text-gray-600">Started On</label><input type="date" id="started-on" value="${book.startedOn || ''}" class="w-full p-2 border rounded-lg bg-gray-50"></div>${shelf === 'read' ? `<div><label for="finished-on" class="font-semibold block mb-1 text-gray-600">Finished On</label><input type="date" id="finished-on" value="${book.finishedOn || ''}" class="w-full p-2 border rounded-lg bg-gray-50"></div>` : ''}</div><div class="flex justify-end gap-2 mt-4"><button id="cancel-log-edit-btn" class="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button><button id="save-log-btn" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">Save</button></div></div>`;};
        const renderHighlights = (bookId, shelf) => { const container = document.getElementById('highlights-container'); const book = library[shelf]?.find(b => b.id === bookId); if (!container || !book) return; if (book.highlights && book.highlights.length > 0) { container.innerHTML = '<div class="space-y-4">' + book.highlights.map(h => `<p class="highlight-item text-gray-700">${h}</p>`).join('') + '</div>'; } else { container.innerHTML = '<p class="text-gray-500">No highlights for this book.</p>'; }};
        
        detailsContainer.addEventListener('click', async (e) => {
            const container = e.target.closest('#reading-log-container'); if (!container) return;
            const { bookId, shelf } = container.dataset;
            if (e.target.id === 'edit-log-btn') requestPassword(() => renderReadingLogEdit(bookId, shelf));
            if (e.target.id === 'cancel-log-edit-btn') renderReadingLogView(bookId, shelf);
            if (e.target.id === 'save-log-btn') {
                const book = { ...library[shelf]?.find(b => b.id === bookId) };
                if (book) {
                    book.readingMedium = container.querySelector('#reading-medium').value; book.startedOn = container.querySelector('#started-on').value;
                    const finishedOnInput = container.querySelector('#finished-on'); if (finishedOnInput) book.finishedOn = finishedOnInput.value;
                    requestPassword(async () => {
                        const {success} = await performAuthenticatedAction({ action: 'update', data: book });
                        if (success) { await getLibrary(true); const updatedBook = Object.values(library).flat().find(b => b.id === bookId); if (updatedBook) renderReadingLogView(updatedBook.id, updatedBook.shelf); }
                    });
                }
            }
        });

        getLibrary().then(lib => { if (lib) { const params = new URLSearchParams(window.location.search); const bookId = params.get('id'); const book = Object.values(lib).flat().find(b => b.id === bookId); renderDetailsPage(book); }});
    }

    // --- SHARED INITIALIZATION & EVENT LISTENERS ---
    manageViewOnlyBanner();
    const banner = document.getElementById('view-only-banner');
    if (banner) {
        banner.querySelector('#dismiss-banner-btn').addEventListener('click', () => banner.classList.add('hidden'));
        banner.querySelector('#auth-link').addEventListener('click', () => requestPassword(() => { /* Open modal only */ }));
    }

    const passwordModal = document.getElementById('password-modal');
    if (passwordModal) {
        passwordModal.querySelector('#password-submit-btn').addEventListener('click', () => { if (afterPasswordCallback) afterPasswordCallback(); });
        passwordModal.querySelector('#password-cancel-btn').addEventListener('click', () => closeModal(passwordModal));
    }
    
    document.body.addEventListener('click', (e) => {
        const target = e.target; 
        const closest = (selector) => target.closest(selector); 
        
        const modalToClose = closest('.modal-backdrop'); 
        if (target.classList.contains('close-highlight-modal-btn')) closeModal(document.getElementById('highlight-import-modal')); 
        if (target.matches('.modal-backdrop:not(#password-modal)')) closeModal(target);

        const handleBookAction = (callback) => requestPassword(async () => { const {success} = await callback(); if (success) { window.location.reload(); } });
        const handleAddBook = (bookData, targetShelf) => { const bookWithShelf = { ...bookData, shelf: targetShelf }; if (targetShelf === 'currentlyReading') bookWithShelf.startedOn = new Date().toISOString().split('T')[0]; if (targetShelf === 'read') bookWithShelf.finishedOn = new Date().toISOString().split('T')[0]; handleBookAction(() => performAuthenticatedAction({ action: 'add', data: bookWithShelf })); };
        const handleRemoveBook = (bookId) => handleBookAction(() => performAuthenticatedAction({ action: 'delete', data: { id: bookId } }));
        const handleMoveBook = (bookId, currentShelf, targetShelf) => { const bookToMove = { ...library[currentShelf].find(b => b.id === bookId) }; if (!bookToMove) return; bookToMove.shelf = targetShelf; if (targetShelf === 'currentlyReading' && !bookToMove.startedOn) bookToMove.startedOn = new Date().toISOString().split('T')[0]; if (targetShelf === 'read' && !bookToMove.finishedOn) { bookToMove.finishedOn = new Date().toISOString().split('T')[0]; if (!bookToMove.startedOn) bookToMove.startedOn = bookToMove.finishedOn; } handleBookAction(() => performAuthenticatedAction({ action: 'update', data: bookToMove }));};

        const addBtn = closest('.add-btn');
        if (addBtn) handleAddBook(JSON.parse(addBtn.dataset.bookInfo), addBtn.dataset.targetShelf);

        const optionsToggle = closest('.options-btn-toggle');
        if (optionsToggle) {
            e.stopPropagation(); // Prevent link navigation when clicking the options button
            document.querySelectorAll('.options-btn-toggle').forEach(btn => {
                const dropdown = btn.nextElementSibling;
                if(btn !== optionsToggle) dropdown.classList.add('hidden');
            });
            optionsToggle.nextElementSibling.classList.toggle('hidden');
        } else {
            document.querySelectorAll('.options-btn-toggle').forEach(btn => btn.nextElementSibling.classList.add('hidden'));
        }

        const removeBtn = closest('.remove-btn');
        if (removeBtn) handleRemoveBook(removeBtn.dataset.bookId);
        
        if (target.dataset.targetShelf && closest('button')) handleMoveBook(target.dataset.bookId, target.dataset.currentShelf, target.dataset.targetShelf);

        const menuButton = document.getElementById('menu-button');
        const menu = document.getElementById('menu');
        if (menuButton && menu && !menuButton.contains(target) && !menu.contains(target) && !closest('#menu')) {
            menu.classList.add('hidden');
        }
    });

    const forceRefreshBtn = document.getElementById('force-refresh-btn');
    if(forceRefreshBtn) {
         forceRefreshBtn.addEventListener('click', () => { showToast('Refreshing from database...'); getLibrary(true).then(lib => { if(lib) { showToast('Library updated!'); window.location.reload(); } else { showToast('Failed to update library.', 'error'); }}); const menu = document.getElementById('menu'); if(menu) menu.classList.add('hidden'); });
    }
     const menuButton = document.getElementById('menu-button');
     const menu = document.getElementById('menu');
     if(menuButton) menuButton.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('hidden'); });
});

