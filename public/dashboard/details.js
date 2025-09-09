document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const DETAILS_API_ENDPOINT = '/api/details-api';
    const UPDATE_API_ENDPOINT = '/api/books';
    const PWD_COOKIE = 'book-tracker-admin-pwd';

    // --- STATE ---
    let book = null;
    let afterPasswordCallback = null;
    let isEditing = {};

    // --- DOM ELEMENTS ---
    const contentContainer = document.getElementById('details-page-content');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // --- HELPERS ---
    const setCookie = (name, value, days) => { let expires = ""; if (days) { const date = new Date(); date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000)); expires = "; expires=" + date.toUTCString(); } document.cookie = name + "=" + (value || "") + expires + "; path=/dashboard; SameSite=Lax; Secure"; };
    const getCookie = (name) => { const nameEQ = name + "="; const ca = document.cookie.split(';'); for (let i = 0; i < ca.length; i++) { let c = ca[i]; while (c.charAt(0) === ' ') c = c.substring(1, c.length); if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length); } return null; };
    const showToast = (message, type = 'success') => { if(!toast || !toastMessage) return; toastMessage.textContent = message; toast.className = `fixed bottom-5 right-5 text-white py-2 px-5 rounded-lg shadow-xl transition-opacity duration-300 z-50 ${type === 'success' ? 'bg-slate-900' : 'bg-red-600'}`; toast.classList.remove('opacity-0'); setTimeout(() => toast.classList.add('opacity-0'), 3000);};
    const openModal = (modal) => { modal.classList.remove('hidden'); setTimeout(() => { modal.classList.remove('opacity-0'); modal.querySelector('.modal-content').classList.remove('scale-95', 'opacity-0'); }, 10);};
    const closeModal = (modal) => { modal.classList.add('opacity-0'); modal.querySelector('.modal-content').classList.add('scale-95', 'opacity-0'); setTimeout(() => modal.classList.add('hidden'), 300);};
    
    const requestPassword = (callback) => {
        const existingPassword = getCookie(PWD_COOKIE);
        if (existingPassword) { callback(existingPassword); return; }
        const passwordModal = document.getElementById('password-modal');
        if (passwordModal) { 
            afterPasswordCallback = callback; 
            openModal(passwordModal);
        } 
    };
    
    const performAuthenticatedUpdate = async (updatedBookData, saveBtn) => {
        requestPassword(async (password) => {
            if(saveBtn) {
                saveBtn.disabled = true;
                const loader = saveBtn.querySelector('.loader-spinner');
                if(loader) loader.style.display = 'inline-block';
            }
            try {
                const response = await fetch(UPDATE_API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'update', data: updatedBookData, password })
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Update failed.');

                showToast(result.message);
                book = parseBook(result.book);
                isEditing = {}; 
                renderPage();
                attachActionListeners();

            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                if(saveBtn) {
                    saveBtn.disabled = false;
                    const loader = saveBtn.querySelector('.loader-spinner');
                    if(loader) loader.style.display = 'none';
                }
            }
        });
    };

    const parseBook = (rawBook) => {
        const parsed = { ...rawBook };
        try { parsed.authors = JSON.parse(rawBook.authors || '[]'); } catch (e) { parsed.authors = Array.isArray(rawBook.authors) ? rawBook.authors : []; }
        try { parsed.imageLinks = JSON.parse(rawBook.imageLinks || '{}'); } catch (e) { parsed.imageLinks = typeof rawBook.imageLinks === 'object' ? rawBook.imageLinks : {}; }
        try { parsed.highlights = JSON.parse(rawBook.highlights || '[]'); } catch (e) { parsed.highlights = []; }
        try { parsed.subjects = JSON.parse(rawBook.subjects || '[]'); } catch (e) { parsed.subjects = []; }
        return parsed;
    };
    
    // --- RENDERING ---
    const renderPage = () => {
        contentContainer.innerHTML = `
            <a href="/dashboard/dashboard.html" class="text-blue-600 text-sm font-semibold mb-8 inline-block">&larr; Back to Dashboard</a>
            <div id="main-info-section"></div>
            <div id="reading-log-section" class="mt-12"></div>
            <div id="description-section" class="mt-12"></div>
            <div id="highlights-section" class="mt-12"></div>
        `;
        renderMainInfo();
        renderReadingLog();
        renderDescription();
        renderHighlights();
    };

    const renderMainInfo = () => {
        const container = document.getElementById('main-info-section');
        if (!container) return;
        const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/200x300/e2e8f0/475569?text=N/A`;

        if (isEditing.mainInfo) {
            container.innerHTML = `
                <div class="bg-white rounded-xl border p-6">
                     <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-semibold text-gray-900">Edit Details</h2>
                    </div>
                    <div class="space-y-4 text-sm">
                        <div><label class="font-semibold block mb-1 text-gray-600">Title</label><input type="text" id="edit-title" class="w-full p-2 border rounded-lg bg-gray-50" value="${book.title}"></div>
                        <div><label class="font-semibold block mb-1 text-gray-600">Authors (comma-separated)</label><input type="text" id="edit-authors" class="w-full p-2 border rounded-lg bg-gray-50" value="${book.authors.join(', ')}"></div>
                        <div><label class="font-semibold block mb-1 text-gray-600">Publisher</label><input type="text" id="edit-publisher" class="w-full p-2 border rounded-lg bg-gray-50" value="${book.publisher || ''}"></div>
                        <div><label class="font-semibold block mb-1 text-gray-600">Published Date</label><input type="text" id="edit-fullPublishDate" class="w-full p-2 border rounded-lg bg-gray-50" value="${book.fullPublishDate || ''}"></div>
                        <div><label class="font-semibold block mb-1 text-gray-600">Page Count</label><input type="number" id="edit-pageCount" class="w-full p-2 border rounded-lg bg-gray-50" value="${book.pageCount || ''}"></div>
                    </div>
                     <div class="flex justify-end gap-2 mt-6">
                        <button id="cancel-main-info-btn" class="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button>
                        <button id="save-main-info-btn" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center gap-2">Save <div class="loader-spinner" style="display: none;"></div></button>
                    </div>
                </div>`;
        } else {
             container.innerHTML = `
                <div class="flex flex-col sm:flex-row gap-8">
                    <div class="sm:w-1/3 text-center sm:text-left">
                        <img src="${coverUrl}" alt="Cover of ${book.title}" class="w-full max-w-[200px] h-auto object-cover rounded-lg shadow-lg mx-auto">
                    </div>
                    <div class="sm:w-2/3 space-y-2">
                        <div class="flex justify-between items-start">
                            <div class="flex-grow">
                                <h1 class="text-3xl font-bold tracking-tight text-gray-900">${book.title}</h1>
                                <p class="text-lg text-gray-600">${book.authors.join(', ')}</p>
                            </div>
                            <button id="edit-main-info-btn" class="text-sm font-semibold text-blue-600 hover:underline flex-shrink-0 ml-4">Edit</button>
                        </div>
                        <div class="pt-4 text-sm text-gray-500 space-y-1">
                            <p><strong>Publisher:</strong> <span>${book.publisher || 'N/A'}</span></p>
                            <p><strong>Published:</strong> <span>${book.fullPublishDate || 'N/A'}</span></p>
                            <p><strong>Pages:</strong> <span>${book.pageCount || 'N/A'}</span></p>
                        </div>
                    </div>
                </div>`;
        }
    };

    const renderReadingLog = () => {
        const container = document.getElementById('reading-log-section');
        if (!container) return;

        if (isEditing.readingLog) {
            const mediums = ["Paperback", "Kindle Paperwhite", "Mobile", "Tablet", "Audiobook"];
            const mediumOptions = mediums.map(m => `<option value="${m}" ${book.readingMedium === m ? 'selected' : ''}>${m}</option>`).join('');
            container.innerHTML = `
                <div class="bg-white rounded-xl border p-6">
                    <h2 class="text-xl font-semibold text-gray-900 mb-4">Edit Reading Log</h2>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div><label for="reading-medium" class="font-semibold block mb-1 text-gray-600">Medium</label><select id="reading-medium" class="w-full p-2 border rounded-lg bg-gray-50"><option value="">Not set</option>${mediumOptions}</select></div>
                        <div><label for="started-on" class="font-semibold block mb-1 text-gray-600">Started On</label><input type="date" id="started-on" value="${book.startedOn || ''}" class="w-full p-2 border rounded-lg bg-gray-50"></div>
                        <div><label for="finished-on" class="font-semibold block mb-1 text-gray-600">Finished On</label><input type="date" id="finished-on" value="${book.finishedOn || ''}" class="w-full p-2 border rounded-lg bg-gray-50"></div>
                    </div>
                    <div class="flex justify-end gap-2 mt-4">
                        <button id="cancel-log-btn" class="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button>
                        <button id="save-log-btn" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center gap-2">Save <div class="loader-spinner" style="display: none;"></div></button>
                    </div>
                </div>
            `;
        } else {
            let durationHTML = '';
            if (book.startedOn && book.finishedOn) {
                const diffTime = Math.abs(new Date(book.finishedOn) - new Date(book.startedOn));
                const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                durationHTML = `<div class="flex justify-between"><strong class="text-gray-600">Time to Finish:</strong><span>${diffDays} day${diffDays !== 1 ? 's' : ''}</span></div>`;
            }

            container.innerHTML = `
                <div class="bg-white rounded-xl border p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-semibold text-gray-900">Reading Log</h2>
                        <button id="edit-log-btn" class="text-sm font-semibold text-blue-600 hover:underline">Edit</button>
                    </div>
                    <div class="space-y-2 text-sm text-gray-700">
                        <div class="flex justify-between"><strong class="text-gray-600">Medium:</strong><span>${book.readingMedium || 'Not set'}</span></div>
                        <div class="flex justify-between"><strong class="text-gray-600">Started On:</strong><span>${book.startedOn || 'Not set'}</span></div>
                        <div class="flex justify-between"><strong class="text-gray-600">Finished On:</strong><span>${book.finishedOn || 'Not set'}</span></div>
                        ${durationHTML}
                    </div>
                </div>
            `;
        }
    };
    
    const renderDescription = () => {
        const container = document.getElementById('description-section');
        if (!container) return;

        if (isEditing.description) {
            container.innerHTML = `
                <div class="bg-white rounded-xl border p-6">
                    <h2 class="text-xl font-semibold text-gray-900 mb-4">Edit Description</h2>
                    <textarea id="edit-description-textarea" class="w-full h-48 p-3 border rounded-lg bg-gray-50 text-sm">${book.bookDescription || ''}</textarea>
                    <div class="flex justify-end gap-2 mt-4">
                        <button id="cancel-description-btn" class="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button>
                        <button id="save-description-btn" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center gap-2">Save <div class="loader-spinner" style="display: none;"></div></button>
                    </div>
                </div>`;
        } else {
            container.innerHTML = `
                <div class="bg-white rounded-xl border p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-semibold text-gray-900">Description</h2>
                        <button id="edit-description-btn" class="text-sm font-semibold text-blue-600 hover:underline">Edit</button>
                    </div>
                    <p class="text-gray-700 leading-relaxed">${book.bookDescription || 'No description available. Click "Edit" to add one.'}</p>
                </div>`;
        }
    };
    
    const renderHighlights = () => {
        const container = document.getElementById('highlights-section');
        if (!container) return;

        if (isEditing.highlights) {
            const markdownText = book.highlights.map(h => `- ${h}`).join('\n');
            container.innerHTML = `
                <div class="bg-white rounded-xl border p-6">
                    <h2 class="text-xl font-semibold text-gray-900 mb-4">Edit Highlights</h2>
                    <textarea id="highlights-textarea" class="w-full h-64 p-3 border rounded-lg bg-gray-50 text-sm font-mono">${markdownText}</textarea>
                    <div class="flex justify-end gap-2 mt-4">
                        <button id="cancel-highlights-btn" class="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button>
                        <button id="save-highlights-btn" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center gap-2">Save <div class="loader-spinner" style="display: none;"></div></button>
                    </div>
                </div>`;
        } else {
             container.innerHTML = `
                <div class="bg-white rounded-xl border p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-semibold text-gray-900">Highlights</h2>
                        <button id="edit-highlights-btn" class="text-sm font-semibold text-blue-600 hover:underline">Edit</button>
                    </div>
                    ${book.highlights.length > 0 ? 
                        '<ul class="space-y-4">' + book.highlights.map(h => `<li class="highlight-item pl-4">${h}</li>`).join('') + '</ul>' : 
                        '<p class="text-gray-500">No highlights yet. Click "Edit" to add some.</p>'
                    }
                </div>`;
        }
    };

    const attachActionListeners = () => {
        document.getElementById('edit-main-info-btn')?.addEventListener('click', () => { isEditing.mainInfo = true; renderMainInfo(); attachActionListeners(); });
        document.getElementById('cancel-main-info-btn')?.addEventListener('click', () => { isEditing.mainInfo = false; renderMainInfo(); attachActionListeners(); });
        document.getElementById('save-main-info-btn')?.addEventListener('click', (e) => {
            const updatedBook = { ...book };
            updatedBook.title = document.getElementById('edit-title').value;
            updatedBook.authors = document.getElementById('edit-authors').value.split(',').map(a => a.trim()).filter(Boolean);
            updatedBook.publisher = document.getElementById('edit-publisher').value;
            updatedBook.fullPublishDate = document.getElementById('edit-fullPublishDate').value;
            updatedBook.pageCount = document.getElementById('edit-pageCount').value;
            performAuthenticatedUpdate(updatedBook, e.currentTarget);
        });

        document.getElementById('edit-log-btn')?.addEventListener('click', () => { isEditing.readingLog = true; renderReadingLog(); attachActionListeners(); });
        document.getElementById('cancel-log-btn')?.addEventListener('click', () => { isEditing.readingLog = false; renderReadingLog(); attachActionListeners(); });
        document.getElementById('save-log-btn')?.addEventListener('click', e => {
            const updatedBook = { ...book };
            updatedBook.readingMedium = document.getElementById('reading-medium').value;
            updatedBook.startedOn = document.getElementById('started-on').value || null;
            updatedBook.finishedOn = document.getElementById('finished-on').value || null;
            performAuthenticatedUpdate(updatedBook, e.currentTarget);
        });

        document.getElementById('edit-description-btn')?.addEventListener('click', () => { isEditing.description = true; renderDescription(); attachActionListeners(); });
        document.getElementById('cancel-description-btn')?.addEventListener('click', () => { isEditing.description = false; renderDescription(); attachActionListeners(); });
        document.getElementById('save-description-btn')?.addEventListener('click', e => {
            const updatedBook = { ...book };
            updatedBook.bookDescription = document.getElementById('edit-description-textarea').value;
            performAuthenticatedUpdate(updatedBook, e.currentTarget);
        });

        document.getElementById('edit-highlights-btn')?.addEventListener('click', () => { isEditing.highlights = true; renderHighlights(); attachActionListeners(); });
        document.getElementById('cancel-highlights-btn')?.addEventListener('click', () => { isEditing.highlights = false; renderHighlights(); attachActionListeners(); });
        document.getElementById('save-highlights-btn')?.addEventListener('click', e => {
            const textarea = document.getElementById('highlights-textarea');
            const newHighlights = textarea.value.split('\n')
                .map(line => line.trim().replace(/^- /, ''))
                .filter(Boolean);
            const updatedBook = { ...book, highlights: newHighlights };
            performAuthenticatedUpdate(updatedBook, e.currentTarget);
        });
    };
    
    // --- INITIALIZATION ---
    const initializePage = async () => {
        const bookId = new URLSearchParams(window.location.search).get('id');
        if (!bookId) { 
            contentContainer.innerHTML = `<p class="text-center text-red-500">No book ID provided.</p>`;
            return;
        }

        try {
            const response = await fetch(`${DETAILS_API_ENDPOINT}?id=${bookId}`);
            if (!response.ok) throw new Error('Book not found.');
            const rawBook = await response.json();
            book = parseBook(rawBook);
            renderPage();
            attachActionListeners();
        } catch (error) {
            contentContainer.innerHTML = `<div id="skeleton-loader"><p class="text-center text-red-500">${error.message}</p></div>`;
        }
    };

    const passwordModal = document.getElementById('password-modal');
    if (passwordModal) {
        const passwordInput = document.getElementById('password-input');
        const rememberMeCheckbox = document.getElementById('remember-me');
        const submitBtn = document.getElementById('password-submit-btn');
        const cancelBtn = document.getElementById('password-cancel-btn');

        const handleSubmit = () => {
            const password = passwordInput.value;
            if (!password) { showToast("Password cannot be empty.", "error"); return; }
            if (rememberMeCheckbox.checked) { setCookie(PWD_COOKIE, password, 30); }
            closeModal(passwordModal);

            if (afterPasswordCallback) { afterPasswordCallback(password); }
            passwordInput.value = '';
            rememberMeCheckbox.checked = false;
            afterPasswordCallback = null;
        };
        
        const handleCancel = () => {
            closeModal(passwordModal);
            afterPasswordCallback = null;
        };

        submitBtn.addEventListener('click', handleSubmit);
        cancelBtn.addEventListener('click', handleCancel);
        passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') handleCancel();
        });
    }

    initializePage();
});

