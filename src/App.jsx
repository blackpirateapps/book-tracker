import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle2, Clock, Search } from 'lucide-react';
import Header from './components/Header';
import RandomHighlight from './components/RandomHighlight';
import Shelf from './components/Shelf';
import BookDetails from './components/BookDetails';
import Stats from './components/Stats';
import Dashboard from './components/Dashboard'; // Import Dashboard
import { MOCK_DATA } from './data/mockData';

function App() {
    // Routing State: 'list', 'details', 'stats', 'dashboard'
    const [currentView, setCurrentView] = useState('list'); 
    const [selectedBookId, setSelectedBookId] = useState(null);

    // Data State
    const [searchQuery, setSearchQuery] = useState('');
    const [library, setLibrary] = useState({ currentlyReading: [], read: [], watchlist: [] });
    const [tagsMap, setTagsMap] = useState(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Tags
                let tags = [];
                try {
                    const tagsRes = await fetch('/api/tags');
                    if (tagsRes.ok) tags = await tagsRes.json();
                } catch (e) { console.warn(e); }
                
                if (tags.length === 0) tags = MOCK_DATA.tags;

                const tMap = new Map();
                tags.forEach(tag => tMap.set(tag.id, tag));
                setTagsMap(tMap);

                // Fetch Books
                const booksRes = await fetch('/api/public');
                let books = [];
                if (booksRes.ok) {
                    books = await booksRes.json();
                } else {
                   books = MOCK_DATA.books;
                }

                // Process Books
                const grouped = { currentlyReading: [], read: [], watchlist: [] };
                books.forEach(book => {
                    if (typeof book.authors === 'string') try { book.authors = JSON.parse(book.authors); } catch(e) { book.authors = []; }
                    if (typeof book.imageLinks === 'string') try { book.imageLinks = JSON.parse(book.imageLinks); } catch(e) { book.imageLinks = {}; }
                    if (typeof book.tags === 'string') try { book.tags = JSON.parse(book.tags); } catch(e) { book.tags = []; }

                    if (grouped[book.shelf]) grouped[book.shelf].push(book);
                    else grouped.watchlist.push(book);
                });

                setLibrary(grouped);
            } catch (err) {
                console.error(err);
                setError("Failed to load library.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []); // Note: You might want to refresh data when returning from dashboard

    // --- Navigation Handlers ---

    const handleBookClick = (id) => {
        setSelectedBookId(id);
        setCurrentView('details');
        window.scrollTo(0, 0);
    };

    const handleBackClick = () => {
        setSelectedBookId(null);
        setCurrentView('list');
        // Optional: Trigger a data re-fetch here to see updates from dashboard immediately
    };
    
    const handleStatsClick = () => {
        setCurrentView('stats');
        window.scrollTo(0, 0);
    };

    const handleDashboardClick = () => {
        setCurrentView('dashboard');
        window.scrollTo(0, 0);
    }

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
            
            {/* Header */}
            {currentView !== 'dashboard' && (
                <Header 
                    onStatsClick={handleStatsClick} 
                    onHomeClick={handleBackClick} 
                    onDashboardClick={handleDashboardClick}
                />
            )}

            {/* ROUTER */}
            {currentView === 'details' ? (
                <BookDetails 
                    bookId={selectedBookId} 
                    onBack={handleBackClick} 
                    tagsMap={tagsMap} 
                />
            ) : currentView === 'stats' ? (
                <Stats onBack={handleBackClick} />
            ) : currentView === 'dashboard' ? (
                <Dashboard onBack={handleBackClick} />
            ) : (
                <>
                    {/* LIST VIEW */}
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

                    {error && <div style={{ color: 'red', border: '1px solid red', padding: '10px' }}>{error}</div>}

                    <Shelf 
                        title="Reading Now" 
                        books={filterShelf(library.currentlyReading || [])} 
                        icon={BookOpen}
                        loading={loading}
                        tagsMap={tagsMap}
                        onBookClick={handleBookClick}
                    />
                    
                    <Shelf 
                        title="Recently Finished" 
                        books={filterShelf(library.read || [])} 
                        icon={CheckCircle2}
                        loading={loading}
                        tagsMap={tagsMap}
                        onBookClick={handleBookClick}
                    />
                    
                    <Shelf 
                        title="To Read" 
                        books={filterShelf(library.watchlist || [])} 
                        icon={Clock}
                        loading={loading}
                        tagsMap={tagsMap}
                        onBookClick={handleBookClick}
                    />

                    <div style={{ borderTop: '1px solid #000', marginTop: '40px', paddingTop: '10px', textAlign: 'center' }}>
                        <small style={{ fontSize: '11px', color: '#666' }}>
                            Page generated at {new Date().toLocaleTimeString()} <br/>
                            &copy; 2026 Sudip's Library • <a href="#" style={{ color: '#0000AA' }}>Contact Webmaster</a>
                        </small>
                    </div>
                </>
            )}
        </div>
    );
}

export default App;