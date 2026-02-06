import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BookListItem from '../components/BookListItem';
import RandomHighlight from '../components/RandomHighlight';
import HomeStats from '../components/HomeStats';

const LIMIT = 50;

const Home = ({ tagsMap }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    
    // Books State
    const [allBooks, setAllBooks] = useState([]);
    
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingList, setLoadingList] = useState(false);
    const [backgroundLoading, setBackgroundLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- Fetch Logic ---
    const fetchBookList = async (currentOffset, isReset = false) => {
        if (loadingList) return;
        setLoadingList(true);
        
        try {
            const endpoint = searchQuery 
                ? `/api/public?q=${encodeURIComponent(searchQuery)}&limit=${LIMIT}&offset=${currentOffset}`
                : `/api/list-books?limit=${LIMIT}&offset=${currentOffset}`;

            const res = await fetch(endpoint);
            
            if (res.ok) {
                const newBooks = await res.json();
                const parsedBooks = newBooks.map(book => {
                    let imageLinks = {};
                    if (typeof book.imageLinks === 'string') try { imageLinks = JSON.parse(book.imageLinks); } catch(e) {}
                    return { ...book, imageLinks, _isPartial: !searchQuery };
                });

                if (newBooks.length < LIMIT) setHasMore(false);
                else setHasMore(true);

                setAllBooks(prev => {
                    const combined = isReset ? parsedBooks : [...prev, ...parsedBooks];
                    // Dedup
                    return combined.filter((v,i,a)=>a.findIndex(v2=>(v2.id===v.id))===i);
                });
                setOffset(currentOffset + LIMIT);
                
                if (!searchQuery && parsedBooks.length > 0) {
                    fetchDetailsInBackground(parsedBooks.map(b => b.id));
                }

            } else {
                if (isReset && allBooks.length === 0) {}
            }
        } catch (e) {
            console.error(e);
            setError("Failed to load list.");
        } finally {
            setLoadingList(false);
        }
    };

    const fetchDetailsInBackground = async (ids) => {
        if (ids.length === 0) return;
        setBackgroundLoading(true);
        try {
            const res = await fetch(`/api/public?limit=${ids.length}&offset=${Math.max(0, offset - LIMIT)}`); 
            if (res.ok) {
                const details = await res.json();
                setAllBooks(prevBooks => {
                    const updateMap = new Map(details.map(d => [d.id, d]));
                    return prevBooks.map(book => {
                        if (updateMap.has(book.id)) {
                            const fullData = updateMap.get(book.id);
                            try { fullData.authors = JSON.parse(fullData.authors); } catch(e) { fullData.authors = []; }
                            try { fullData.tags = JSON.parse(fullData.tags); } catch(e) { fullData.tags = []; }
                            try { fullData.imageLinks = JSON.parse(fullData.imageLinks); } catch(e) { fullData.imageLinks = {}; }
                            return { ...fullData, _isPartial: false };
                        }
                        return book;
                    });
                });
            }
        } catch (e) {
            console.warn("Background enrichment failed", e);
        } finally {
            setBackgroundLoading(false);
        }
    };

    useEffect(() => {
        const delay = setTimeout(() => {
            setOffset(0);
            setHasMore(true);
            setAllBooks([]);
            fetchBookList(0, true);
        }, 300);
        return () => clearTimeout(delay);
    }, [searchQuery]);

    const handleBookClick = (book) => navigate(`/book/${book.id}`, { state: { book } });

    // --- Categorization ---
    const shelves = { currentlyReading: [], read: [], watchlist: [] };
    allBooks.forEach(b => {
        if (shelves[b.shelf]) shelves[b.shelf].push(b);
        else shelves.watchlist.push(b);
    });

    return (
        <div className="flex flex-col md:flex-row gap-6">
            
            {/* --- LEFT COLUMN: NAVIGATION / SEARCH --- */}
            <div className="w-full md:w-1/5 flex flex-col gap-6">
                <div className="border border-gray-400 p-2 bg-gray-50">
                    <div className="font-bold border-b border-gray-300 mb-2 pb-1 text-base">Search</div>
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full border border-gray-400 p-2 text-base"
                        placeholder="Keywords..."
                    />
                </div>

                <div className="border border-gray-400 p-2">
                    <div className="font-bold border-b border-gray-300 mb-2 pb-1 text-base">Shelves</div>
                    <ul className="text-sm list-square pl-5 space-y-1">
                        <li><a href="#reading">Reading Now</a> ({shelves.currentlyReading.length})</li>
                        <li><a href="#finished">Finished</a> ({shelves.read.length})</li>
                        <li><a href="#watchlist">To Read</a> ({shelves.watchlist.length})</li>
                    </ul>
                </div>

                {/* Tag Cloud Sim */}
                <div className="border border-gray-400 p-2">
                    <div className="font-bold border-b border-gray-300 mb-2 pb-1 text-base">Tags</div>
                    <div className="flex flex-wrap gap-1 text-xs">
                         {Array.from(tagsMap.values()).slice(0, 20).map(tag => (
                             <span key={tag.id} className="border border-gray-300 px-1 bg-white text-gray-700">{tag.name}</span>
                         ))}
                    </div>
                </div>
            </div>

            {/* --- CENTER COLUMN: FEED --- */}
            <div className="w-full md:w-1/2">
                {error && <div className="bg-red-100 border border-red-500 text-red-700 p-3 mb-4 text-sm">{error}</div>}
                
                {/* Reading Now Section */}
                {shelves.currentlyReading.length > 0 && (
                    <div className="mb-6">
                        <h2 className="bg-black text-white px-2 py-1 font-bold text-base mb-0" id="reading">READING NOW</h2>
                        <div className="border border-black border-t-0 p-2 grid grid-cols-1 gap-3 bg-white">
                             {shelves.currentlyReading.map(book => (
                                 <BookListItem key={book.id} book={book} tagsMap={tagsMap} onClick={() => handleBookClick(book)} isPartial={book._isPartial} />
                             ))}
                        </div>
                    </div>
                )}

                {/* Finished Section (Moved Up) */}
                {shelves.read.length > 0 && (
                    <div className="mb-6">
                        <h2 className="bg-gray-300 text-black border border-gray-400 px-2 py-1 font-bold text-base mb-0" id="finished">RECENTLY FINISHED</h2>
                        <div className="border border-gray-400 border-t-0 p-2 grid grid-cols-1 gap-3 bg-white">
                             {shelves.read.map(book => (
                                 <BookListItem key={book.id} book={book} tagsMap={tagsMap} onClick={() => handleBookClick(book)} isPartial={book._isPartial} />
                             ))}
                        </div>
                    </div>
                )}

                {/* To Read Section (Moved to End) */}
                {shelves.watchlist.length > 0 && (
                    <div className="mb-6">
                        <h2 className="bg-gray-300 text-black border border-gray-400 px-2 py-1 font-bold text-base mb-0" id="watchlist">TO READ</h2>
                        <div className="border border-gray-400 border-t-0 p-2 grid grid-cols-1 gap-3 bg-white">
                             {shelves.watchlist.map(book => (
                                 <BookListItem key={book.id} book={book} tagsMap={tagsMap} onClick={() => handleBookClick(book)} isPartial={book._isPartial} />
                             ))}
                        </div>
                    </div>
                )}

                {hasMore && (
                    <button 
                        onClick={() => fetchBookList(offset)} 
                        disabled={loadingList}
                        className="w-full border border-black bg-gray-100 p-3 font-bold text-sm hover:bg-gray-200"
                    >
                        {loadingList ? 'Loading...' : '[ Load More Entries ]'}
                    </button>
                )}
            </div>

            {/* --- RIGHT COLUMN: EXTRAS --- */}
            <div className="w-full md:w-1/4 flex flex-col gap-6">
                <RandomHighlight />
                
                <HomeStats />

                <div className="border border-gray-400 p-2 bg-yellow-50">
                    <div className="font-bold border-b border-gray-300 mb-2 pb-1 text-base">Site News</div>
                    <div className="text-xs space-y-2 max-h-60 overflow-y-auto">
                        <p><strong>2026-01-30</strong> - fix: implement advanced search and resolve book details/dashboard visibility issues</p>
                        <p><strong>2026-01-30</strong> - fix: resolve authors.join error and dashboard visibility</p>
                        <p><strong>2026-01-30</strong> - fix: dashboard table visibility and redesign book details page to match theme</p>
                        <p><strong>2026-01-30</strong> - feat: increase font size, reorder homepage sections, and add stats graph</p>
                        <p><strong>2026-01-30</strong> - fix: correct regex syntax error in dashboard component</p>
                        <p><strong>2026-01-30</strong> - refactor: complete redesign to text-heavy old-school dense layout</p>
                        <p><strong>2026-01-30</strong> - refactor: implement separated shelves in grid view and update dashboard/stats theme</p>
                        <p><strong>2026-01-30</strong> - feat: add dark mode support and grid view toggle</p>
                        <p><strong>2026-01-30</strong> - refactor: redesign to minimal Things 3 style for better performance</p>
                        <p><strong>2026-01-30</strong> - chore: add tailwindcss dependencies to package.json</p>
                    </div>
                </div>

                <div className="border border-gray-400 p-2">
                    <div className="font-bold border-b border-gray-300 mb-2 pb-1 text-base">Links</div>
                    <ul className="text-sm list-disc pl-5">
                        <li><a href="https://openlibrary.org">OpenLibrary</a></li>
                        <li><a href="https://gutenberg.org">Project Gutenberg</a></li>
                        <li><a href="https://standardebooks.org">Standard Ebooks</a></li>
                    </ul>
                </div>
            </div>

        </div>
    );
};

export default Home;