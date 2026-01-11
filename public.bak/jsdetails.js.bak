// public/details.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const DETAILS_API_ENDPOINT = '/api/highlights'; // API to get full book details by ID
    const TAGS_API_ENDPOINT = '/api/tags';
    const TAGS_CACHE_KEY = 'all-tags-cache'; // Use the same cache key as script.js for consistency

    // --- State ---
    let allTagsMap = new Map();

    // --- DOM Elements ---
    const detailsContainer = document.getElementById('public-details-content');
    const skeletonLoader = document.getElementById('skeleton-loader');

    // --- Helper Functions ---

    // Toast function (copied from script.js)
    const showToast = (message, type = 'success') => {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        if (!toast || !toastMessage) return;
        toastMessage.textContent = message;
        toast.className = `fixed bottom-5 right-5 text-white py-2 px-5 rounded-lg shadow-xl opacity-0 transition-opacity duration-300 z-50 ${type === 'success' ? 'bg-slate-900' : 'bg-red-600'}`;
        toast.classList.remove('opacity-0');
        setTimeout(() => toast.classList.add('opacity-0'), 3000);
    };

    // Fetch All Tags function (copied and adapted from script.js)
    const fetchAllTags = async (forceRefresh = false) => {
        // Check session storage first for faster same-session loads
        const sessionTags = sessionStorage.getItem(TAGS_CACHE_KEY);
         if (sessionTags && !forceRefresh) {
             try {
                const tags = JSON.parse(sessionTags);
                allTagsMap = new Map(tags.map(tag => [tag.id, tag]));
                return true;
             } catch(e) { sessionStorage.removeItem(TAGS_CACHE_KEY); }
         }
        // Then check local storage
        const cachedTags = localStorage.getItem(TAGS_CACHE_KEY);
        if (cachedTags && !forceRefresh) {
            try {
                const tags = JSON.parse(cachedTags);
                allTagsMap = new Map(tags.map(tag => [tag.id, tag]));
                 sessionStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(tags)); // Store in session too
                return true;
            } catch (e) { localStorage.removeItem(TAGS_CACHE_KEY); }
        }
        // Fetch if not cached
        try {
            const response = await fetch(TAGS_API_ENDPOINT);
            if (!response.ok) throw new Error('Failed to fetch tags.');
            const tags = await response.json();
            allTagsMap = new Map(tags.map(tag => [tag.id, tag]));
            localStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(tags)); // Cache in local
            sessionStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(tags)); // Cache in session
            return true;
        } catch (error) {
            console.error('Error fetching tags:', error);
            showToast('Could not load tag information.', 'error'); // Show error to user
            return false;
        }
    };

    // --- Rendering Function ---
    const renderDetails = (book) => {
        if (!detailsContainer) return;
        if (skeletonLoader) skeletonLoader.style.display = 'none'; // Hide skeleton

        if (!book) {
            detailsContainer.innerHTML = `<a href="/" class="text-blue-600 mb-8 inline-block hover:underline">&larr; Back to Library</a><p class="text-center text-gray-500">Book not found.</p>`;
            return;
        }

        // Safely parse JSON fields fetched from the API
        try { book.authors = JSON.parse(book.authors || '[]'); } catch (e) { book.authors = Array.isArray(book.authors) ? book.authors : []; }
        try { book.imageLinks = JSON.parse(book.imageLinks || '{}'); } catch (e) { book.imageLinks = typeof book.imageLinks === 'object' ? book.imageLinks : {}; }
        try { book.highlights = JSON.parse(book.highlights || '[]'); } catch (e) { book.highlights = []; }
        try { book.tags = JSON.parse(book.tags || '[]'); } catch (e) { book.tags = []; }
        book.readingProgress = parseInt(book.readingProgress || 0, 10);

        const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/200x300/e2e8f0/475569?text=N/A`;
        const authors = book.authors.join(', ') || 'Unknown Author';

        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            const date = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
            if (isNaN(date)) return dateString;
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
        const startedDate = formatDate(book.startedOn);
        const finishedDate = formatDate(book.finishedOn);

        let durationHTML = '';
        if (book.startedOn && book.finishedOn) {
            try {
                const diffTime = Math.abs(new Date(book.finishedOn + 'T00:00:00') - new Date(book.startedOn + 'T00:00:00'));
                const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                durationHTML = `
                 <div class="flex items-center text-sm text-gray-600">
                     <svg class="w-4 h-4 mr-2 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                     Took ${diffDays} day${diffDays !== 1 ? 's' : ''} to finish
                 </div>`;
            } catch(e) { console.error("Error calculating duration", e); }
        }

        let tagsHTML = '<p class="text-sm text-gray-500">No tags assigned.</p>';
        if (book.tags && Array.isArray(book.tags) && book.tags.length > 0) {
            const tagSpans = book.tags.map(tagId => {
                 const tagInfo = allTagsMap.get(tagId);
                 if (tagInfo) {
                     const bgColor = `${tagInfo.color}20`;
                     const textColor = tagInfo.color;
                     return `<span class="inline-block text-xs font-medium px-2.5 py-1 rounded-full mr-2 mb-2" style="background-color: ${bgColor}; color: ${textColor};">${tagInfo.name}</span>`;
                 }
                 return '';
            }).filter(Boolean);
             if (tagSpans.length > 0) {
                tagsHTML = `<div class="flex flex-wrap items-center -mb-2">${tagSpans.join('')}</div>`; // Added -mb-2 for spacing
             }
        }

        let highlightsHTML = book.highlights?.length > 0
            ? `<div class="space-y-3">${book.highlights.map(h => `<blockquote class="highlight-item text-gray-800">${h}</blockquote>`).join('')}</div>` // Improved styling
            : '<p class="text-sm text-gray-500">No highlights recorded for this book.</p>';

        const descriptionHTML = book.bookDescription
            ? `<p class="text-gray-700 leading-relaxed whitespace-pre-wrap">${book.bookDescription}</p>`
            : '<p class="text-sm text-gray-500">No description available.</p>';

        let progressHTML = '';
        if(book.shelf === 'currentlyReading') {
            progressHTML = `
            <div class="mt-4">
                <div class="flex items-center justify-between text-sm mb-1">
                    <span class="text-gray-600 font-medium">Progress</span>
                    <span class="text-blue-600 font-bold">${book.readingProgress}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${book.readingProgress}%"></div>
                </div>
            </div>
            `;
        }

        detailsContainer.innerHTML = `
            <a href="/" class="text-blue-600 mb-8 inline-block hover:underline text-sm font-medium">&larr; Back to Library</a>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                <div class="md:col-span-1">
                     <img src="${coverUrl}" alt="Cover of ${book.title}" class="w-full h-auto object-cover rounded-lg shadow-lg mx-auto mb-6 border border-gray-100">
                     <div class="space-y-2 text-center">
                         <h1 class="text-2xl lg:text-3xl font-bold tracking-tight text-gray-900">${book.title}</h1>
                         <p class="text-md text-gray-600">${authors}</p>
                         ${progressHTML}
                     </div>
                </div>

                <div class="md:col-span-2 space-y-6">
                     <div class="bg-white rounded-xl border border-gray-200/75 p-6 shadow-sm">
                         <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <svg class="w-5 h-5 mr-2 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                            Reading Log
                         </h2>
                         <div class="space-y-2">
                             <div class="flex items-center text-sm text-gray-600">
                                 <svg class="w-4 h-4 mr-2 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Medium: <span class="font-medium text-gray-800 ml-1">${book.readingMedium || 'N/A'}</span>
                             </div>
                             <div class="flex items-center text-sm text-gray-600">
                                  <svg class="w-4 h-4 mr-2 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                 Started: <span class="font-medium text-gray-800 ml-1">${startedDate}</span>
                             </div>
                              <div class="flex items-center text-sm text-gray-600">
                                  <svg class="w-4 h-4 mr-2 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Finished: <span class="font-medium text-gray-800 ml-1">${finishedDate}</span>
                             </div>
                             ${durationHTML}
                         </div>
                     </div>

                     <div class="bg-white rounded-xl border border-gray-200/75 p-6 shadow-sm">
                         <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <svg class="w-5 h-5 mr-2 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Metadata
                         </h2>
                         <div class="space-y-2">
                            <div class="flex items-center text-sm text-gray-600">
                                <svg class="w-4 h-4 mr-2 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                Publisher: <span class="font-medium text-gray-800 ml-1">${book.publisher || 'N/A'}</span>
                             </div>
                             <div class="flex items-center text-sm text-gray-600">
                                 <svg class="w-4 h-4 mr-2 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                 Published: <span class="font-medium text-gray-800 ml-1">${formatDate(book.fullPublishDate || book.publishedDate)}</span>
                             </div>
                             <div class="flex items-center text-sm text-gray-600">
                                  <svg class="w-4 h-4 mr-2 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                 Pages: <span class="font-medium text-gray-800 ml-1">${book.pageCount || 'N/A'}</span>
                             </div>
                         </div>
                     </div>

                     <div class="bg-white rounded-xl border border-gray-200/75 p-6 shadow-sm">
                        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <svg class="w-5 h-5 mr-2 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
                            Tags
                        </h2>
                        ${tagsHTML}
                     </div>

                     <div class="bg-white rounded-xl border border-gray-200/75 p-6 shadow-sm">
                        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                           <svg class="w-5 h-5 mr-2 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                           Description
                        </h2>
                        ${descriptionHTML}
                     </div>

                     <div class="bg-white rounded-xl border border-gray-200/75 p-6 shadow-sm">
                        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <svg class="w-5 h-5 mr-2 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                            Highlights
                        </h2>
                        ${highlightsHTML}
                     </div>
                </div>
            </div>
        `;
    };

    // --- Initialization ---
    const loadBookDetails = async () => {
        if (!detailsContainer) {
             console.error("Details container not found");
             return;
        }

        // Fetch tags needed to display tag names
        const tagsSuccess = await fetchAllTags();
        // Don't necessarily stop if tags fail, just show toast

        const bookId = new URLSearchParams(window.location.search).get('id');
        if (!bookId) {
            if (skeletonLoader) skeletonLoader.style.display = 'none';
            renderDetails(null);
            return;
        }

        try {
            // Use the correct details endpoint that returns the full book object
            const response = await fetch(`${DETAILS_API_ENDPOINT}?id=${bookId}`);
            if (!response.ok) throw new Error(`Book not found (status ${response.status}).`);
            const book = await response.json();
            renderDetails(book);
        } catch (error) {
            console.error(error);
             if (skeletonLoader) skeletonLoader.style.display = 'none';
            detailsContainer.innerHTML = `<a href="/" class="text-blue-600 mb-8 inline-block hover:underline">&larr; Back to Library</a><p class="text-center text-red-500">Could not load book details: ${error.message}</p>`;
        }
    };

    loadBookDetails(); // Initialize the page load

});