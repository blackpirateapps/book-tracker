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
    
    const performAuthenticatedUpdate = async (updatedBookData) => {
        requestPassword(async (password) => {
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
                renderPage();
                attachEditableListeners();

            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    };

    const parseBook = (rawBook) => {
        const parsed = { ...rawBook };
        try { parsed.authors = JSON.parse(rawBook.authors || '[]'); } catch (e) { parsed.authors = []; }
        try { parsed.imageLinks = JSON.parse(rawBook.imageLinks || '{}'); } catch (e) { parsed.imageLinks = {}; }
        try { parsed.highlights = JSON.parse(rawBook.highlights || '[]'); } catch (e) { parsed.highlights = []; }
        try { parsed.subjects = JSON.parse(rawBook.subjects || '[]'); } catch (e) { parsed.subjects = []; }
        return parsed;
    };
    
    // --- RENDERING ---
    const renderPage = () => {
        const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/200x300/e2e8f0/475569?text=N/A`;
        contentContainer.innerHTML = `
            <a href="/dashboard/dashboard.html" class="text-blue-600 text-sm font-semibold mb-8 inline-block">&larr; Back to Dashboard</a>
            <div class="flex flex-col sm:flex-row gap-8">
                <div class="sm:w-1/3 text-center sm:text-left">
                    <img src="${coverUrl}" alt="Cover of ${book.title}" class="w-full max-w-[200px] h-auto object-cover rounded-lg shadow-lg mx-auto">
                </div>
                <div class="sm:w-2/3 space-y-2">
                    <h1 class="text-3xl font-bold tracking-tight text-gray-900 editable" data-field="title">${book.title}</h1>
                    <p class="text-lg text-gray-600 editable" data-field="authors">${book.authors.join(', ')}</p>
                    <div class="pt-4 text-sm text-gray-500 space-y-1">
                        <p><strong>Publisher:</strong> <span class="editable" data-field="publisher">${book.publisher || 'N/A'}</span></p>
                        <p><strong>Published:</strong> <span class="editable" data-field="fullPublishDate">${book.fullPublishDate || 'N/A'}</span></p>
                        <p><strong>Pages:</strong> <span class="editable" data-field="pageCount">${book.pageCount || 'N/A'}</span></p>
                    </div>
                </div>
            </div>

            <section id="reading-log-section" class="mt-12"></section>

            <div class="mt-12">
                <h2 class="text-xl font-semibold text-gray-900 border-b pb-2 mb-4">Description</h2>
                <p class="text-gray-700 leading-relaxed editable" data-field="bookDescription">${book.bookDescription || 'No description available. Click to add one.'}</p>
            </div>

            <div class="mt-12">
                <div class="flex justify-between items-center border-b pb-2 mb-4">
                    <h2 class="text-xl font-semibold text-gray-900">Highlights</h2>
                    <button id="edit-highlights-btn" class="text-sm font-semibold text-blue-600 hover:underline">Edit</button>
                </div>
                <div id="highlights-container"></div>
            </div>
        `;
        renderReadingLog();
        renderHighlights();
    };

    const renderReadingLog = () => {
        const container = document.getElementById('reading-log-section');
        if (!container) return;

        if (isEditing.readingLog) {
            const mediums = ["Paperback", "Kindle Paperwhite", "Mobile", "Tablet"];
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
                        <button id="save-log-btn" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">Save</button>
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
    
    const renderHighlights = () => {
        const container = document.getElementById('highlights-container');
        if (isEditing.highlights) {
            const markdownText = book.highlights.map(h => `- ${h}`).join('\n');
            container.innerHTML = `
                <textarea id="highlights-textarea" class="w-full h-64 p-3 border rounded-lg bg-gray-50 text-sm font-mono">${markdownText}</textarea>
                <div class="flex justify-end gap-2 mt-4">
                    <button id="cancel-highlights-btn" class="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button>
                    <button id="save-highlights-btn" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">Save Highlights</button>
                </div>
            `;
        } else {
            if (book.highlights.length > 0) {
                container.innerHTML = '<ul class="space-y-2">' + book.highlights.map(h => `<li class="highlight-item">${h}</li>`).join('') + '</ul>';
            } else {
                container.innerHTML = '<p class="text-gray-500">No highlights yet. Click "Edit" to add some.</p>';
            }
        }
    };

    const attachEditableListeners = () => {
        contentContainer.querySelectorAll('.editable').forEach(el => {
            el.addEventListener('click', handleEditableClick);
        });
        document.getElementById('edit-highlights-btn')?.addEventListener('click', () => {
            isEditing.highlights = true;
            renderHighlights();
        });
        document.getElementById('edit-log-btn')?.addEventListener('click', () => {
            isEditing.readingLog = true;
            renderReadingLog();
        });
    };
    
    const handleEditableClick = (e) => {
        const el = e.target.closest('.editable');
        const field = el.dataset.field;
        if (isEditing[field]) return;

        isEditing[field] = true;
        const originalValue = field === 'authors' ? book.authors.join(', ') : book[field] || '';
        
        let inputEl;
        if (field === 'bookDescription') {
            inputEl = document.createElement('textarea');
            inputEl.className = 'w-full p-2 border rounded-md h-32';
            inputEl.value = originalValue;
        } else {
            inputEl = document.createElement('input');
            inputEl.type = (field === 'pageCount') ? 'number' : 'text';
            inputEl.className = 'w-full p-1 border rounded-md';
            inputEl.value = originalValue;
        }

        el.innerHTML = '';
        el.appendChild(inputEl);
        inputEl.focus();

        const saveChanges = () => {
            const newValue = inputEl.value.trim();
            const updatedBook = { ...book };

            if (field === 'authors') {
                updatedBook.authors = newValue.split(',').map(a => a.trim()).filter(Boolean);
            } else {
                updatedBook[field] = newValue;
            }
            
            performAuthenticatedUpdate(updatedBook);
            isEditing[field] = false; 
        };

        inputEl.addEventListener('blur', saveChanges);
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && field !== 'bookDescription') inputEl.blur();
            if (e.key === 'Escape') {
                isEditing[field] = false;
                renderPage();
                attachEditableListeners();
            }
        });
    };

    contentContainer.addEventListener('click', e => {
        if (e.target.id === 'cancel-highlights-btn') {
            isEditing.highlights = false;
            renderHighlights();
        }
        if (e.target.id === 'save-highlights-btn') {
            const textarea = document.getElementById('highlights-textarea');
            const newHighlights = textarea.value.split('\n')
                .map(line => line.trim().replace(/^- /, ''))
                .filter(Boolean);
            
            const updatedBook = { ...book, highlights: newHighlights };
            performAuthenticatedUpdate(updatedBook);
            isEditing.highlights = false;
        }
        if (e.target.id === 'cancel-log-btn') {
            isEditing.readingLog = false;
            renderReadingLog();
        }
        if (e.target.id === 'save-log-btn') {
            const updatedBook = { ...book };
            updatedBook.readingMedium = document.getElementById('reading-medium').value;
            updatedBook.startedOn = document.getElementById('started-on').value || null;
            updatedBook.finishedOn = document.getElementById('finished-on').value || null;
            performAuthenticatedUpdate(updatedBook);
            isEditing.readingLog = false;
        }
    });
    
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
            attachEditableListeners();
        } catch (error) {
            contentContainer.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
        }
    };

    // Password modal logic
    const passwordModal = document.getElementById('password-modal');
    if (passwordModal) {
        const passwordInput = document.getElementById('password-input');
        const rememberMeCheckbox = document.getElementById('remember-me');

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

        passwordModal.querySelector('#password-submit-btn').addEventListener('click', handleSubmit);
        passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit(); });
        
        passwordModal.querySelector('#password-cancel-btn').addEventListener('click', () => {
            closeModal(passwordModal);
            afterPasswordCallback = null;
        });
    }

    initializePage();
});

