import React, { useState, useEffect } from 'react';
import TagsManager from './TagsManager';

const Dashboard = ({ onBack }) => {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeTab, setActiveTab] = useState('books'); 

    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [filter, setFilter] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // Edit state
    const [editingBook, setEditingBook] = useState(null);

    // --- Highlights Upload State ---
    const [highlightBookId, setHighlightBookId] = useState('');
    const [highlightMarkdown, setHighlightMarkdown] = useState('');
    const [highlightFileName, setHighlightFileName] = useState('');
    const [highlightPreview, setHighlightPreview] = useState([]);
    const [highlightReplaceExisting, setHighlightReplaceExisting] = useState(false);
    const [highlightBusy, setHighlightBusy] = useState(false);
    const [highlightError, setHighlightError] = useState('');
    const [highlightSuccess, setHighlightSuccess] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        if (password) {
            setIsAuthenticated(true);
            fetchBooks();
        }
    };

    const fetchBooks = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/books'); 
            if (res.ok) setBooks(await res.json());
            else setError('Failed to fetch books.');
        } catch (e) { setError(e.message); } 
        finally { setLoading(false); }
    };

    // Helpers
    const arrayToString = (data) => {
        if (!data) return '';
        try {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            return Array.isArray(parsed) ? parsed.join(', ') : String(parsed);
        } catch (e) { return String(data); }
    };
    const stringToArray = (str) => str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
    
    // Highlight Parsing Logic (Simplified for brevity)
    const parseHighlightsFromContent = (content) => {
        if (!content) return [];
        const lines = content.split('\n');
        const highlights = [];
        for (const line of lines) {
            const match = line.match(/^\s*[-*+]\s+(.*)$/);
            if (match) highlights.push(match[1].replace(/\s*\(location.*?\)\s*$/i, '').trim());
        }
        return highlights;
    };
    
    const handleParseHighlights = () => {
        const parsed = parseHighlightsFromContent(highlightMarkdown);
        setHighlightPreview(parsed);
    };

    const handleUploadHighlights = async () => {
        if (!highlightBookId || highlightPreview.length === 0) return;
        setHighlightBusy(true);
        try {
            const selectedBook = books.find(b => b.id === highlightBookId);
            const existing = highlightReplaceExisting ? [] : (typeof selectedBook.highlights === 'string' ? JSON.parse(selectedBook.highlights) : selectedBook.highlights || []);
            const merged = existing.concat(highlightPreview);
            
            await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password, action: 'update',
                    data: { id: highlightBookId, highlights: merged, hasHighlights: 1 }
                })
            });
            setHighlightSuccess(`Uploaded ${highlightPreview.length} items.`);
            setHighlightPreview([]); setHighlightMarkdown(''); fetchBooks();
        } catch (e) { setHighlightError(e.message); }
        finally { setHighlightBusy(false); }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setIsSearching(true);
        setSearchResults([]);
        try {
            const res = await fetch(`/api/openlibrary-search?q=${encodeURIComponent(searchQuery)}`);
            if (res.ok) setSearchResults(await res.json());
        } catch(e) {} finally { setIsSearching(false); }
    };

    const handleAddBook = async (olid, shelf) => {
        try {
            await fetch('/api/books', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, action: 'add', data: { olid, shelf } })
            });
            setSuccessMsg(`Added book ${olid}`); fetchBooks();
        } catch (e) { setError(e.message); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete?')) return;
        await fetch('/api/books', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, action: 'delete', data: { id } })
        });
        fetchBooks();
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const updated = { ...editingBook, authors: stringToArray(editingBook.authorsInput), tags: stringToArray(editingBook.tagsInput) };
        delete updated.authorsInput; delete updated.tagsInput;
        await fetch('/api/books', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, action: 'update', data: updated })
        });
        setEditingBook(null); fetchBooks();
    };

    const filteredBooks = books.filter(b => (b.title || '').toLowerCase().includes(filter.toLowerCase()));

    if (!isAuthenticated) {
        return (
            <div className="flex justify-center p-10">
                <div className="border border-black p-4 w-64 bg-gray-100">
                    <h3 className="font-bold border-b border-black mb-2">ADMIN LOGIN</h3>
                    <form onSubmit={handleLogin}>
                        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border border-gray-500 p-1 mb-2" autoFocus placeholder="Password" />
                        <button type="submit" className="w-full bg-black text-white p-1 text-sm font-bold">ENTER</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="bg-gray-200 border-b border-gray-400 p-2 flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">DASHBOARD</h2>
                <div className="space-x-2 text-sm">
                    <button onClick={fetchBooks} className="underline text-blue-800">Refresh</button>
                    <button onClick={onBack} className="underline text-blue-800">Exit</button>
                </div>
            </div>

            <div className="mb-4 text-sm border-b border-black pb-1 space-x-4">
                <button onClick={() => setActiveTab('books')} className={`font-bold ${activeTab === 'books' ? 'text-black' : 'text-gray-500'}`}>BOOKS</button>
                <button onClick={() => setActiveTab('tags')} className={`font-bold ${activeTab === 'tags' ? 'text-black' : 'text-gray-500'}`}>TAGS</button>
            </div>

            {activeTab === 'tags' ? (
                <TagsManager password={password} onBack={() => setActiveTab('books')} />
            ) : (
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Left Column: Tools */}
                    <div className="w-full md:w-1/3 flex flex-col gap-4">
                        
                        {/* Search & Add */}
                        <div className="border border-black p-2 bg-gray-50">
                            <h3 className="font-bold text-sm bg-black text-white px-1 mb-2">ADD BOOK (OPENLIBRARY)</h3>
                            <form onSubmit={handleSearch} className="flex gap-1 mb-2">
                                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="border border-gray-500 p-1 w-full text-sm" placeholder="Search..." />
                                <button type="submit" className="border border-black bg-gray-200 px-2 text-xs font-bold">{isSearching ? '...' : 'GO'}</button>
                            </form>
                            {searchResults.length > 0 && (
                                <div className="max-h-60 overflow-y-auto border border-gray-400 bg-white text-xs">
                                    {searchResults.map(r => (
                                        <div key={r.key} className="p-1 border-b border-gray-200 flex justify-between items-center hover:bg-yellow-50">
                                            <span className="truncate w-2/3" title={r.title}>{r.title} ({r.first_publish_year})</span>
                                            <div className="space-x-1">
                                                <button onClick={() => handleAddBook(r.key, 'watchlist')} className="text-blue-800 underline">W</button>
                                                <button onClick={() => handleAddBook(r.key, 'currentlyReading')} className="text-blue-800 underline">R</button>
                                                <button onClick={() => handleAddBook(r.key, 'read')} className="text-blue-800 underline">F</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Upload Highlights */}
                        <div className="border border-black p-2 bg-gray-50">
                            <h3 className="font-bold text-sm bg-black text-white px-1 mb-2">UPLOAD HIGHLIGHTS</h3>
                            <div className="text-xs mb-2">
                                Book: 
                                <select value={highlightBookId} onChange={e=>setHighlightBookId(e.target.value)} className="w-full border border-gray-400 mb-1">
                                    <option value="">Select...</option>
                                    {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                                </select>
                                Paste Markdown:
                                <textarea value={highlightMarkdown} onChange={e=>setHighlightMarkdown(e.target.value)} className="w-full border border-gray-400 h-20" />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleParseHighlights} className="border border-black bg-white px-2 text-xs">Preview</button>
                                <button onClick={handleUploadHighlights} disabled={highlightBusy} className="border border-black bg-black text-white px-2 text-xs">Upload</button>
                            </div>
                            {highlightSuccess && <div className="text-green-700 text-xs mt-1">{highlightSuccess}</div>}
                        </div>
                    </div>

                    {/* Right Column: Library Table */}
                    <div className="w-full md:w-2/3">
                        <div className="flex justify-between items-end mb-1">
                            <h3 className="font-bold text-sm">EXISTING LIBRARY</h3>
                            <input type="text" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter..." className="border border-gray-400 p-1 text-xs" />
                        </div>
                        <div className="border border-black overflow-x-auto">
                            <table className="w-full text-xs text-left collapse">
                                <thead className="bg-gray-300 font-bold border-b border-black">
                                    <tr>
                                        <th className="p-1 border-r border-gray-400">Title</th>
                                        <th className="p-1 border-r border-gray-400">Author</th>
                                        <th className="p-1 border-r border-gray-400">Shelf</th>
                                        <th className="p-1 text-center">Act</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBooks.map(b => (
                                        <tr key={b.id} className="border-b border-gray-300 hover:bg-yellow-50">
                                            <td className="p-1 border-r border-gray-300">{b.title}</td>
                                            <td className="p-1 border-r border-gray-300">{arrayToString(b.authors)}</td>
                                            <td className="p-1 border-r border-gray-300">{b.shelf}</td>
                                            <td className="p-1 text-center space-x-1">
                                                <button onClick={() => setEditingBook({...b, authorsInput: arrayToString(b.authors), tagsInput: arrayToString(b.tags)})} className="text-blue-800 font-bold">E</button>
                                                <button onClick={() => handleDelete(b.id)} className="text-red-700 font-bold">X</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal (Raw HTML style) */}
            {editingBook && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
                    <div className="bg-white border-2 border-black p-4 w-96 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="font-bold border-b border-black mb-4 flex justify-between">
                            <span>EDIT BOOK</span>
                            <button onClick={()=>setEditingBook(null)}>X</button>
                        </div>
                        <form onSubmit={handleUpdate} className="text-xs space-y-2">
                            <div>Title: <input type="text" value={editingBook.title} onChange={e=>setEditingBook({...editingBook, title: e.target.value})} className="w-full border border-gray-400 p-1"/></div>
                            <div>Authors: <input type="text" value={editingBook.authorsInput} onChange={e=>setEditingBook({...editingBook, authorsInput: e.target.value})} className="w-full border border-gray-400 p-1"/></div>
                            <div>Shelf: <select value={editingBook.shelf} onChange={e=>setEditingBook({...editingBook, shelf: e.target.value})} className="w-full border border-gray-400 p-1">
                                <option value="watchlist">Watchlist</option>
                                <option value="currentlyReading">Reading</option>
                                <option value="read">Finished</option>
                            </select></div>
                            <div>Progress: <input type="number" value={editingBook.readingProgress} onChange={e=>setEditingBook({...editingBook, readingProgress: e.target.value})} className="w-full border border-gray-400 p-1"/></div>
                            <div className="pt-2 text-right space-x-2">
                                <button type="button" onClick={()=>setEditingBook(null)} className="border border-black px-2 bg-gray-200">Cancel</button>
                                <button type="submit" className="border border-black px-2 bg-black text-white">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
