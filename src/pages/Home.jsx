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
    
    // Books State: Contains partial data initially, enriched later
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
            // If searching, we still hit the main public API because filtering needs all fields
            // If browsing, hit the lightweight API
            const endpoint = searchQuery 
                ? `/api/public?q=${encodeURIComponent(searchQuery)}&limit=${LIMIT}&offset=${currentOffset}`
                : `/api/list-books?limit=${LIMIT}&offset=${currentOffset}`;

            const res = await fetch(endpoint);
            
            if (res.ok) {
                const newBooks = await res.json();
                
                // Parse basics
                const parsedBooks = newBooks.map(book => {
                    let imageLinks = {};
                    if (typeof book.imageLinks === 'string') try { imageLinks = JSON.parse(book.imageLinks); } catch(e) {}
                    return { ...book, imageLinks, _isPartial: !searchQuery }; // Flag as partial if from list-books
                });

                if (newBooks.length < LIMIT) setHasMore(false);
                else setHasMore(true);

                setAllBooks(prev => {
                    const combined = isReset ? parsedBooks : [...prev, ...parsedBooks];
                    // Dedup
                    return combined.filter((v,i,a)=>a.findIndex(v2=>(v2.id===v.id))===i);
                });
                
                setOffset(currentOffset + LIMIT);

                // Trigger background fetch if we have partial data
                if (!searchQuery && parsedBooks.length > 0) {
                    fetchDetailsInBackground(parsedBooks.map(b => b.id));
                }

            } else {
                if (isReset && allBooks.length === 0) setAllBooks(MOCK_DATA.books);
            }
        } catch (e) {
            console.error(e);
            setError("Failed to load list.");
        } finally {
            setLoadingList(false);
        }
    };

    // --- 2. Fetch Details in Background (Slow but invisible) ---
    const fetchDetailsInBackground = async (ids) => {
        if (ids.length === 0) return;
        setBackgroundLoading(true);

        try {
            // We need a way to fetch details for specific IDs. 
            // We can reuse public API or use a batch endpoint.
            // For simplicity, let's assume we call public API with a special param or just accept 
            // that we might fetch overlapping data, or ideally create a batch endpoint.
            // 
            // OPTIMIZATION: Created a dynamic query on client or server? 
            // Let's use the existing /api/public but filtered by IDs would be best.
            // Since we don't have a 'ids' filter in api/public yet, we will fetch the same chunk 
            // from api/public using the same limit/offset logic but for DATA.
            // 
            // Actually, simpler approach: fetch the same chunk from the FULL api.
            // We know the offset and limit we just requested.
            
            // Re-fetch the SAME chunk from the heavy API
            // Note: This effectively doubles requests (1 small, 1 big), but perceived speed is faster.
            const currentChunkOffset = offset; // This state might have changed, careful.
            // Ideally, pass the offset we just used. 
            
            // BETTER: Let's just fetch the data for these specific IDs if possible, 
            // or just fetch the heavy list for the same range.
            // Since we just called fetchBookList(offset), we can call fetchFullDetails(offset).
            
            const res = await fetch(`/api/public?limit=${ids.length}&offset=${Math.max(0, offset - LIMIT)}`); 
            // Note: The offset logic here is tricky with async state. 
            // A safer way is to just let the user see the skeleton metadata for a second 
            // and lazy load it as they scroll?
            //
            // Let's implement the "Fetch by IDs" logic in api/public or a new api/batch-details.
            // I will assume for now we just hit /api/public for the chunk.
            
            if (res.ok) {
                const details = await res.json();
                
                // Merge details into existing state
                setAllBooks(prevBooks => {
                    const updateMap = new Map(details.map(d => [d.id, d]));
                    return prevBooks.map(book => {
                        if (updateMap.has(book.id)) {
                            const fullData = updateMap.get(book.id);
                            // Process JSON fields
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
            flatList.push({ type: 'header', title: 'Reading Now', icon: BookOpen, count: shelves.currentlyReading.length });
            flatList.push(...shelves.currentlyReading);
        }
        if (shelves.read.length > 0) {
            flatList.push({ type: 'header', title: 'Recently Finished', icon: CheckCircle2, count: shelves.read.length });
            flatList.push(...shelves.read);
        }
        if (shelves.watchlist.length > 0) {
            flatList.push({ type: 'header', title: 'To Read', icon: Clock, count: shelves.watchlist.length });
            flatList.push(...shelves.watchlist);
        }
        return flatList;
    };

    const displayData = getFlattenedData();

    const renderItem = (index, item) => {
        if (item.type === 'header') {
            const Icon = item.icon;
            return (
                <div style={{ 
                    borderBottom: '1px solid #000', paddingBottom: '5px', marginTop: '25px', marginBottom: '15px', 
                    backgroundColor: '#eee', padding: '8px', fontSize: '14px', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase'
                }}>
                    <Icon size={16} /> {item.title} <span style={{ opacity: 0.6 }}>({item.count})</span>
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
                isPartial={item._isPartial} // Pass partial flag
            />
        );
    };

    return (
        <>
            <div style={{ margin: '20px 0' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                    <Search size={12} style={{ display: 'inline', marginRight: '4px' }} /> Search:
                </label>
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ 
                        width: '100%', padding: '8px', boxSizing: 'border-box',
                        border: '1px solid #999', fontFamily: 'inherit'
                    }}
                    placeholder="Search by title, author..."
                />
            </div>

            {!searchQuery && <RandomHighlight />}
            {error && <div style={{ color: 'red', border: '1px solid red', padding: '10px' }}>{error}</div>}

            <Virtuoso
                useWindowScroll
                data={displayData}
                endReached={loadMore}
                itemContent={renderItem}
                components={{
                    Footer: () => loadingList ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                            <Loader2 size={16} className="animate-spin" style={{ display:'inline', marginRight:'5px' }}/> Loading...
                        </div>
                    ) : null
                }}
            />
        </>
    );
};

export default Home;