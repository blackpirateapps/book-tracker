import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle2, Clock, Search } from 'lucide-react';
import Header from './components/Header';
import RandomHighlight from './components/RandomHighlight';
import Shelf from './components/Shelf';

function App() {
    const [searchQuery, setSearchQuery] = useState('');
    const [library, setLibrary] = useState({ currentlyReading: [], read: [], watchlist: [] });
    const [tagsMap, setTagsMap] = useState(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Tags (Optional: Handle failure if endpoint doesn't exist yet)
                let tags = [];
                try {
                    const tagsRes = await fetch('/api/tags');
                    if (tagsRes.ok) tags = await tagsRes.json();
                } catch (e) {
                    console.warn("Tags API not available or failed", e);
                }
                
                const tMap = new Map();
                tags.forEach(tag => tMap.set(tag.id, tag));
                setTagsMap(tMap);

                // 2. Fetch Books from your public API
                // Note: Your public.js accepts a 'q' param for search, but we load all initially
                const booksRes = await fetch('/api/public');
                if (!booksRes.ok) throw new Error('Failed to load library');
                
                const books = await booksRes.json();

                // 3. Process and Group Books
                const grouped = { currentlyReading: [], read: [], watchlist: [] };
                
                books.forEach(book => {
                    // Parse JSON strings if your API returns them as strings (sqlite often does)
                    if (typeof book.authors === 'string') {
                        try { book.authors = JSON.parse(book.authors); } catch(e) { book.authors = []; }
                    }
                    if (typeof book.imageLinks === 'string') {
                        try { book.imageLinks = JSON.parse(book.imageLinks); } catch(e) { book.imageLinks = {}; }
                    }
                    if (typeof book.tags === 'string') {
                        try { book.tags = JSON.parse(book.tags); } catch(e) { book.tags = []; }
                    }

                    // Assign to shelf
                    if (grouped[book.shelf]) {
                        grouped[book.shelf].push(book);
                    } else {
                        // Fallback
                        grouped.watchlist.push(book);
                    }
                });

                // Sort 'read' books by finished date (newest first)
                grouped.read.sort((a, b) => {
                    return new Date(b.finishedOn || 0) - new Date(a.finishedOn || 0);
                });

                setLibrary(grouped);
            } catch (err) {
                console.error("Data fetch error:", err);
                setError("Could not load library data. Please check connection.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Helper to handle client-side filtering on the already fetched data
    // (Optimization: You could call /api/public?q=... for server-side search if the list is huge)
    const filterShelf = (list) => {
        if (!searchQuery) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(b => 
            b.title.toLowerCase().includes(q) || 
            (Array.isArray(b.authors) && b.authors.some(a => a.toLowerCase().includes(q)))
        );
    };

    return (
        <div style={{ 
            fontFamily: '"Times New Roman", Times, serif', 
            maxWidth: '750px', 
            width: '100%', 
            boxSizing: 'border-box',
            margin: '0 auto', 
            padding: '15px', 
            color: '#000',
            backgroundColor: '#fff',
            minHeight: '100vh'
        }}>
            
            <Header />

            {/* Search */}
            <div style={{ margin: '20px 0' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                    <Search size={12} style={{ display: 'inline', marginRight: '4px' }} /> Search:
                </label>
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ 
                        width: '100%', 
                        padding: '8px', 
                        boxSizing: 'border-box',
                        border: '1px solid #999',
                        fontFamily: 'inherit'
                    }}
                    placeholder="Search by title, author..."
                />
            </div>

            {!searchQuery && <RandomHighlight />}

            {error ? (
                <div style={{ padding: '20px', border: '1px solid red', color: 'red' }}>
                    Error: {error}
                </div>
            ) : (
                <>
                    <Shelf 
                        title="Reading Now" 
                        books={filterShelf(library.currentlyReading || [])} 
                        icon={BookOpen}
                        loading={loading}
                        tagsMap={tagsMap}
                    />
                    
                    <Shelf 
                        title="Recently Finished" 
                        books={filterShelf(library.read || [])} 
                        icon={CheckCircle2}
                        loading={loading}
                        tagsMap={tagsMap}
                    />
                    
                    <Shelf 
                        title="To Read" 
                        books={filterShelf(library.watchlist || [])} 
                        icon={Clock}
                        loading={loading}
                        tagsMap={tagsMap}
                    />
                </>
            )}

            <div style={{ borderTop: '1px solid #000', marginTop: '40px', paddingTop: '10px', textAlign: 'center' }}>
                <small style={{ fontSize: '11px', color: '#666' }}>
                    Page generated at {new Date().toLocaleTimeString()} <br/>
                    &copy; 2026 Sudip's Library • <a href="#" style={{ color: '#0000AA' }}>Contact Webmaster</a>
                </small>
            </div>
        </div>
    );
}

export default App;