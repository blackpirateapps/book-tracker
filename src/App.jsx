import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle2, Clock, Search } from 'lucide-react';
import Header from './components/Header';
import RandomHighlight from './components/RandomHighlight';
import Shelf from './components/Shelf';
import { MOCK_DATA } from './data/mockData';

function App() {
    const [searchQuery, setSearchQuery] = useState('');
    const [library, setLibrary] = useState({ currentlyReading: [], read: [], watchlist: [] });
    const [tagsMap, setTagsMap] = useState(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await new Promise(r => setTimeout(r, 800));
            
            // Initialize Tags
            const tMap = new Map();
            MOCK_DATA.tags.forEach(tag => tMap.set(tag.id, tag));
            setTagsMap(tMap);

            // Initialize Shelves
            const grouped = { currentlyReading: [], read: [], watchlist: [] };
            MOCK_DATA.books.forEach(book => {
                if (grouped[book.shelf]) grouped[book.shelf].push(book);
                else grouped.watchlist.push(book);
            });
            setLibrary(grouped);
            setLoading(false);
        };
        init();
    }, []);

    const filterShelf = (list) => {
        if (!searchQuery) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(b => 
            b.title.toLowerCase().includes(q) || 
            (b.authors && b.authors.some(a => a.toLowerCase().includes(q)))
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

            {/* Search - Full Width */}
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