import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, Clock, Search, Loader2, LayoutGrid, List as ListIcon } from 'lucide-react';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';
import RandomHighlight from '../components/RandomHighlight';
import BookListItem from '../components/BookListItem';

const LIMIT = 50;

const Home = ({ tagsMap }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
    
    // Books State
    const [allBooks, setAllBooks] = useState([]);
    
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingList, setLoadingList] = useState(false);
    const [backgroundLoading, setBackgroundLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- 1. Fetch Lightweight List (Fast) ---
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
                    return combined.filter((v,i,a)=>a.findIndex(v2=>(v2.id===v.id))===i);
                });
                
                setOffset(currentOffset + LIMIT);

                if (!searchQuery && parsedBooks.length > 0) {
                    fetchDetailsInBackground(parsedBooks.map(b => b.id));
                }

            } else {
                if (isReset && allBooks.length === 0) { /* Handle empty state if needed */ }
            }
        } catch (e) {
            console.error(e);
            setError("Failed to load list.");
        } finally {
            setLoadingList(false);
        }
    };

    // --- 2. Fetch Details in Background ---
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

    // --- Effects ---
    useEffect(() => {
        const delay = setTimeout(() => {
            setOffset(0);
            setHasMore(true);
            setAllBooks([]);
            fetchBookList(0, true);
        }, 300);
        return () => clearTimeout(delay);
    }, [searchQuery]);

    const loadMore = useCallback(() => {
        if (hasMore && !loadingList) {
            fetchBookList(offset, false);
        }
    }, [hasMore, loadingList, offset]);

    const handleBookClick = (book) => navigate(`/book/${book.id}`, { state: { book } });

    // --- Grouping Logic ---
    const getFlattenedData = () => {
        // If Grid View, we don't use headers in the data array because VirtuosoGrid doesn't support heterogeneous items easily like Virtuoso
        // So for Grid, we just return the books.
        // For List, we keep headers.
        
        if (viewMode === 'grid') {
            return allBooks;
        }

        if (searchQuery) return allBooks; 

        const shelves = { currentlyReading: [], read: [], watchlist: [] };
        allBooks.forEach(b => {
            if (shelves[b.shelf]) shelves[b.shelf].push(b);
            else shelves.watchlist.push(b);
        });

        const flatList = [];
        if (shelves.currentlyReading.length > 0) {
            flatList.push({ type: 'header', title: 'Reading Now', count: shelves.currentlyReading.length });
            flatList.push(...shelves.currentlyReading);
        }
        if (shelves.read.length > 0) {
            flatList.push({ type: 'header', title: 'Recently Finished', count: shelves.read.length });
            flatList.push(...shelves.read);
        }
        if (shelves.watchlist.length > 0) {
            flatList.push({ type: 'header', title: 'To Read', count: shelves.watchlist.length });
            flatList.push(...shelves.watchlist);
        }
        return flatList;
    };

    const displayData = getFlattenedData();

    const renderListItem = (index, item) => {
        if (item.type === 'header') {
            return (
                <div className="flex items-center gap-2 mt-8 mb-3 px-1">
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">{item.title}</h2>
                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center">
                        {item.count}
                    </span>
                </div>
            );
        }
        return (
            <BookListItem 
                key={item.id} 
                book={item} 
                shelf={item.shelf} 
                tagsMap={tagsMap} 
                onClick={() => handleBookClick(item)} 
                isPartial={item._isPartial} 
                viewMode="list"
            />
        );
    };
    
    const renderGridItem = (index) => {
        const item = displayData[index];
        return (
            <div className="p-1.5 pb-3"> {/* Wrapper for spacing */}
                <BookListItem 
                    key={item.id} 
                    book={item} 
                    shelf={item.shelf} 
                    tagsMap={tagsMap} 
                    onClick={() => handleBookClick(item)} 
                    isPartial={item._isPartial} 
                    viewMode="grid"
                />
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col">
            {/* Controls Bar */}
            <div className="flex gap-3 mb-6">
                <div className="relative flex-grow group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-slate-400" />
                    </div>
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 minimal-input text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-800"
                        placeholder="Search library..."
                    />
                </div>
                
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        title="List View"
                    >
                        <ListIcon size={18} />
                    </button>
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        title="Grid View"
                    >
                        <LayoutGrid size={18} />
                    </button>
                </div>
            </div>

            {!searchQuery && <RandomHighlight />}
            
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    {error}
                </div>
            )}

            <div className="flex-grow min-h-0"> {/* min-h-0 is crucial for flex child scroll */}
                {viewMode === 'list' ? (
                    <Virtuoso
                        useWindowScroll
                        data={displayData}
                        endReached={loadMore}
                        itemContent={renderListItem}
                        components={{
                            Footer: () => loadingList ? (
                                <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2 text-sm">
                                    <Loader2 size={16} className="animate-spin" />
                                </div>
                            ) : <div className="h-10" />
                        }}
                    />
                ) : (
                    <VirtuosoGrid
                        useWindowScroll
                        totalCount={displayData.length}
                        endReached={loadMore}
                        itemContent={renderGridItem}
                        listClassName="grid grid-cols-2 sm:grid-cols-3 gap-2"
                        components={{
                            Footer: () => loadingList ? (
                                <div className="py-8 col-span-full text-center text-slate-400 flex items-center justify-center gap-2 text-sm">
                                    <Loader2 size={16} className="animate-spin" />
                                </div>
                            ) : <div className="h-10 col-span-full" />
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default Home;