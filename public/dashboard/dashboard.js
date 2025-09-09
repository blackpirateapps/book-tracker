document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const API_ENDPOINT = '/api/books';
    const PARSE_API_ENDPOINT = '/api/parse-highlights';
    const PWD_COOKIE = 'book-tracker-admin-pwd';
    const BOOKS_PER_PAGE = 10;
    
    // --- STATE MANAGEMENT ---
    let library = { watchlist: [], currentlyReading: [], read: [] };
    let pagination = { watchlist: { currentPage: 1 }, currentlyReading: { currentPage: 1 }, read: { currentPage: 1 } };
    let afterPasswordCallback = null;
    let searchTimeout;

    // --- DOM ELEMENTS ---
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const shelfTemplate = document.getElementById('shelf-template');
    const bookTemplate = document.getElementById('book-item-template');
    const shelvesContainer = document.getElementById('shelves-container');
    const editBookModal = document.getElementById('edit-book-modal');
    const searchToggleBtn = document.getElementById('search-toggle-btn');
    const searchInput = document.getElementById('search-input');
    const searchResultsSection = document.getElementById('search-results-section');
    const searchResultsContainer = document.getElementById('search-results-container');
    const searchMessage = document.getElementById('search-message');
    const skeletonBookTemplate = document.getElementById('skeleton-book-template');
    
    // --- HELPER FUNCTIONS ---
    const setCookie = (name, value, days) => { let expires = ""; if (days) { const date = new Date(); date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000)); expires = "; expires=" + date.toUTCString(); } document.cookie = name + "=" + (value || "") + expires + "; path=/dashboard; SameSite=Lax; Secure"; };
    const getCookie = (name) => { const nameEQ = name + "="; const ca = document.cookie.split(';'); for (let i = 0; i < ca.length; i++) { let c = ca[i]; while (c.charAt(0) === ' ') c = c.substring(1, c.length); if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length); } return null; };
    const showToast = (message, type = 'success') => { if(!toast || !toastMessage) return; toastMessage.textContent = message; toast.className = `fixed bottom-5 right-5 text-white py-2 px-5 rounded-lg shadow-xl transition-opacity duration-300 z-50 ${type === 'success' ? 'bg-slate-900' : 'bg-red-600'}`; toast.classList.remove('opacity-0'); setTimeout(() => toast.classList.add('opacity-0'), 3000);};
    const openModal = (modal) => { modal.classList.remove('hidden'); setTimeout(() => { modal.classList.remove('opacity-0'); modal.querySelector('.modal-content').classList.remove('scale-95', 'opacity-0'); }, 10);};
    const closeModal = (modal) => { modal.classList.add('opacity-0'); modal.querySelector('.modal-content').classList.add('scale-95', 'opacity-0'); setTimeout(() => modal.classList.add('hidden'), 300);};
    
    const parseBook = (book) => {
        try { book.authors = JSON.parse(book.authors); } catch (e) { book.authors = Array.isArray(book.authors) ? book.authors : []; }
        try { book.imageLinks = JSON.parse(book.imageLinks); } catch (e) { book.imageLinks = typeof book.imageLinks === 'object' && book.imageLinks ? book.imageLinks : {}; }
        try { book.highlights = JSON.parse(book.highlights); } catch (e) { book.highlights = []; }
        return book;
    };
    
    const groupBooksIntoLibrary = (books) => { 
        const newLibrary = { watchlist: [], currentlyReading: [], read: [] }; 
        books.forEach(book => { 
            const parsedBook = parseBook(book);
            if (newLibrary[parsedBook.shelf]) { 
                newLibrary[parsedBook.shelf].push(parsedBook); 
            } else {
                newLibrary.watchlist.push(parsedBook);
            }
        }); 
        return newLibrary;
    };
    
    const showLoaderOnBook = (bookId) => {
        const bookEl = document.querySelector(`[data-book-id="${bookId}"]`);
        if (bookEl) {
            const overlay = document.createElement('div');
            overlay.className = 'loader-overlay absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center';
            overlay.innerHTML = '<div class="loader-spinner"></div>';
            bookEl.style.position = 'relative';
            bookEl.appendChild(overlay);
        }
    };

    const hideLoaderOnBook = (bookId) => {
        const bookEl = document.querySelector(`[data-book-id="${bookId}"]`);
        if (bookEl) {
            const overlay = bookEl.querySelector('.loader-overlay');
            if (overlay) overlay.remove();
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
            document.getElementById('shelves-container').innerHTML = `<p class="text-center text-red-500">Could not load library data. Please check your connection or database credentials.</p>`;
            return false;
        }
    };
    
    const performAuthenticatedAction = async (payload, password) => {
        if (!password) { showToast("Password cannot be empty.", "error"); return {success: false}; }
        try {
            const response = await fetch(API_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, password })});
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');
            showToast(result.message || 'Action successful!', 'success');
            return {success: true, data: result};
        } catch (error) {
            console.error("Authenticated action failed:", error);
            showToast(error.message, "error");
            setCookie(PWD_COOKIE, '', -1);
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

    searchToggleBtn.addEventListener('click', () => {
        searchInput.classList.toggle('expanded');
        if (searchInput.classList.contains('expanded')) {
            searchInput.focus();
        } else {
            searchResultsSection.classList.add('hidden');
        }
    });

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();

        if (query.length < 3) {
            searchResultsSection.classList.add('hidden');
            return;
        }

        searchResultsSection.classList.remove('hidden');
        searchMessage.textContent = 'Searching...';
        searchResultsContainer.innerHTML = '';
        searchResultsContainer.appendChild(searchMessage);
        
        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5&fields=key,title,author_name,cover_i,edition_key,first_publish_year`);
                if (!response.ok) throw new Error('Network error');
                const data = await response.json();
                renderSearchResults(data.docs);
            } catch (error) {
                searchMessage.textContent = 'Error fetching results.';
            }
        }, 500);
    });

    const renderSearchResults = (docs) => {
        searchResultsContainer.innerHTML = '';
        if (docs.length === 0) {
            searchMessage.textContent = 'No books found.';
            searchResultsContainer.appendChild(searchMessage);
            return;
        }

        docs.forEach(doc => {
            const coverUrl = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : `https://placehold.co/80x120/e2e8f0/475569?text=N/A`;
            const resultEl = document.createElement('div');
            resultEl.className = 'flex items-center p-2 space-x-3 hover:bg-gray-100 rounded-lg';
            resultEl.innerHTML = `
                <img src="${coverUrl}" class="w-10 h-14 object-cover rounded-md flex-shrink-0">
                <div class="flex-grow min-w-0">
                    <p class="font-semibold text-sm truncate">${doc.title}</p>
                    <p class="text-xs text-gray-500 truncate">${(doc.author_name || []).join(', ')}</p>
                </div>
                <div class="flex-shrink-0 flex gap-1">
                    <button class="add-book-btn p-2 rounded-full hover:bg-blue-100" title="Add to Currently Reading" data-shelf="currentlyReading">
                        <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd"></path></svg>
                    </button>
                    <button class="add-book-btn p-2 rounded-full hover:bg-gray-200" title="Add to Watchlist" data-shelf="watchlist">
                        <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path></svg>
                    </button>
                </div>
            `;
            resultEl.querySelectorAll('.add-book-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleAddBook(doc, btn.dataset.shelf, btn);
                });
            });
            searchResultsContainer.appendChild(resultEl);
        });
    };
    
    const handleAddBook = (doc, shelf, btn) => {
        const bookData = {
            id: doc.key.replace('/works/', ''),
            olid: doc.edition_key?.[0],
            title: doc.title,
            authors: doc.author_name || [],
            publishedDate: String(doc.first_publish_year || ''),
            imageLinks: { thumbnail: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null },
            shelf: shelf,
        };
        
        requestPassword(async (password) => {
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<div class="loader-spinner w-5 h-5"></div>';
            btn.disabled = true;
            
            const { success, data } = await performAuthenticatedAction({ action: 'add', data: bookData }, password);
            
            if (success) {
                updateBookInState(data.book);
                renderAllShelves();
                searchInput.value = '';
                searchResultsSection.classList.add('hidden');
            } else {
                btn.innerHTML = originalContent;
                btn.disabled = false;
            }
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

        const shelfChangeMenu = bookElement.querySelector('.shelf-change-menu');
        const shelves = {
            currentlyReading: "Currently Reading",
            watchlist: "To Read",
            read: "Read"
        };

        Object.keys(shelves).forEach(shelfKey => {
            if (book.shelf !== shelfKey) {
                const button = document.createElement('button');
                button.className = 'w-full text-left px-4 py-2 hover:bg-gray-100 move-btn';
                button.dataset.targetShelf = shelfKey;
                button.textContent = shelves[shelfKey];
                shelfChangeMenu.appendChild(button);
            }
        });

        return bookElement;
    };
    
    const renderShelf = (shelfName) => { 
        const shelfSection = document.querySelector(`[data-shelf-name="${shelfName}"]`);
        if (!shelfSection) return;

        const container = shelfSection.querySelector('.shelf-books-container');
        const paginationControls = shelfSection.querySelector('.pagination-controls');
        const pageInfo = shelfSection.querySelector('.page-info');
        const prevBtn = shelfSection.querySelector('.prev-page-btn');
        const nextBtn = shelfSection.querySelector('.next-page-btn');
        const shelfCount = shelfSection.querySelector('.shelf-count');
        
        const books = library[shelfName];
        if (shelfName === 'read') {
            books.sort((a, b) => new Date(b.finishedOn) - new Date(a.finishedOn));
        }

        const totalBooks = books.length;
        shelfCount.textContent = totalBooks;
        const totalPages = Math.ceil(totalBooks / BOOKS_PER_PAGE);
        pagination[shelfName].totalPages = totalPages;

        if (pagination[shelfName].currentPage > totalPages) {
            pagination[shelfName].currentPage = totalPages || 1;
        }
        const currentPage = pagination[shelfName].currentPage;
        
        const start = (currentPage - 1) * BOOKS_PER_PAGE;
        const end = start + BOOKS_PER_PAGE;
        const paginatedBooks = books.slice(start, end);

        container.innerHTML = '';
        
        if (paginatedBooks.length > 0) {
            paginatedBooks.forEach(book => {
                container.appendChild(createBookListItemNode(book));
            });
        } else {
            const p = document.createElement('p');
            p.className = 'p-8 text-center text-gray-500';
            p.textContent = `This shelf is empty.`;
            container.appendChild(p);
        }

        if (totalPages > 1) {
            paginationControls.style.display = 'flex';
            pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
            prevBtn.disabled = currentPage === 1;
            nextBtn.disabled = currentPage === totalPages;
        } else {
            paginationControls.style.display = 'none';
        }
    };

    const renderAllShelves = () => {
        Object.keys(library).forEach(renderShelf);
    };

    const updateBookInState = (updatedBook) => {
        const parsedBook = parseBook(updatedBook);
        Object.keys(library).forEach(shelf => {
            library[shelf] = library[shelf].filter(b => b.id !== parsedBook.id);
        });
        if (library[parsedBook.shelf]) {
            library[parsedBook.shelf].push(parsedBook);
        }
    };
    
    if (editBookModal) {
        const saveBtn = document.getElementById('edit-book-save-btn');
        const saveBtnLoader = saveBtn.querySelector('.loader-spinner');
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
                    renderAllShelves();
                    closeModal(editBookModal);
                }
            });
        });
        
        const closeEditModal = () => closeModal(editBookModal);
        document.getElementById('edit-book-cancel-btn').addEventListener('click', closeEditModal);
        document.getElementById('edit-book-cancel-btn-top').addEventListener('click', closeEditModal);
    }
    
    shelvesContainer.addEventListener('click', (e) => {
        const target = e.target;
        const bookItem = target.closest('.book-list-item');
        const shelfSection = target.closest('.shelf-section');

        if (target.closest('.shelf-header')) {
            const header = target.closest('.shelf-header');
            header.classList.toggle('collapsed');
            const content = header.nextElementSibling;
            content.classList.toggle('collapsed');
        }

        if (shelfSection) {
            const shelfName = shelfSection.dataset.shelfName;
            if (target.closest('.next-page-btn')) {
                if (pagination[shelfName].currentPage < pagination[shelfName].totalPages) {
                    pagination[shelfName].currentPage++;
                    renderShelf(shelfName);
                }
            }
            if (target.closest('.prev-page-btn')) {
                if (pagination[shelfName].currentPage > 1) {
                    pagination[shelfName].currentPage--;
                    renderShelf(shelfName);
                }
            }
        }

        if (!bookItem) return;

        const bookId = bookItem.dataset.bookId;
        const book = Object.values(library).flat().find(b => b.id === bookId);
        if (!book) return;

        if (target.closest('.edit-btn')) {
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
            openModal(editBookModal);
        }

        if (target.closest('.move-btn')) {
            const targetShelf = target.closest('.move-btn').dataset.targetShelf;
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
                    renderAllShelves();
                } else {
                    hideLoaderOnBook(bookId);
                }
            });
        }
         if (target.closest('.remove-btn')) {
            if (confirm('Are you sure you want to permanently remove this book?')) {
                requestPassword(async (password) => {
                    showLoaderOnBook(bookId);
                    const { success } = await performAuthenticatedAction({ action: 'delete', data: { id: bookId } });
                    if (success) {
                        library[book.shelf] = library[book.shelf].filter(b => b.id !== bookId);
                        renderAllShelves();
                    } else {
                        hideLoaderOnBook(bookId);
                    }
                });
            }
        }
        if (target.closest('.import-highlights-single-btn')) {
            const fileInput = document.getElementById('highlights-file-input');
            fileInput.onchange = (e) => {
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
                        
                        const bookToUpdate = { ...book };
                        bookToUpdate.highlights = [...(bookToUpdate.highlights || []), ...parsed.highlights];
                        
                        requestPassword(async (password) => {
                            showLoaderOnBook(bookId);
                            const { success, data } = await performAuthenticatedAction({ action: 'update', data: bookToUpdate }, password);
                            if (success) {
                                updateBookInState(data.book);
                                renderAllShelves();
                            }
                            hideLoaderOnBook(bookId);
                        });

                    } catch (error) { showToast(error.message, 'error'); }
                };
                reader.readAsText(file);
                e.target.value = null; 
            };
            fileInput.click();
        }
    });

    const initializePage = async () => {
        const shelfOrder = ['currentlyReading', 'watchlist', 'read'];
        
        shelvesContainer.innerHTML = '';
        shelfOrder.forEach(shelfName => {
            const shelfClone = shelfTemplate.content.cloneNode(true);
            const shelfSection = shelfClone.querySelector('.shelf-section');
            shelfSection.dataset.shelfName = shelfName;

            let title;
            if (shelfName === 'watchlist') {
                title = 'To Read';
            } else {
                title = shelfName.charAt(0).toUpperCase() + shelfName.slice(1).replace(/([A-Z])/g, ' $1').trim();
            }
            shelfSection.querySelector('h2').textContent = title;

            const booksContainer = shelfSection.querySelector('.shelf-books-container');
            for(let i = 0; i < 3; i++) {
                booksContainer.appendChild(skeletonBookTemplate.content.cloneNode(true));
            }
            shelvesContainer.appendChild(shelfSection);
        });

        const success = await fetchAndSetLibrary();
        
        if (success) {
            shelvesContainer.innerHTML = '';
            shelfOrder.forEach(shelfName => {
                const shelfClone = shelfTemplate.content.cloneNode(true);
                const shelfSection = shelfClone.querySelector('.shelf-section');
                shelfSection.dataset.shelfName = shelfName;
                
                let title;
                if (shelfName === 'watchlist') {
                    title = 'To Read';
                } else {
                    title = shelfName.charAt(0).toUpperCase() + shelfName.slice(1).replace(/([A-Z])/g, ' $1').trim();
                }
                shelfSection.querySelector('h2').textContent = title;
                
                shelvesContainer.appendChild(shelfSection);
            });
            renderAllShelves();
        }
    };

    initializePage();

    document.body.addEventListener('click', (e) => {
        const target = e.target;
        if (target.closest('.shelf-change-btn')) {
            e.stopPropagation();
            const menu = target.closest('.shelf-change-btn').nextElementSibling;
            document.querySelectorAll('.shelf-change-menu, .options-menu').forEach(m => {
                if (m !== menu) m.classList.add('hidden');
            });
            menu.classList.toggle('hidden');
        } else if (target.closest('.options-btn-toggle')) {
            e.stopPropagation();
            const menu = target.closest('.options-btn-toggle').nextElementSibling;
            document.querySelectorAll('.shelf-change-menu, .options-menu').forEach(m => {
                if (m !== menu) m.classList.add('hidden');
            });
            menu.classList.toggle('hidden');
        } else {
             document.querySelectorAll('.shelf-change-menu, .options-menu').forEach(m => m.classList.add('hidden'));
        }
    });
});

