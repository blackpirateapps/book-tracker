document.addEventListener('DOMContentLoaded', () => {
    const STATS_API_ENDPOINT = '/api/stats';

    // DOM Elements
    const yearSelect = document.getElementById('year-select');
    const yearlySkeleton = document.getElementById('yearly-skeleton');
    const yearlyContent = document.getElementById('yearly-content');
    const yearlySummaryStats = document.getElementById('yearly-summary-stats');
    const yearlyBooksGrid = document.getElementById('yearly-books-grid');
    const noBooksMessage = document.getElementById('no-books-message');
    const authorsSkeleton = document.getElementById('authors-skeleton');
    const authorsList = document.getElementById('authors-list');
    
    let statsData = null; // To store the fetched data globally on this page

    /**
     * Renders the statistics for a specific year.
     * @param {string} year - The year to display stats for.
     */
    const renderYearlyStats = (year) => {
        if (!statsData || !statsData.booksByYear) return;
        
        const booksForYear = statsData.booksByYear[year] || [];
        const totalBooks = booksForYear.length;
        const totalPages = booksForYear.reduce((sum, book) => sum + (book.pageCount || 0), 0);
        
        // Update summary stats
        yearlySummaryStats.innerHTML = `
            <div>
                <div class="text-3xl font-bold text-gray-800">${totalBooks}</div>
                <div class="text-sm text-gray-500">Books Read</div>
            </div>
            <div>
                <div class="text-3xl font-bold text-gray-800">${totalPages.toLocaleString()}</div>
                <div class="text-sm text-gray-500">Pages Read</div>
            </div>
             <div>
                <div class="text-3xl font-bold text-gray-800">${statsData.averageBooksPerYear}</div>
                <div class="text-sm text-gray-500">Avg Books/Year</div>
            </div>
        `;
        
        // Populate the books grid
        if (totalBooks > 0) {
            yearlyBooksGrid.innerHTML = booksForYear.map(book => {
                const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/200x300/e2e8f0/475569?text=N/A`;
                const authors = book.authors.join(', ') || 'Unknown Author';
                return `
                    <a href="/details.html?id=${book.id}" class="group">
                        <div class="aspect-[2/3] w-full overflow-hidden rounded-lg bg-gray-100">
                            <img src="${coverUrl}" alt="Cover of ${book.title}" class="w-full h-full object-cover object-center group-hover:opacity-75 transition-opacity">
                        </div>
                        <h3 class="mt-2 text-sm font-semibold text-gray-800 truncate">${book.title}</h3>
                        <p class="mt-1 text-xs text-gray-500 truncate">${authors}</p>
                    </a>
                `;
            }).join('');
            yearlyBooksGrid.classList.remove('hidden');
            noBooksMessage.classList.add('hidden');
        } else {
            yearlyBooksGrid.classList.add('hidden');
            noBooksMessage.classList.remove('hidden');
        }
    };

    /**
     * Renders the list of most read authors.
     */
    const renderAuthorStats = () => {
        if (!statsData || !statsData.authorStats) return;

        const authorStats = statsData.authorStats;
        authorsSkeleton.remove();
        
        if (authorStats.length > 0) {
            authorsList.innerHTML = authorStats.map(author => `
                <div class="p-4 border-b last:border-b-0">
                    <div class="flex justify-between items-center">
                        <h3 class="font-semibold text-gray-800">${author.name}</h3>
                        <span class="text-sm font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">${author.count} book${author.count > 1 ? 's' : ''}</span>
                    </div>
                    <ul class="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
                        ${author.books.map(book => `<li>${book.title} (${book.year})</li>`).join('')}
                    </ul>
                </div>
            `).join('');
        } else {
            authorsList.innerHTML = `<p class="p-8 text-center text-gray-500">No author data to display.</p>`;
        }
    };

    /**
     * Fetches all stats from the API and initializes the page.
     */
    const initializePage = async () => {
        try {
            const response = await fetch(STATS_API_ENDPOINT);
            if (!response.ok) throw new Error('Failed to fetch stats from the API.');
            statsData = await response.json();

            const years = Object.keys(statsData.booksByYear).sort((a, b) => b - a);
            
            if (years.length > 0) {
                // Populate dropdown
                yearSelect.innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join('');
                
                // Add change listener
                yearSelect.addEventListener('change', (e) => renderYearlyStats(e.target.value));
                
                // Initial render for the latest year
                renderYearlyStats(years[0]);
            } else {
                 // Handle case with no read books at all
                yearlySummaryStats.innerHTML = `<p class="text-center text-gray-500 col-span-full">Start reading to see your stats here!</p>`;
                yearlyBooksGrid.classList.add('hidden');
            }
            
            renderAuthorStats();

            // Hide skeleton and show content
            yearlySkeleton.remove();
            yearlyContent.classList.remove('hidden');

        } catch (error) {
            console.error(error);
            yearlySkeleton.innerHTML = `<p class="text-red-500 text-center">${error.message}</p>`;
            authorsSkeleton.innerHTML = `<p class="text-red-500 text-center">Could not load author stats.</p>`;
        }
    };

    initializePage();
});
