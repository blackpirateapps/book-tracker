import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, Clock, Search, Loader2 } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import RandomHighlight from '../components/RandomHighlight';
import BookListItem from '../components/BookListItem';

const LIMIT = 20;

const Home = ({ tagsMap }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    
    // We store a flat list of books for Virtuoso
    const [allBooks, setAllBooks] = useState([]);
    
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);
    const [error, setError] = useState(null);

    // --- Fetch Logic ---
    const fetchBooks = async (currentOffset, isReset = false) => {
        if (loading) return;
        setLoading(true);
        
        try {
            const queryParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : '';
            const res = await fetch(`/api/public?limit=${LIMIT}&offset=${currentOffset}${queryParam}`);
            
            if (res.ok) {
                const newBooks = await res.json();
                
                // Parse JSON fields
                newBooks.forEach(book => {
                    if (typeof book.authors === 'string') try { book.authors = JSON.parse(book.authors); } catch(e) { book.authors = []; }
                    if (typeof book.imageLinks === 'string') try { book.imageLinks = JSON.parse(book.imageLinks); } catch(e) { book.imageLinks = {}; }
                    if (typeof book.tags === 'string') try { book.tags = JSON.parse(book.tags); } catch(e) { book.tags = []; }
                });

                if (newBooks.length < LIMIT) setHasMore(false);
                else setHasMore(true);

                setAllBooks(prev => isReset ? newBooks : [...prev, ...newBooks]);
                setOffset(currentOffset + LIMIT);
            } else {
                // Fallback for demo if API fails
                if (isReset && allBooks.length === 0) {
                     setAllBooks(MOCK_DATA.books);
                     setHasMore(false);
                }
            }
        } catch (e) {
            console.error("Fetch error", e);
            setError("Failed to load books.");
        } finally {
            setLoading(false);
            setInitialLoad(false);
        }
    };

    // --- Search Handler ---
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            // Reset everything for new search
            setOffset(0);
            setHasMore(true);
            setAllBooks([]); 
            setInitialLoad(true); // Show initial loader again
            fetchBooks(0, true);
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // --- Handlers ---
    const loadMore = useCallback(() => {
        if (hasMore && !loading) {
            fetchBooks(offset, false);
        }
    }, [hasMore, loading, offset]);

    const handleBookClick = (id) => navigate(`/book/${id}`);

    // --- Render Helpers ---
    // Since Virtuoso needs a single flat list, but we have shelves (Reading, Read, Watchlist),
    // we can either:
    // A) Use one big list and headers (Virtuoso 'Grouped' mode - complex)
    // B) Just render a single list sorted by Date/Status (simpler for infinite scroll)
    // C) Keep separate shelves but only virtualize the lists if they are long. 
    //
    // Given the request for "Limit loading books... load more as user scrolls", 
    // a single unified feed sorted by "Last Updated" or "Finished Date" is usually best for infinite scroll.
    // However, to keep your "Shelves" design, we have a conflict: You can't easily infinite scroll 3 separate horizontal lists vertically on one page without complex logic.
    //
    // COMPROMISE: I will render ONE Virtuoso list that contains ALL books, but I will visually separate them using a 'header' item within the list if we sort them by shelf.
    // OR BETTER: Use Virtuoso for the entire main container.
    //
    // FOR NOW: I will implement a single vertical list of ALL books (filtered by search), 
    // effectively merging the shelves into one stream but showing their status clearly. 
    // This is the standard pattern for "Infinite Scroll" libraries.

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

            {/* Header for the list */}
            <div style={{ 
                borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '15px', 
                backgroundColor: '#eee', padding: '5px', fontSize: '14px', fontWeight: 'bold'
            }}>
                <BookOpen size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                LIBRARY ({allBooks.length})
            </div>

            {/* Virtualized List */}
            {/* We need a set height for Virtuoso to work best, usually `useWindowScroll` for full page */}
            
            <Virtuoso
                useWindowScroll
                data={allBooks}
                endReached={loadMore}
                itemContent={(index, book) => (
                    <BookListItem 
                        key={book.id} 
                        book={book} 
                        shelf={book.shelf} 
                        tagsMap={tagsMap} 
                        onClick={handleBookClick} 
                    />
                )}
                components={{
                    Footer: () => {
                        return loading ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                <Loader2 size={16} className="animate-spin" style={{ display:'inline', marginRight:'5px' }}/> Loading...
                            </div>
                        ) : null
                    }
                }}
            />

            {!loading && allBooks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No books found.</div>
            )}
        </>
    );
};

export default Home;