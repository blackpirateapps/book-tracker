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
    const bookTemplate = document.getElementById('book-item-template');
    
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

    const createBookListItemNode = (book) => {
        const clone = bookTemplate.content.cloneNode(true);
        const bookElement = clone.querySelector('.book-list-item');
        
        const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/80x120/e2e8f0/475569?text=N/A`;
        const authors = book.authors ? book.authors.join(', ') : 'Unknown Author';

        bookElement.dataset.bookId = book.id;
        bookElement.querySelector('a').href = `/dashboard/details.html?id=${book.id}`;
        bookElement.querySelector('img').src = coverUrl;
        bookElement.querySelector('img').alt = `Cover of ${book.title}`;
        bookElement.querySelector('.font-semibold').textContent = book.title;
        bookElement.querySelector('.text-sm').textContent = authors;

        const progressContainer = bookElement.querySelector('.progress-container');
        if (book.shelf === 'currentlyReading') {
            const progress = book.readingProgress || 0;
            progressContainer.style.display = 'block';
            bookElement.querySelector('.progress-percentage').textContent = `${progress}%`;
            bookElement.querySelector('.progress-bar').style.width = `${progress}%`;
        }

        const moveOptionsContainer = bookElement.querySelector('.move-options');
        const shelves = ['currentlyReading', 'watchlist', 'read'];
        shelves.forEach(shelf => {
            if (book.shelf !== shelf) {
                const button = document.createElement('button');
                button.className = 'w-full text-left px-4 py-2 hover:bg-gray-100 move-btn';
                button.dataset.targetShelf = shelf;
                button.textContent = shelf.charAt(0).toUpperCase() + shelf.slice(1).replace(/([A-Z])/g, ' $1');
                moveOptionsContainer.appendChild(button);
            }
        });

        return bookElement;
    };
    
    // --- LIBRARY PAGE LOGIC ---
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
        if (messageEl) {
             messageEl.classList.toggle('hidden', books.length > 0);
             if(books.length === 0) container.appendChild(messageEl);
        }

        if (books.length > 0) {
            const sortedBooks = shelfName === 'read' 
                ? [...books].sort((a,b) => new Date(b.finishedOn) - new Date(a.finishedOn)) 
                : books;
            sortedBooks.forEach(book => {
                container.appendChild(createBookListItemNode(book));
            });
        } else if (messageEl) {
            messageEl.textContent = `This shelf is empty.`;
        }
    };

    const renderAllLibraryShelves = () => Object.keys(shelfContainers).forEach(renderShelf);
    
    const updateBookInState = (updatedBook) => {
        const parsedBook = parseBook(updatedBook);
        Object.keys(library).forEach(shelf => {
            library[shelf] = library[shelf].filter(b => b.id !== parsedBook.id);
        });
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
        if (!book) return;

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
                if(btn !== optionsToggle && dropdown) dropdown.classList.add('hidden');
            });
            const menu = optionsToggle.nextElementSibling;
            if (menu) menu.classList.toggle('hidden');
        } else if (!target.closest('.options-menu')) {
            document.querySelectorAll('.options-menu').forEach(menu => menu.classList.add('hidden'));
        }
    });
});
