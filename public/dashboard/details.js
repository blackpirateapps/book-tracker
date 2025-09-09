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
                saveBtn.querySelector('.loader-spinner')?.style.display = 'inline-block';
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
                isEditing = {}; // Reset all editing states
                renderPage();
                attachActionListeners();

            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                if(saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.querySelector('.loader-spinner')?.style.display = 'none';
                }
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

    const renderReadingLog = () => { /* ... same as before ... */ };
    const renderDescription = () => { /* similar implementation to main info */ };
    const renderHighlights = () => { /* ... same as before ... */ };

    const attachActionListeners = () => {
        // Main Info Section
        document.getElementById('edit-main-info-btn')?.addEventListener('click', () => { isEditing.mainInfo = true; renderMainInfo(); });
        document.getElementById('cancel-main-info-btn')?.addEventListener('click', () => { isEditing.mainInfo = false; renderMainInfo(); });
        document.getElementById('save-main-info-btn')?.addEventListener('click', (e) => {
            const updatedBook = { ...book };
            updatedBook.title = document.getElementById('edit-title').value;
            updatedBook.authors = document.getElementById('edit-authors').value.split(',').map(a => a.trim()).filter(Boolean);
            updatedBook.publisher = document.getElementById('edit-publisher').value;
            updatedBook.fullPublishDate = document.getElementById('edit-fullPublishDate').value;
            updatedBook.pageCount = document.getElementById('edit-pageCount').value;
            performAuthenticatedUpdate(updatedBook, e.currentTarget);
        });

        // Other sections
        document.getElementById('edit-highlights-btn')?.addEventListener('click', () => { isEditing.highlights = true; renderHighlights(); });
        document.getElementById('edit-log-btn')?.addEventListener('click', () => { isEditing.readingLog = true; renderReadingLog(); });
        document.getElementById('edit-description-btn')?.addEventListener('click', () => { isEditing.description = true; renderDescription(); });
    };
    
    contentContainer.addEventListener('click', e => { /* ... event delegation for highlights, log, description save/cancel ... */});
    
    const initializePage = async () => { /* ... same as before, but calls attachActionListeners ... */ };
    
    // Password modal logic (CORRECTED)
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

