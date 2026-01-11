document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const API_ENDPOINT = '/api/books';
    const PARSE_API_ENDPOINT = '/api/parse-highlights';
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
    
    const parseBook = (book) => {
        try { book.authors = JSON.parse(book.authors); } catch (e) { book.authors = Array.isArray(book.authors) ? book.authors : []; }
        try { book.imageLinks = JSON.parse(book.imageLinks); } catch (e) { book.imageLinks = typeof book.imageLinks === 'object' && book.imageLinks ? book.imageLinks : {}; }
        try { book.industryIdentifiers = JSON.parse(book.industryIdentifiers); } catch (e) { book.industryIdentifiers = []; }
        try { book.highlights = JSON.parse(book.highlights); } catch (e) { book.highlights = []; }
        return book;
    };
    
    const groupBooksIntoLibrary = (books) => { 
        const newLibrary = { watchlist: [], currentlyReading: [], read: [] }; 
        books.forEach(book => { 
            const parsedBook = parseBook(book);
            if (newLibrary[parsedBook.shelf]) { 
                newLibrary[parsedBook.shelf].push(parsedBook); 
            }
        }); 
        return newLibrary;
    };
    
    const showLoaderOnBook = (bookId) => {
        const bookEl = document.querySelector(`[data-book-id="${bookId}"]`);
        if (bookEl) {
            const overlay = document.createElement('div');
            overlay.className = 'loader-overlay';
            overlay.innerHTML = '<div class="loader-spinner"></div>';
            bookEl.style.position = 'relative';
            bookEl.appendChild(overlay);
        }
    };

    const hideLoaderOnBook = (bookId) => {
        const bookEl = document.querySelector(`[data-book-id="${bookId}"]`);
        if (bookEl) {
            const overlay = bookEl.querySelector('.loader-overlay');
            if (overlay) {
                overlay.remove();
            }
        }
    };

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
    
    const performAuthenticatedAction = async (payload, password, endpoint = API_ENDPOINT) => {
        if (!password) { showToast("Password cannot be empty.", "error"); return {success: false}; }
        try {
            const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, password })});
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');
            if (payload.action !== 'export' && endpoint === API_ENDPOINT) { showToast(result.message || 'Action successful!', 'success'); }
            return {success: true, data: result};
        } catch (error) {
            console.error("Authenticated action failed:", error);
            showToast(error.message, "error");
            setCookie(PWD_COOKIE, '', -1);
            manageViewOnlyBanner();
            return {success: false};
        }
    };
    
    const requestPassword = (callback) => {
        const existingPassword = getCookie(PWD_COOKIE);
        if (existingPassword) { callback(existingPassword); return; }
        const passwordModal = document.getElementById('password-modal');
        if (passwordModal) { afterPasswordCallback = callback; openModal(passwordModal); } 
        else { showToast("Could not open password prompt.", "error"); }
    };

    const manageViewOnlyBanner = () => {
        const banners = document.querySelectorAll('#view-only-banner');
        banners.forEach(banner => {
            if (!banner) return;
            if (getCookie(PWD_COOKIE)) banner.classList.add('hidden');
            else banner.classList.remove('hidden');
        });
    };
    
    const createBookListItemHTML = (book) => {
        const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/80x120/e2e8f0/475569?text=N/A`;
        const authors = book.authors ? book.authors.join(', ') : 'Unknown Author';
        
        let progressHTML = '';
        if (book.shelf === 'currentlyReading') {
            const progress = book.readingProgress || 0;
            progressHTML = `
                <div class="mt-2">
                    <div class="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Reading Progress</span>
                        <span>${progress}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-1.5">
                        <div class="bg-blue-600 h-1.5 rounded-full" style="width: ${progress}%"></div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="book-list-item flex items-center p-4 space-x-4 relative group" data-book-id="${book.id}">
                <a href="/dashboard/details.html?id=${book.id}" class="flex items-start space-x-4 flex-grow min-w-0">
                    <img src="${coverUrl}" alt="Cover of ${book.title}" class="w-12 h-16 object-cover rounded-md shadow-sm flex-shrink-0">
                    <div class="flex-grow min-w-0">
                        <p class="font-semibold text-gray-800 truncate group-hover:underline">${book.title}</p>
                        <p class="text-sm text-gray-500 truncate">${authors}</p>
                        ${progressHTML}
                    </div>
                </a>
                <div class="flex-shrink-0">
                     <button class="options-btn-toggle p-2 rounded-full hover:bg-gray-200">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                     </button>
                     <div class="absolute right-4 top-14 mt-2 w-48 bg-white rounded-xl shadow-lg border text-sm z-10 hidden">
                        <p class="px-4 pt-2 pb-1 text-xs text-gray-400 font-semibold">Move to</p>
                        ${book.shelf !== 'currentlyReading' ? `<button class="w-full text-left px-4 py-2 hover:bg-gray-100 move-btn" data-target-shelf="currentlyReading">Currently Reading</button>` : ''}
                        ${book.shelf !== 'watchlist' ? `<button class="w-full text-left px-4 py-2 hover:bg-gray-100 move-btn" data-target-shelf="watchlist">Watchlist</button>` : ''}
                        ${book.shelf !== 'read' ? `<button class="w-full text-left px-4 py-2 hover:bg-gray-100 move-btn" data-target-shelf="read">Read</button>` : ''}
                        <div class="border-t my-1"></div>
                        <button class="edit-btn w-full text-left px-4 py-2 hover:bg-gray-100">Edit Details</button>
                        <button class="remove-btn w-full text-left px-4 py-2 text-red-600 hover:bg-red-50">Remove Book</button>
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
            if (homepageMessages.currentlyReading) homepageMessages.currentlyReading.classList.toggle('hidden', crBooks.length > 0); 
            if (crBooks.length > 0) crBooks.forEach(book => homepageContainers.currentlyReading.innerHTML += createBookListItemHTML(book, 'currentlyReading')); 
            else if (homepageMessages.currentlyReading) homepageMessages.currentlyReading.textContent = "You're not reading anything."; 
            
            const rrBooks = [...library.read].sort((a,b) => new Date(b.finishedOn) - new Date(a.finishedOn)).slice(0, 4); 
            homepageContainers.recentReads.innerHTML = ''; 
            if (homepageMessages.recentReads) homepageMessages.recentReads.classList.toggle('hidden', rrBooks.length > 0); 
            if(rrBooks.length > 0) rrBooks.forEach(book => homepageContainers.recentReads.innerHTML += createBookListItemHTML(book, 'read')); 
            else if (homepageMessages.recentReads) homepageMessages.recentReads.textContent = "You haven't finished any books yet.";
        };

        const createSearchResultItemHTML = (book) => {
            const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/80x120/e2e8f0/475569?text=N/A`;
            const authors = book.authors ? book.authors.join(', ') : 'Unknown Author';
            const bookInfoStr = JSON.stringify(book).replace(/'/g, "&apos;");
            return `
                <div class="book-list-item flex items-center p-4 space-x-4">
                     <img src="${coverUrl}" alt="Cover of ${book.title}" class="w-12 h-16 object-cover rounded-md shadow-sm flex-shrink-0">
                    <div class="flex-grow min-w-0">
                        <p class="font-semibold text-gray-800 truncate">${book.title}</p>
                        <p class="text-sm text-gray-500 truncate">${authors}</p>
                    </div>
                    <div class="flex-shrink-0 flex gap-2">
                        <button data-book-info='${bookInfoStr}' data-target-shelf="currentlyReading" title="Add to Currently Reading" class="add-btn text-sm bg-blue-100 text-blue-700 font-semibold py-1.5 px-3 rounded-lg hover:bg-blue-200">Reading</button>
                        <button data-book-info='${bookInfoStr}' data-target-shelf="watchlist" title="Add to Watchlist" class="add-btn text-sm bg-gray-100 text-gray-700 font-semibold py-1.5 px-3 rounded-lg hover:bg-gray-200">Watch</button>
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
        
        document.body.addEventListener('click', (e) => {
             const addBtn = e.target.closest('.add-btn');
             if (addBtn) {
                 const bookData = JSON.parse(addBtn.dataset.bookInfo.replace(/&apos;/g, "'"));
                 const targetShelf = addBtn.dataset.targetShelf;
                 const bookWithShelf = { ...bookData, shelf: targetShelf }; 
                 if (targetShelf === 'currentlyReading') bookWithShelf.startedOn = new Date().toISOString().split('T')[0];
                 if (targetShelf === 'read') bookWithShelf.finishedOn = new Date().toISOString().split('T')[0];
                 requestPassword(async (password) => {
                     const { success } = await performAuthenticatedAction({ action: 'add', data: bookWithShelf }, password);
                     if (success) {
                         await fetchAndSetLibrary();
                         renderHomepageSummaries();
                     }
                 });
             }
        });

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
        const editBookModal = document.getElementById('edit-book-modal');
        const importHighlightsBtn = document.getElementById('import-highlights-btn');
        const highlightsFileInput = document.getElementById('highlights-file-input');
        const highlightImportModal = document.getElementById('highlight-import-modal');
        const confirmImportBtn = document.getElementById('confirm-import-btn');
        const exportDataBtn = document.getElementById('export-data-btn');
        const importDataBtn = document.getElementById('import-data-btn');
        const importFileInput = document.getElementById('import-file-input');
        
        const renderShelf = (shelfName) => { 
            const container = shelfContainers[shelfName];
            const messageEl = shelfMessages[shelfName];
            const books = library[shelfName]; 
            container.innerHTML = ''; 
            if (messageEl) messageEl.classList.toggle('hidden', books.length > 0); 

            if (books.length > 0) {
                const sortedBooks = shelfName === 'read' 
                    ? [...books].sort((a,b) => new Date(b.finishedOn) - new Date(a.finishedOn)) 
                    : books;
                sortedBooks.forEach(book => {
                    const bookEl = document.createElement('div');
                    bookEl.innerHTML = createBookListItemHTML(book);
                    container.appendChild(bookEl.firstChild);
                });
            } else if (messageEl) {
                messageEl.textContent = `This shelf is empty.`;
            }
        };

        const renderAllLibraryShelves = () => Object.keys(shelfContainers).forEach(renderShelf);
        
        const updateBookInState = (updatedBook) => {
            const parsedBook = parseBook(updatedBook);
            // Remove from old shelf
            Object.keys(library).forEach(shelf => {
                library[shelf] = library[shelf].filter(b => b.id !== parsedBook.id);
            });
            // Add to new shelf
            if (library[parsedBook.shelf]) {
                library[parsedBook.shelf].push(parsedBook);
            }
        };

        importHighlightsBtn.addEventListener('click', () => requestPassword(() => highlightsFileInput.click()));
        highlightsFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const { fileContent, fileName } = { fileContent: event.target.result, fileName: file.name };
                    const response = await fetch(PARSE_API_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileContent, fileName }) });
                    if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Failed to parse file.'); }
                    const parsed = await response.json();
                    if (parsed.highlights.length === 0) return showToast('No highlights found in the file.', 'error');
                    tempHighlights = parsed.highlights;
                    document.getElementById('highlight-book-title').textContent = parsed.title || 'Unknown Title';
                    const selectEl = document.getElementById('highlight-book-select');
                    selectEl.innerHTML = '<option value="">Select a book...</option>';
                    Object.values(library).flat().forEach(book => {
                        const option = document.createElement('option');
                        option.value = `${book.shelf}:${book.id}`;
                        option.textContent = book.title;
                        selectEl.appendChild(option);
                    });
                    openModal(highlightImportModal);
                } catch (error) { showToast(error.message, 'error'); }
            };
            reader.readAsText(file);
            e.target.value = null;
        });

        confirmImportBtn.addEventListener('click', () => { 
            const selected = document.getElementById('highlight-book-select').value; if (!selected) return showToast('Please select a book.', 'error'); 
            const [shelf, bookId] = selected.split(':'); const book = library[shelf]?.find(b => b.id === bookId); if (!book) return showToast('Could not find selected book.', 'error'); 
            book.highlights = [...(book.highlights || []), ...tempHighlights]; 
            requestPassword(async (password) => { 
                showLoaderOnBook(bookId);
                const {success, data} = await performAuthenticatedAction({ action: 'update', data: book }, password); 
                if (success) { 
                    updateBookInState(data.book);
                    renderAllLibraryShelves();
                    tempHighlights = []; 
                    closeModal(highlightImportModal); 
                }
                hideLoaderOnBook(bookId);
            }); 
        });

        exportDataBtn.addEventListener('click', () => { requestPassword(async (password) => { const {success, data} = await performAuthenticatedAction({ action: 'export' }, password); if (success) { const booksToExport = groupBooksIntoLibrary(data); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([JSON.stringify(booksToExport, null, 2)], { type: 'application/json' })); link.download = `book-tracker-backup-${new Date().toISOString().split('T')[0]}.json`; link.click(); URL.revokeObjectURL(link.href); showToast('Data exported successfully!'); }}); });
        importDataBtn.addEventListener('click', () => requestPassword(() => importFileInput.click()));
        importFileInput.addEventListener('change', (e) => { 
            const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); 
            reader.onload = (event) => { try { 
                const importedLibrary = JSON.parse(event.target.result); if (!('watchlist' in importedLibrary && 'currentlyReading' in importedLibrary && 'read' in importedLibrary)) throw new Error('Invalid backup file format.'); 
                const allBooks = Object.values(importedLibrary).flat(); if(allBooks.length === 0) return showToast('Backup file is empty.', 'error'); 
                requestPassword(async (password) => { 
                    showToast(`Importing ${allBooks.length} books...`, 'success'); 
                    for (const book of allBooks) { await performAuthenticatedAction({ action: 'add', data: book }, password); } 
                    await fetchAndSetLibrary();
                    renderAllLibraryShelves();
                    showToast('Import complete!', 'success'); 
                }); 
            } catch (error) { showToast('Failed to import data. Invalid file.', 'error'); }}; 
            reader.readAsText(file); e.target.value = null; 
        });
        
        if (editBookModal) {
            const saveBtn = document.getElementById('edit-book-save-btn');
            const saveBtnLoader = saveBtn.querySelector('.loader-spinner');
            const removeBtn = document.getElementById('edit-book-remove-btn');
            const progressContainer = document.getElementById('reading-progress-container');
            const progressSlider = document.getElementById('edit-book-progress');
            const progressPercentage = document.getElementById('progress-percentage');
            
            progressSlider.addEventListener('input', (e) => {
                progressPercentage.textContent = `${e.target.value}%`;
            });

            saveBtn.addEventListener('click', () => {
                const bookId = document.getElementById('edit-book-id').value;
                const shelf = document.getElementById('edit-book-shelf').value;
                const originalBook = library[shelf]?.find(b => b.id === bookId);
                if (!originalBook) return showToast('Could not find book to update.', 'error');
                
                const updatedBook = {
                    ...originalBook,
                    title: document.getElementById('edit-book-title').value.trim(),
                    authors: document.getElementById('edit-book-authors').value.split(',').map(a => a.trim()).filter(a => a),
                    imageLinks: { thumbnail: document.getElementById('edit-book-cover').value.trim() },
                    readingMedium: document.getElementById('edit-book-medium').value,
                    startedOn: document.getElementById('edit-book-started').value || null,
                    finishedOn: document.getElementById('edit-book-finished').value || null,
                    readingProgress: parseInt(progressSlider.value, 10),
                };
                
                requestPassword(async (password) => {
                    saveBtn.disabled = true;
                    if(saveBtnLoader) saveBtnLoader.style.display = 'inline-block';
                    const { success, data } = await performAuthenticatedAction({ action: 'update', data: updatedBook }, password);
                    saveBtn.disabled = false;
                    if(saveBtnLoader) saveBtnLoader.style.display = 'none';
                    if (success) { 
                        updateBookInState(data.book);
                        renderAllLibraryShelves();
                        closeModal(editBookModal);
                    }
                });
            });
            
            const closeEditModal = () => closeModal(editBookModal);
            document.getElementById('edit-book-cancel-btn').addEventListener('click', closeEditModal);
            document.getElementById('edit-book-cancel-btn-top').addEventListener('click', closeEditModal);

            removeBtn.addEventListener('click', () => {
                const bookId = document.getElementById('edit-book-id').value;
                if (confirm('Are you sure you want to permanently remove this book?')) {
                    requestPassword(async (password) => {
                        showLoaderOnBook(bookId);
                        const { success } = await performAuthenticatedAction({ action: 'delete', data: { id: bookId } }, password);
                        if (success) { 
                            library[document.getElementById('edit-book-shelf').value] = library[document.getElementById('edit-book-shelf').value].filter(b => b.id !== bookId);
                            renderAllLibraryShelves();
                            closeModal(editBookModal);
                        } else {
                            hideLoaderOnBook(bookId);
                        }
                    });
                }
            });
        }
        
        document.body.addEventListener('click', (e) => {
            const target = e.target;
            const bookItem = target.closest('.book-list-item');
            if (!bookItem) return;

            const bookId = bookItem.dataset.bookId;
            const book = Object.values(library).flat().find(b => b.id === bookId);

            if (target.closest('.edit-btn')) {
                const modal = document.getElementById('edit-book-modal');
                document.getElementById('edit-book-id').value = book.id;
                document.getElementById('edit-book-shelf').value = book.shelf;
                document.getElementById('edit-book-title').value = book.title || '';
                document.getElementById('edit-book-authors').value = book.authors?.join(', ') || '';
                document.getElementById('edit-book-cover').value = book.imageLinks?.thumbnail || '';
                document.getElementById('edit-book-medium').value = book.readingMedium || '';
                document.getElementById('edit-book-started').value = book.startedOn || '';
                document.getElementById('edit-book-finished').value = book.finishedOn || '';
                
                const progressContainer = document.getElementById('reading-progress-container');
                const progressSlider = document.getElementById('edit-book-progress');
                const progressPercentage = document.getElementById('progress-percentage');
                if (book.shelf === 'currentlyReading') {
                    progressContainer.classList.remove('hidden');
                    progressSlider.value = book.readingProgress || 0;
                    progressPercentage.textContent = `${book.readingProgress || 0}%`;
                } else {
                    progressContainer.classList.add('hidden');
                }

                openModal(modal);
            }

            if (target.closest('.move-btn')) {
                const targetShelf = target.dataset.targetShelf;
                const bookToMove = { ...book, shelf: targetShelf };
                if (targetShelf === 'currentlyReading' && !bookToMove.startedOn) bookToMove.startedOn = new Date().toISOString().split('T')[0]; 
                if (targetShelf === 'read' && !bookToMove.finishedOn) { 
                    bookToMove.finishedOn = new Date().toISOString().split('T')[0]; 
                    if (!bookToMove.startedOn) bookToMove.startedOn = bookToMove.finishedOn; 
                }
                requestPassword(async (password) => {
                    showLoaderOnBook(bookId);
                    const { success, data } = await performAuthenticatedAction({ action: 'update', data: bookToMove }, password);
                    if (success) {
                        updateBookInState(data.book);
                        renderAllLibraryShelves();
                    } else {
                        hideLoaderOnBook(bookId);
                    }
                });
            }
             if (target.closest('.remove-btn')) {
                if (confirm('Are you sure you want to permanently remove this book?')) {
                    requestPassword(async (password) => {
                        showLoaderOnBook(bookId);
                        const { success } = await performAuthenticatedAction({ action: 'delete', data: { id: bookId } }, password);
                        if (success) {
                            library[book.shelf] = library[book.shelf].filter(b => b.id !== bookId);
                            renderAllLibraryShelves();
                        } else {
                            hideLoaderOnBook(bookId);
                        }
                    });
                }
            }
        });

        (async () => {
            const success = await fetchAndSetLibrary();
            if (success) renderAllLibraryShelves();
        })();
    }

    // --- DETAILS PAGE LOGIC ---
    if (document.getElementById('details-page-content')) {
        const detailsContainer = document.getElementById('details-page-content');
        
        const renderDetailsPage = (book) => {
            if (!book) { detailsContainer.innerHTML = `<a href="/dashboard/" class="text-blue-500 mb-8 inline-block">&larr; Back to Dashboard</a><p class="text-center">Book not found.</p>`; return; }
            const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/128x192/e2e8f0/475569?text=N/A`;
            const authors = book.authors ? book.authors.join(', ') : 'Unknown Author';
            const pageCount = book.pageCount ? `${book.pageCount} pages` : 'N/A';
            const publishedDate = book.publishedDate ? book.publishedDate : 'N/A';
            const isbn = book.industryIdentifiers?.find(id => id.type === 'ISBN_13' || id.type === 'ISBN_10')?.identifier || 'N/A';
            const goodreadsLink = `https://www.goodreads.com/search?q=${encodeURIComponent(book.title + ' ' + (book.authors ? book.authors[0] : ''))}`;
            
            detailsContainer.innerHTML = `
                <div class="pb-4 mb-6">
                     <a href="/dashboard/library.html" class="text-blue-600 text-sm font-semibold mb-2 inline-block">&larr; Back to My Library</a>
                     <h1 class="text-3xl font-bold tracking-tight text-gray-900">${book.title}</h1>
                     <p class="text-gray-500 mt-1">${authors}</p>
                </div>
                <div class="space-y-8">
                    <section id="reading-log-container" data-book-id="${book.id}" data-shelf="${book.shelf}"></section>
                    <section>
                        <div class="bg-white rounded-xl border p-6">
                            <h2 class="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
                            <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-700">
                                <div><strong>Published:</strong> ${publishedDate}</div>
                                <div><strong>Pages:</strong> ${pageCount}</div>
                                <div><strong>ISBN:</strong> ${isbn}</div>
                                <div><a href="${goodreadsLink}" target="_blank" class="text-blue-600 hover:underline font-semibold">Find on Goodreads</a></div>
                            </div>
                        </div>
                    </section>
                    <section>
                        <div class="bg-white rounded-xl border p-6" data-book-id="${book.id}" data-shelf="${book.shelf}">
                             <div id="highlights-heading-container" class="flex justify-between items-center mb-4"></div>
                            <div id="highlights-content-container"></div>
                        </div>
                    </section>
                </div>`;
            
            renderReadingLogView(book.id, book.shelf);
            renderHighlightsView(book.id, book.shelf);
        };

        const renderReadingLogView = (bookId, shelf) => {
            const container = document.getElementById('reading-log-container');
            const book = library[shelf]?.find(b => b.id === bookId);
            if (!container || !book) return;
            let durationHTML = '';
            if (shelf === 'read' && book.startedOn && book.finishedOn) {
                const diffDays = Math.max(1, Math.ceil(Math.abs(new Date(book.finishedOn) - new Date(book.startedOn)) / (1000 * 60 * 60 * 24)));
                durationHTML = `<div class="flex justify-between items-center"><span class="font-semibold text-gray-600">Time to Finish:</span><span>${diffDays} day${diffDays !== 1 ? 's' : ''}</span></div>`;
            }
            container.innerHTML = `
                <div class="bg-white rounded-xl border p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-lg font-semibold text-gray-900">Reading Log</h2>
                        <button id="edit-log-btn" class="text-sm font-semibold text-blue-600 hover:underline">Edit</button>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between items-center"><span class="font-semibold text-gray-600">Medium:</span><span>${book.readingMedium || 'Not set'}</span></div>
                        <div class="flex justify-between items-center"><span class="font-semibold text-gray-600">Started On:</span><span>${book.startedOn || 'Not set'}</span></div>
                        ${shelf === 'read' ? `<div class="flex justify-between items-center"><span class="font-semibold text-gray-600">Finished On:</span><span>${book.finishedOn || 'Not set'}</span></div>${durationHTML}` : ''}
                    </div>
                </div>`;
        };

        const renderReadingLogEdit = (bookId, shelf) => {
            const container = document.getElementById('reading-log-container');
            const book = library[shelf]?.find(b => b.id === bookId);
            if (!container || !book) return;
            const mediums = ["Paperback", "Kindle Paperwhite", "Mobile", "Tablet"];
            const mediumOptions = mediums.map(m => `<option value="${m}" ${book.readingMedium === m ? 'selected' : ''}>${m}</option>`).join('');
            container.innerHTML = `
                <div class="bg-white rounded-xl border p-6">
                    <h2 class="text-lg font-semibold text-gray-900 mb-4">Edit Reading Log</h2>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div><label for="reading-medium" class="font-semibold block mb-1 text-gray-600">Medium</label><select id="reading-medium" class="w-full p-2 border rounded-lg bg-gray-50"><option value="">Not set</option>${mediumOptions}</select></div>
                        <div><label for="started-on" class="font-semibold block mb-1 text-gray-600">Started On</label><input type="date" id="started-on" value="${book.startedOn || ''}" class="w-full p-2 border rounded-lg bg-gray-50"></div>
                        ${shelf === 'read' ? `<div><label for="finished-on" class="font-semibold block mb-1 text-gray-600">Finished On</label><input type="date" id="finished-on" value="${book.finishedOn || ''}" class="w-full p-2 border rounded-lg bg-gray-50"></div>` : ''}
                    </div>
                    <div class="flex justify-end gap-2 mt-4">
                        <button id="cancel-log-edit-btn" class="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button>
                        <button id="save-log-btn" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">Save</button>
                    </div>
                </div>`;
        };

        const renderHighlightsView = (bookId, shelf) => {
            const headingContainer = document.getElementById('highlights-heading-container');
            const contentContainer = document.getElementById('highlights-content-container');
            const book = library[shelf]?.find(b => b.id === bookId);
            if (!headingContainer || !contentContainer || !book) return;

            headingContainer.innerHTML = `
                <h2 class="text-lg font-semibold text-gray-900">Highlights</h2>
                <button id="edit-highlights-btn" class="text-sm font-semibold text-blue-600 hover:underline">Edit</button>
            `;
            
            if (book.highlights && book.highlights.length > 0) {
                contentContainer.innerHTML = '<div class="space-y-4">' + book.highlights.map(h => `<p class="highlight-item text-gray-700">${h}</p>`).join('') + '</div>';
            } else {
                contentContainer.innerHTML = '<p class="text-gray-500">No highlights for this book. Click "Edit" to add some.</p>';
            }
        };
        
        const renderHighlightsEdit = (bookId, shelf) => {
            const headingContainer = document.getElementById('highlights-heading-container');
            const contentContainer = document.getElementById('highlights-content-container');
            const book = library[shelf]?.find(b => b.id === bookId);
            if (!headingContainer || !contentContainer || !book) return;

            headingContainer.innerHTML = `<h2 class="text-lg font-semibold text-gray-900">Edit Highlights</h2>`;
            
            const markdownText = book.highlights.map(h => `- ${h}`).join('\n');
            contentContainer.innerHTML = `
                <div>
                    <textarea id="highlights-textarea" class="w-full h-64 p-3 border rounded-lg bg-gray-50 text-sm font-mono" placeholder="- Type or paste a highlight per line...">${markdownText}</textarea>
                    <p class="text-xs text-gray-500 mt-1">Each item in a Markdown list (- item) will become a separate highlight.</p>
                </div>
                <div class="flex justify-end gap-2 mt-4">
                    <button id="cancel-highlights-edit-btn" class="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button>
                    <button id="save-highlights-btn" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">Save Highlights</button>
                </div>
            `;
        };

        const parseMarkdownHighlights = (text) => {
            const lines = text.split('\n').map(l => l.trim()).filter(l => l);
            const isList = lines.some(l => l.startsWith('- ') || l.startsWith('* ') || /^\d+\.\s/.test(l));
            if (isList) {
                return lines.map(line => line.replace(/^(- |\* |\d+\.\s)/, '').trim()).filter(line => line);
            } else if (text.trim()) {
                return [text.trim()];
            }
            return [];
        };
        
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
                        requestPassword(async (password) => {
                            const { success } = await performAuthenticatedAction({ action: 'update', data: book }, password);
                            if (success) { 
                                await fetchAndSetLibrary();
                                renderDetailsPage(library[shelf].find(b => b.id === bookId));
                             }
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
                        requestPassword(async (password) => {
                             const { success } = await performAuthenticatedAction({ action: 'update', data: book }, password);
                             if (success) { 
                                 await fetchAndSetLibrary();
                                 renderDetailsPage(library[shelf].find(b => b.id === bookId));
                              }
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
        const passwordInput = document.getElementById('password-input');
        const rememberMeCheckbox = document.getElementById('remember-me');
        
        const handleSubmit = () => {
            const password = passwordInput.value;
            if (!password) { showToast("Password cannot be empty.", "error"); return; }
            if (rememberMeCheckbox.checked) { setCookie(PWD_COOKIE, password, 30); manageViewOnlyBanner(); }
            closeModal(passwordModal);
            if (afterPasswordCallback) { afterPasswordCallback(password); }
            passwordInput.value = '';
            rememberMeCheckbox.checked = false;
            afterPasswordCallback = null;
        };

        passwordModal.querySelector('#password-submit-btn').addEventListener('click', handleSubmit);
        passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit(); });
        
        passwordModal.querySelector('#password-cancel-btn').addEventListener('click', () => {
            closeModal(passwordModal);
            passwordInput.value = '';
            rememberMeCheckbox.checked = false;
            afterPasswordCallback = null;
        });
    }
    
    document.body.addEventListener('click', (e) => {
        const target = e.target; 
        
        if (target.classList.contains('close-highlight-modal-btn')) closeModal(document.getElementById('highlight-import-modal')); 
        if (target.matches('.modal-backdrop:not(#password-modal)')) closeModal(target);

        const optionsToggle = target.closest('.options-btn-toggle');
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
    });
});

