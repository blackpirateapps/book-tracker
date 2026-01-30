import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, Clock, Search, Loader2 } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import RandomHighlight from '../components/RandomHighlight';
import BookListItem from '../components/BookListItem';

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
        if (searchQuery) return allBooks; 

        const shelves = { currentlyReading: [], read: [], watchlist: [] };
        allBooks.forEach(b => {
            if (shelves[b.shelf]) shelves[b.shelf].push(b);
            else shelves.watchlist.push(b);
        });

        const flatList = [];
        if (shelves.currentlyReading.length > 0) {
            flatList.push({ type: 'header', title: 'Reading Now', icon: BookOpen, count: shelves.currentlyReading.length, color: 'text-indigo-600' });
            flatList.push(...shelves.currentlyReading);
        }
        if (shelves.read.length > 0) {
            flatList.push({ type: 'header', title: 'Recently Finished', icon: CheckCircle2, count: shelves.read.length, color: 'text-emerald-600' });
            flatList.push(...shelves.read);
        }
        if (shelves.watchlist.length > 0) {
            flatList.push({ type: 'header', title: 'To Read', icon: Clock, count: shelves.watchlist.length, color: 'text-amber-600' });
            flatList.push(...shelves.watchlist);
        }
        return flatList;
    };

    const displayData = getFlattenedData();

    const renderItem = (index, item) => {
        if (item.type === 'header') {
            const Icon = item.icon;
            return (
                <div className="flex items-center gap-2 mt-8 mb-4 pb-2 border-b border-black/5">
                    <Icon size={18} className={item.color} />
                    <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">{item.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
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
            />
        );
    };

    return (
        <div className="h-full flex flex-col">
            {/* Search Bar */}
            <div className="relative mb-8 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search size={18} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 glass-input rounded-xl text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    placeholder="Search by title, author, or keyword..."
                />
            </div>

            {!searchQuery && <RandomHighlight />}
            
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    {error}
                </div>
            )}

            <div className="flex-grow">
                <Virtuoso
                    useWindowScroll
                    data={displayData}
                    endReached={loadMore}
                    itemContent={renderItem}
                    components={{
                        Footer: () => loadingList ? (
                            <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2 text-sm">
                                <Loader2 size={16} className="animate-spin" /> Loading library...
                            </div>
                        ) : <div className="h-10" />
                    }}
                />
            </div>
        </div>
    );
};

export default Home;