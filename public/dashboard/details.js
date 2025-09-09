document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const DETAILS_API_ENDPOINT = '/api/details-api';
    const UPDATE_API_ENDPOINT = '/api/books';
    const PWD_COOKIE = 'book-tracker-admin-pwd';

    // --- STATE ---
    let book = null;
    let afterPasswordCallback = null;

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
        if (passwordModal) { afterPasswordCallback = callback; openModal(passwordModal); } 
        else { showToast("Could not open password prompt.", "error"); }
    };
    
    // --- RENDERING ---
    const renderPage = () => {
        const skeletonLoader = document.getElementById('skeleton-loader');
        if(skeletonLoader) skeletonLoader.remove();

        const authors = Array.isArray(book.authors) ? book.authors.join(', ') : '';
        const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/160x240/e2e8f0/475569?text=N/A`;
        const subjects = Array.isArray(book.subjects) ? book.subjects : [];
        const highlightsMarkdown = (book.highlights || []).map(h => `- ${h}`).join('\n');
        
        contentContainer.innerHTML = `
            <a href="/dashboard" class="text-blue-600 text-sm font-semibold mb-8 inline-block">&larr; Back to Dashboard</a>
            <div class="flex flex-col sm:flex-row gap-8 items-start">
                <div class="sm:w-1/3 text-center sm:text-left flex-shrink-0">
                    <img src="${coverUrl}" alt="Cover of ${book.title}" class="w-40 h-auto object-cover rounded-lg shadow-lg mx-auto">
                </div>
                <div class="sm:w-2/3 space-y-2">
                    <h1 class="text-3xl font-bold tracking-tight text-gray-900 editable" data-field="title">${book.title}</h1>
                    <p class="text-lg text-gray-600 editable" data-field="authors">${authors}</p>
                    <div class="pt-4 text-sm text-gray-500 space-y-1">
                        <p><strong>Publisher:</strong> <span class="editable" data-field="publisher">${book.publisher || 'N/A'}</span></p>
                        <p><strong>Published:</strong> <span class="editable" data-field="fullPublishDate">${book.fullPublishDate || 'N/A'}</span></p>
                        <p><strong>Pages:</strong> <span class="editable" data-field="pageCount">${book.pageCount || 'N/A'}</span></p>
                    </div>
                    <div class="pt-2 flex flex-wrap gap-2">
                        ${subjects.map(s => `<span class="bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full">${s}</span>`).join('')}
                    </div>
                </div>
            </div>

            <section class="mt-12">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">Highlights</h2>
                <div id="highlights-container" class="bg-white rounded-xl border p-6">
                    <div id="highlights-view" class="prose max-w-none">
                        ${book.highlights && book.highlights.length > 0 ? book.highlights.map(h => `<li class="highlight-item">${h}</li>`).join('') : '<p class="text-gray-500">No highlights yet. Click edit to add some.</p>'}
                    </div>
                    <div id="highlights-edit" class="hidden">
                        <textarea id="highlights-textarea" class="w-full h-64 p-3 border rounded-lg bg-gray-50 text-sm font-mono" placeholder="- Type a highlight per line...">${highlightsMarkdown}</textarea>
                        <p class="text-xs text-gray-500 mt-1">Each item in a Markdown list (- item) will become a separate highlight.</p>
                    </div>
                    <div class="flex justify-end gap-2 mt-4">
                        <button id="edit-highlights-btn" class="text-sm font-semibold text-blue-600 hover:underline">Edit</button>
                        <div id="edit-controls" class="hidden">
                            <button id="cancel-highlights-btn" class="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button>
                            <button id="save-highlights-btn" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">Save</button>
                        </div>
                    </div>
                </div>
            </section>
        `;
    };

    const makeEditable = (field) => {
        const el = contentContainer.querySelector(`[data-field="${field}"]`);
        if (!el) return;

        el.addEventListener('click', () => {
            const currentValue = book[field] || '';
            const inputType = field === 'pageCount' ? 'number' : 'text';
            const input = document.createElement('input');
            input.type = inputType;
            input.className = "w-full text-lg p-1 border rounded";
            input.value = Array.isArray(currentValue) ? currentValue.join(', ') : currentValue;
            
            el.replaceWith(input);
            input.focus();

            const save = () => {
                const newValue = input.value;
                if (newValue !== currentValue) {
                    const updatedBook = { ...book };
                    updatedBook[field] = field === 'authors' ? newValue.split(',').map(a => a.trim()) : newValue;
                    
                    requestPassword(async (password) => {
                        const { success, data } = await performAuthenticatedAction({ action: 'update', data: updatedBook }, password);
                        if (success) {
                            book = parseBook(data.book);
                            renderPage();
                            attachAllEditableListeners();
                        } else {
                            input.replaceWith(el); // Revert on failure
                        }
                    });
                } else {
                     input.replaceWith(el);
                }
            };
            
            input.addEventListener('blur', save);
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
        });
    };

    const attachAllEditableListeners = () => {
        ['title', 'authors', 'publisher', 'fullPublishDate', 'pageCount'].forEach(makeEditable);
    };

    const performAuthenticatedAction = async (payload, password) => {
        try {
            const response = await fetch(UPDATE_API_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, password })});
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');
            showToast(result.message || 'Action successful!', 'success');
            return {success: true, data: result};
        } catch (error) {
            showToast(error.message, "error");
            return {success: false};
        }
    };
    
    // --- EVENT LISTENERS ---
    contentContainer.addEventListener('click', (e) => {
        if (e.target.id === 'edit-highlights-btn') {
            document.getElementById('highlights-view').classList.add('hidden');
            document.getElementById('highlights-edit').classList.remove('hidden');
            e.target.classList.add('hidden');
            document.getElementById('edit-controls').classList.remove('hidden');
        }
        if (e.target.id === 'cancel-highlights-btn') {
            document.getElementById('highlights-view').classList.remove('hidden');
            document.getElementById('highlights-edit').classList.add('hidden');
            document.getElementById('edit-highlights-btn').classList.remove('hidden');
            document.getElementById('edit-controls').classList.add('hidden');
        }
        if (e.target.id === 'save-highlights-btn') {
            const textarea = document.getElementById('highlights-textarea');
            const newHighlights = textarea.value.split('\n').map(l => l.trim().replace(/^- /, '')).filter(l => l);
            const updatedBook = { ...book, highlights: newHighlights };
            
            requestPassword(async (password) => {
                const { success, data } = await performAuthenticatedAction({ action: 'update', data: updatedBook }, password);
                if (success) {
                    book = parseBook(data.book);
                    renderPage();
                    attachAllEditableListeners();
                }
            });
        }
    });

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
            attachAllEditableListeners();

        } catch (error) {
            console.error(error);
            contentContainer.innerHTML = `<p class="text-center text-red-500">Could not load book details.</p>`;
        }
    };

    initializePage();
    
    const passwordModal = document.getElementById('password-modal');
    if (passwordModal) {
        const handleSubmit = () => {
            const password = document.getElementById('password-input').value;
            if (!password) { showToast("Password cannot be empty.", "error"); return; }
            if (document.getElementById('remember-me').checked) { setCookie(PWD_COOKIE, password, 30); }
            closeModal(passwordModal);
            if (afterPasswordCallback) { afterPasswordCallback(password); }
            document.getElementById('password-input').value = '';
            afterPasswordCallback = null;
        };
        document.getElementById('password-submit-btn').addEventListener('click', handleSubmit);
        document.getElementById('password-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit(); });
        document.getElementById('password-cancel-btn').addEventListener('click', () => { closeModal(passwordModal); afterPasswordCallback = null; });
    }
});
