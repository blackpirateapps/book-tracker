document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const API_ENDPOINT = '/api/books';
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
    
    /**
     * Fetches the entire library directly from the server. This is now the primary way to get data.
     */
    const fetchAndSetLibrary = async () => {
        try {
            const response = await fetch(API_ENDPOINT);
            if (!response.ok) throw new Error('Network response was not ok');
            const books = await response.json();
            library = groupBooksIntoLibrary(books);
            return true;
        } catch (error) {
            console.error("Failed to fetch books:", error);
            showToast("Could not connect to the database.", "error");
            return false;
        }
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
                manageViewOnlyBanner();
            }
        }
        if (!password) { showToast("Password cannot be empty.", "error"); return {success: false}; }
        if (passwordModal) closeModal(passwordModal);
        
        try {
            const response = await fetch(API_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, password })});
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');
            if (payload.action !== 'export') { showToast(result.message || 'Action successful!', 'success'); }
            return {success: true, data: result};
        } catch (error) {
            console.error("Authenticated action failed:", error);
            showToast(error.message, "error");
            setCookie(PWD_COOKIE, '', -1);
            manageViewOnlyBanner();
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
        } else { showToast("Could not open password prompt.", "error"); }
    };

    const manageViewOnlyBanner = () => {
        const banners = document.querySelectorAll('#view-only-banner');
        banners.forEach(banner => {
            if (!banner) return;
            if (getCookie(PWD_COOKIE)) { banner.classList.add('hidden'); } 
            else { banner.classList.remove('hidden'); }
        });
    };
    
    const createBookListItemHTML = (book, shelf) => {
        const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/80x120/e2e8f0/475569?text=N/A`;
        const authors = book.authors ? book.authors.join(', ') : 'Unknown Author';
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
        
        const renderHomepageSummaries = () => { /* ... (This function's content is unchanged) ... */ };
        const createSearchResultItemHTML = (book) => { /* ... (This function's content is unchanged) ... */ };
        const renderSearchResults = (books) => { /* ... (This function's content is unchanged) ... */ };
        const handleSearch = async (e) => { /* ... (This function's content is unchanged) ... */ };

        searchForm.addEventListener('submit', handleSearch);
        clearSearchBtn.addEventListener('click', () => { searchSection.classList.add('hidden'); searchInput.value = ''; });
        
        (async () => {
            const success = await fetchAndSetLibrary();
            if (success) renderHomepageSummaries();
        })();
    }

    // --- LIBRARY PAGE LOGIC ---
    if (document.getElementById('library-page-content')) {
        const shelfContainers = { watchlist: document.getElementById('shelf-watchlist'), currentlyReading: document.getElementById('shelf-currentlyReading'), read: document.getElementById('shelf-read') };
        const shelfMessages = { watchlist: document.getElementById('shelf-watchlist-message'), currentlyReading: document.getElementById('shelf-currentlyReading-message'), read: document.getElementById('shelf-read-message') };

        const renderShelf = (shelfName) => { /* ... (This function's content is unchanged) ... */ };
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
        const parseMDHighlights = (mdContent) => { /* ... (This function's content is unchanged) ... */ };
        const parseHTMLHighlights = (htmlContent) => { /* ... (This function's content is unchanged) ... */ };

        importHighlightsBtn.addEventListener('click', () => requestPassword(() => highlightsFileInput.click()));
        highlightsFileInput.addEventListener('change', (e) => { /* ... (This event listener's content is unchanged) ... */ });
        confirmImportBtn.addEventListener('click', () => { /* ... (This event listener's content is unchanged, but reloads on success now) ... */ 
            const selected = highlightBookSelect.value; if (!selected) return showToast('Please select a book.', 'error'); 
            const [shelf, bookId] = selected.split(':'); const book = library[shelf]?.find(b => b.id === bookId); if (!book) return showToast('Could not find selected book.', 'error'); 
            book.highlights = [...(book.highlights || []), ...tempHighlights]; 
            requestPassword(async () => { const {success} = await performAuthenticatedAction({ action: 'update', data: book }); if (success) { tempHighlights = []; closeModal(highlightImportModal); window.location.reload(); }}); 
        });
        exportDataBtn.addEventListener('click', () => { /* ... (This event listener's content is unchanged) ... */ });
        importDataBtn.addEventListener('click', () => requestPassword(() => importFileInput.click()));
        importFileInput.addEventListener('change', (e) => { /* ... (This event listener reloads after the loop) ... */ 
            const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); 
            reader.onload = (event) => { try { 
                const importedLibrary = JSON.parse(event.target.result); if (!('watchlist' in importedLibrary && 'currentlyReading' in importedLibrary && 'read' in importedLibrary)) throw new Error('Invalid backup file format.'); 
                const allBooks = Object.values(importedLibrary).flat(); if(allBooks.length === 0) return showToast('Backup file is empty.', 'error'); 
                requestPassword(async () => { 
                    showToast(`Importing ${allBooks.length} books...`, 'success'); 
                    for (const book of allBooks) { await performAuthenticatedAction({ action: 'add', data: book }); } 
                    showToast('Import complete! Refreshing...', 'success'); 
                    setTimeout(() => window.location.reload(), 1000); 
                }); 
            } catch (error) { showToast('Failed to import data. Invalid file.', 'error'); }}; 
            reader.readAsText(file); e.target.value = null; 
        });
        
        (async () => {
            const success = await fetchAndSetLibrary();
            if (success) renderAllLibraryShelves();
        })();
    }

    // --- DETAILS PAGE LOGIC ---
    if (document.getElementById('details-page-content')) {
        const detailsContainer = document.getElementById('details-page-content');
        
        const renderDetailsPage = (book) => { /* ... (This function's content is unchanged) ... */ };
        const renderReadingLogView = (bookId, shelf) => { /* ... (This function's content is unchanged) ... */ };
        const renderReadingLogEdit = (bookId, shelf) => { /* ... (This function's content is unchanged) ... */ };
        const renderHighlightsView = (bookId, shelf) => { /* ... (This function's content is unchanged) ... */ };
        const renderHighlightsEdit = (bookId, shelf) => { /* ... (This function's content is unchanged) ... */ };
        const parseMarkdownHighlights = (text) => { /* ... (This function's content is unchanged) ... */ };
        
        detailsContainer.addEventListener('click', async (e) => {
            const logContainer = e.target.closest('#reading-log-container');
            if (logContainer) {
                const { bookId, shelf } = logContainer.dataset;
                if (e.target.id === 'edit-log-btn') requestPassword(() => renderReadingLogEdit(bookId, shelf));
                if (e.target.id === 'cancel-log-edit-btn') renderReadingLogView(bookId, shelf);
                if (e.target.id === 'save-log-btn') {
                    const book = { ...library[shelf]?.find(b => b.id === bookId) };
                    if (book) {
                        book.readingMedium = logContainer.querySelector('#reading-medium').value;
                        book.startedOn = logContainer.querySelector('#started-on').value;
                        const finishedOnInput = logContainer.querySelector('#finished-on');
                        if (finishedOnInput) book.finishedOn = finishedOnInput.value;
                        requestPassword(async () => {
                            const { success } = await performAuthenticatedAction({ action: 'update', data: book });
                            if (success) { window.location.reload(); }
                        });
                    }
                }
            }

            const highlightsSection = e.target.closest('section > .bg-white');
            if(highlightsSection && highlightsSection.querySelector('#highlights-heading-container')) {
                const { bookId, shelf } = highlightsSection.dataset;
                if (e.target.id === 'edit-highlights-btn') requestPassword(() => renderHighlightsEdit(bookId, shelf));
                if (e.target.id === 'cancel-highlights-edit-btn') renderHighlightsView(bookId, shelf);
                if (e.target.id === 'save-highlights-btn') {
                    const book = { ...library[shelf]?.find(b => b.id === bookId) };
                    if (book) {
                        const textarea = document.getElementById('highlights-textarea');
                        book.highlights = parseMarkdownHighlights(textarea.value);
                        requestPassword(async () => {
                             const { success } = await performAuthenticatedAction({ action: 'update', data: book });
                             if (success) { window.location.reload(); }
                        });
                    }
                }
            }
        });

        (async () => {
            const success = await fetchAndSetLibrary();
            if (success) {
                const params = new URLSearchParams(window.location.search);
                const bookId = params.get('id');
                const book = Object.values(library).flat().find(b => b.id === bookId);
                renderDetailsPage(book);
            }
        })();
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
            e.stopPropagation();
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
         forceRefreshBtn.addEventListener('click', () => { 
            showToast('Refreshing from database...');
            window.location.reload(); 
        });
    }
     const menuButton = document.getElementById('menu-button');
     const menu = document.getElementById('menu');
     if(menuButton) menuButton.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('hidden'); });
});

