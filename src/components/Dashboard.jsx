import React, { useState, useEffect } from 'react';
import TagsManager from './TagsManager';
import { Lock, RefreshCw, LogOut, Search, BookOpen, Plus, FileText, Trash2, Edit3, Download, BookMarked, Clock } from 'lucide-react';

const Dashboard = ({ onBack, onEdit }) => {
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

    // Highlight Parsing Logic
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
        } catch (e) { } finally { setIsSearching(false); }
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
        if (!confirm('Delete this book?')) return;
        await fetch('/api/books', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, action: 'delete', data: { id } })
        });
        fetchBooks();
    };

    const filteredBooks = books.filter(b => (b.title || '').toLowerCase().includes(filter.toLowerCase()));

    // --- LOGIN SCREEN ---
    if (!isAuthenticated) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="glass-panel p-8 w-full max-w-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Lock className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Admin Login</h3>
                            <p className="text-xs text-muted">Enter password to continue</p>
                        </div>
                    </div>
                    <form onSubmit={handleLogin}>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full mb-4"
                            autoFocus
                            placeholder="Password"
                        />
                        <button type="submit" className="btn-glass-primary w-full py-3 font-medium">
                            Enter Dashboard
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- MAIN DASHBOARD ---
    return (
        <div>
            {/* Header Bar */}
            <div className="glass-panel p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="font-semibold text-xl">Dashboard</h2>
                <div className="flex gap-2">
                    <button onClick={fetchBooks} className="btn-glass flex items-center gap-2 text-sm">
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button onClick={onBack} className="btn-glass flex items-center gap-2 text-sm">
                        <LogOut className="w-4 h-4" />
                        Exit
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('books')}
                    className={`btn-glass text-sm ${activeTab === 'books' ? 'bg-white/20 border-white/30' : ''}`}
                >
                    <BookOpen className="w-4 h-4 inline mr-2" />
                    Books
                </button>
                <button
                    onClick={() => setActiveTab('tags')}
                    className={`btn-glass text-sm ${activeTab === 'tags' ? 'bg-white/20 border-white/30' : ''}`}
                >
                    Tags
                </button>
            </div>

            {activeTab === 'tags' ? (
                <TagsManager password={password} onBack={() => setActiveTab('books')} />
            ) : (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column: Tools */}
                    <div className="w-full lg:w-1/3 flex flex-col gap-6">

                        {/* Search & Add */}
                        <div className="glass-panel p-4">
                            <div className="section-header -mx-4 -mt-4 mb-4 rounded-t-[20px]">
                                <Plus className="w-4 h-4" />
                                Add Book (OpenLibrary)
                            </div>
                            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="flex-1"
                                    placeholder="Search books..."
                                />
                                <button type="submit" className="btn-glass-primary px-4">
                                    {isSearching ? '...' : 'Search'}
                                </button>
                            </form>
                            {searchResults.length > 0 && (
                                <div className="max-h-60 overflow-y-auto space-y-2">
                                    {searchResults.map(r => (
                                        <div key={r.key} className="glass-card p-3 flex justify-between items-center">
                                            <span className="text-sm truncate flex-1 mr-4" title={r.title}>
                                                {r.title} <span className="text-muted">({r.first_publish_year})</span>
                                            </span>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleAddBook(r.key, 'watchlist')}
                                                    className="btn-glass p-2 text-xs"
                                                    title="Add to Watchlist"
                                                >
                                                    <BookMarked className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => handleAddBook(r.key, 'currentlyReading')}
                                                    className="btn-glass p-2 text-xs"
                                                    title="Reading Now"
                                                >
                                                    <BookOpen className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => handleAddBook(r.key, 'read')}
                                                    className="btn-glass p-2 text-xs"
                                                    title="Mark as Finished"
                                                >
                                                    <Clock className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Upload Highlights */}
                        <div className="glass-panel p-4">
                            <div className="section-header -mx-4 -mt-4 mb-4 rounded-t-[20px]">
                                <Download className="w-4 h-4" />
                                Upload Highlights
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-muted block mb-1">Select Book</label>
                                    <select
                                        value={highlightBookId}
                                        onChange={e => setHighlightBookId(e.target.value)}
                                        className="w-full"
                                    >
                                        <option value="">Select...</option>
                                        {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-muted block mb-1">Paste Markdown</label>
                                    <textarea
                                        value={highlightMarkdown}
                                        onChange={e => setHighlightMarkdown(e.target.value)}
                                        className="w-full h-24"
                                        placeholder="Paste highlights here..."
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleParseHighlights} className="btn-glass text-sm flex-1">
                                        Preview
                                    </button>
                                    <button
                                        onClick={handleUploadHighlights}
                                        disabled={highlightBusy}
                                        className="btn-glass-primary text-sm flex-1"
                                    >
                                        Upload
                                    </button>
                                </div>
                                {highlightSuccess && (
                                    <div className="text-emerald-400 text-xs">{highlightSuccess}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Library Table */}
                    <div className="w-full lg:w-2/3">
                        <div className="glass-panel p-4">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                <h3 className="font-medium">Library ({filteredBooks.length} books)</h3>
                                <div className="flex items-center gap-2">
                                    <Search className="w-4 h-4 text-muted" />
                                    <input
                                        type="text"
                                        value={filter}
                                        onChange={e => setFilter(e.target.value)}
                                        placeholder="Filter..."
                                        className="w-48"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-muted uppercase border-b border-white/10">
                                        <tr>
                                            <th className="pb-3 pr-4">Title</th>
                                            <th className="pb-3 pr-4">Author</th>
                                            <th className="pb-3 pr-4">Shelf</th>
                                            <th className="pb-3 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredBooks.map(b => (
                                            <tr key={b.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="py-3 pr-4 font-medium">{b.title}</td>
                                                <td className="py-3 pr-4 text-muted">{arrayToString(b.authors)}</td>
                                                <td className="py-3 pr-4">
                                                    <span className="tag-badge capitalize">{b.shelf}</span>
                                                </td>
                                                <td className="py-3 text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <button
                                                            onClick={() => onEdit(b.id, b, password)}
                                                            className="btn-glass p-2"
                                                            title="Edit"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(b.id)}
                                                            className="btn-glass p-2 text-red-400 hover:text-red-300"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
