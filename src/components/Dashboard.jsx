import React, { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    Edit,
    Save,
    X,
    Search,
    Lock,
    LogOut,
    RefreshCw,
    Tag,
    BookOpen,
    CheckCircle2,
    Clock,
    ArrowLeft
} from 'lucide-react';
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
    const [addingBookId, setAddingBookId] = useState(null); 

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
        setError(null);
        try {
            const res = await fetch('/api/books'); 
            if (res.ok) {
                const data = await res.json();
                setBooks(data);
            } else {
                setError('Failed to fetch books.');
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const arrayToString = (data) => {
        if (!data) return '';
        try {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            if (Array.isArray(parsed)) return parsed.join(', ');
            return String(parsed);
        } catch (e) {
            return String(data);
        }
    };

    const stringToArray = (str) => {
        if (!str) return [];
        return str.split(',').map(s => s.trim()).filter(Boolean);
    };

    const parseHighlightsField = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    };

    const parseHighlightsFromContent = (content) => {
        if (!content) return [];
        const trimmed = content.trim();
        const looksLikeHtml = /<html[\s>]/i.test(trimmed) || /class=["']noteText["']/i.test(trimmed);
        if (looksLikeHtml) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            const nodes = Array.from(doc.querySelectorAll('div.noteText'));
            return nodes.map(node => node.textContent.trim()).filter(Boolean);
        }

        const lines = content.split('\n');
        const highlights = [];
        for (const line of lines) {
            const match = line.match(/^\s*[-*+]\s+(.*)$/);
            if (!match) continue;
            const cleaned = match[1].replace(/\s*\(location.*?\)\s*$/i, '').trim();
            if (cleaned) highlights.push(cleaned);
        }
        return highlights;
    };

    const handleParseHighlights = () => {
        setHighlightError('');
        setHighlightSuccess('');
        const parsed = parseHighlightsFromContent(highlightMarkdown);
        if (parsed.length === 0) {
            setHighlightPreview([]);
            setHighlightError('No highlights found.');
            return;
        }
        setHighlightPreview(parsed);
    };

    const handleHighlightFileChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        setHighlightError('');
        setHighlightSuccess('');
        setHighlightFileName(file.name);
        const reader = new FileReader();
        reader.onload = () => {
            const content = typeof reader.result === 'string' ? reader.result : '';
            setHighlightMarkdown(content);
            const parsed = parseHighlightsFromContent(content);
            setHighlightPreview(parsed);
        };
        reader.readAsText(file);
    };

    const handleUploadHighlights = async () => {
        setHighlightError('');
        setHighlightSuccess('');
        if (!highlightBookId) {
            setHighlightError('Select a book first.');
            return;
        }
        if (highlightPreview.length === 0) {
            setHighlightError('Parse the markdown first.');
            return;
        }
        const selectedBook = books.find(book => book.id === highlightBookId);
        const existingHighlights = highlightReplaceExisting ? [] : parseHighlightsField(selectedBook?.highlights);
        const mergedHighlights = highlightReplaceExisting ? highlightPreview : existingHighlights.concat(highlightPreview);

        setHighlightBusy(true);
        try {
            const res = await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password,
                    action: 'update',
                    data: {
                        id: highlightBookId,
                        highlights: mergedHighlights,
                        hasHighlights: mergedHighlights.length > 0 ? 1 : 0
                    }
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to upload');
            }

            setHighlightSuccess(`Uploaded ${highlightPreview.length} highlights.`);
            setHighlightMarkdown('');
            setHighlightFileName('');
            setHighlightPreview([]);
            setHighlightReplaceExisting(false);
            fetchBooks();
        } catch (e) {
            setHighlightError(e.message);
        } finally {
            setHighlightBusy(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchResults([]);
        setError(null);
        try {
            const res = await fetch(`/api/openlibrary-search?q=${encodeURIComponent(searchQuery)}`);
            if (!res.ok) throw new Error('Search failed');
            const results = await res.json();
            setSearchResults(results);
        } catch (e) {
            console.error(e);
            setError("Could not fetch results.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddBook = async (olid, shelf) => {
        setAddingBookId(olid);
        setError(null);
        setSuccessMsg('');
        try {
            const res = await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, action: 'add', data: { olid, shelf } })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to add book');
            setSuccessMsg(`Added: "${data.book.title}"`);
            fetchBooks();
        } catch (e) {
            setError(e.message);
        } finally {
            setAddingBookId(null);
        }
    };

    const handleDeleteBook = async (id, title) => {
        if (!window.confirm(`Delete "${title}"?`)) return;
        try {
            const res = await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, action: 'delete', data: { id } })
            });
            if (!res.ok) throw new Error('Failed to delete');
            setSuccessMsg(`Deleted "${title}"`);
            fetchBooks();
        } catch (e) {
            setError(e.message);
        }
    };

    const handleUpdateBook = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg('');
        try {
            const updatedData = {
                ...editingBook,
                authors: stringToArray(editingBook.authorsInput),
                tags: stringToArray(editingBook.tagsInput)
            };
            delete updatedData.authorsInput;
            delete updatedData.tagsInput;

            const res = await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, action: 'update', data: updatedData })
            });

            if (!res.ok) throw new Error('Update failed');
            setSuccessMsg('Updated successfully');
            setEditingBook(null);
            fetchBooks();
        } catch (e) {
            setError(e.message);
        }
    };

    const startEditing = (book) => {
        setEditingBook({
            ...book,
            authorsInput: arrayToString(book.authors),
            tagsInput: arrayToString(book.tags)
        });
    };

    const filteredBooks = books.filter(b => 
        (b.title && b.title.toLowerCase().includes(filter.toLowerCase())) ||
        (b.authors && String(b.authors).toLowerCase().includes(filter.toLowerCase()))
    );

    if (!isAuthenticated) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <div className="minimal-card p-6 w-full max-w-sm">
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
                        <Lock size={16} className="text-slate-500" />
                        <h2 className="font-bold text-slate-800 dark:text-slate-200">Admin Access</h2>
                    </div>
                    <form onSubmit={handleLogin}>
                        <label className="block text-xs font-bold text-slate-500 mb-2">PASSWORD</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="minimal-input px-3 py-2 mb-4 text-sm"
                            autoFocus
                        />
                        <button type="submit" className="w-full bg-slate-900 dark:bg-slate-700 text-white py-2 rounded-md text-sm font-bold hover:bg-slate-800 transition-colors">
                            ENTER
                        </button>
                    </form>
                    <button onClick={onBack} className="w-full mt-4 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                        &larr; Return to Library
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto p-4 animate-fadeIn">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
                <div className="flex gap-3">
                    <button onClick={fetchBooks} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700">
                        <RefreshCw size={14} /> REFRESH
                    </button>
                    <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700">
                        <LogOut size={14} /> EXIT
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-700">
                <button 
                    onClick={() => setActiveTab('books')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'books' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                >
                    Books Management
                </button>
                <button 
                    onClick={() => setActiveTab('tags')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'tags' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                >
                    <Tag size={14} /> Tags
                </button>
            </div>

            {activeTab === 'tags' ? (
                <TagsManager password={password} onBack={() => setActiveTab('books')} />
            ) : (
                <div className="space-y-6">
                    {(error || highlightError) && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
                            {error || highlightError}
                        </div>
                    )}
                    {(successMsg || highlightSuccess) && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 p-3 rounded-md text-sm">
                            {successMsg || highlightSuccess}
                        </div>
                    )}

                    {/* Add Books */}
                    <div className="minimal-card p-5">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                            <Plus size={16} /> Add New Books
                        </h3>
                        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                            <div className="relative flex-grow">
                                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search by Title, Author, or OLID..."
                                    className="minimal-input pl-9 py-2 text-sm"
                                />
                            </div>
                            <button type="submit" disabled={isSearching} className="bg-slate-900 dark:bg-slate-700 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-slate-800 transition-colors">
                                {isSearching ? '...' : 'SEARCH'}
                            </button>
                        </form>

                        {searchResults.length > 0 && (
                            <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800/50">
                                {searchResults.map(result => {
                                    const existingBook = books.find(b => b.id === result.key);
                                    const coverUrl = result.cover_i ? `https://covers.openlibrary.org/b/id/${result.cover_i}-S.jpg` : null;

                                    return (
                                        <div key={result.key} className="flex items-center gap-3 p-3 border-b border-slate-200 dark:border-slate-700 last:border-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                            <div className="w-10 h-14 bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden rounded">
                                                {coverUrl ? <img src={coverUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] text-slate-500">No Img</span>}
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{result.title}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                    {result.author_name ? result.author_name.join(', ') : 'Unknown'}
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0">
                                                {existingBook ? (
                                                    <span className="flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                                                        <CheckCircle2 size={12} /> Added
                                                    </span>
                                                ) : addingBookId === result.key ? (
                                                    <span className="text-xs text-slate-500">Adding...</span>
                                                ) : (
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleAddBook(result.key, 'watchlist')} className="p-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded hover:bg-slate-50 text-slate-600 dark:text-slate-300" title="Watchlist"><Clock size={16}/></button>
                                                        <button onClick={() => handleAddBook(result.key, 'currentlyReading')} className="p-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded hover:bg-slate-50 text-slate-600 dark:text-slate-300" title="Reading"><BookOpen size={16}/></button>
                                                        <button onClick={() => handleAddBook(result.key, 'read')} className="p-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded hover:bg-slate-50 text-slate-600 dark:text-slate-300" title="Finished"><CheckCircle2 size={16}/></button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Upload Highlights */}
                    <div className="minimal-card p-5">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                            <BookOpen size={16} /> Upload Highlights
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">BOOK</label>
                                <select 
                                    value={highlightBookId}
                                    onChange={e => setHighlightBookId(e.target.value)}
                                    className="minimal-input py-2 px-2 text-sm"
                                >
                                    <option value="">Select a book...</option>
                                    {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">FILE (.md/.html)</label>
                                <input type="file" accept=".md,.html" onChange={handleHighlightFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-700 dark:file:text-slate-300" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">PASTE MARKDOWN</label>
                                <textarea 
                                    value={highlightMarkdown} 
                                    onChange={e => setHighlightMarkdown(e.target.value)} 
                                    rows="4" 
                                    className="minimal-input p-2 text-sm font-mono" 
                                    placeholder="- Highlight 1..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                <input type="checkbox" checked={highlightReplaceExisting} onChange={e => setHighlightReplaceExisting(e.target.checked)} />
                                Replace existing
                            </label>
                            <div className="flex gap-2">
                                <button onClick={handleParseHighlights} className="px-3 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                    Preview
                                </button>
                                <button onClick={handleUploadHighlights} disabled={highlightBusy} className="px-3 py-1.5 text-xs font-bold rounded bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800">
                                    {highlightBusy ? '...' : 'Upload'}
                                </button>
                            </div>
                        </div>
                        {highlightPreview.length > 0 && (
                            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-700">
                                <div className="text-xs font-bold mb-2">Preview ({highlightPreview.length})</div>
                                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 pl-4 list-disc">
                                    {highlightPreview.slice(0,5).map((h,i) => <li key={i}>{h.substring(0, 100)}...</li>)}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Manage Books */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-bold text-slate-500 uppercase">Library ({filteredBooks.length})</h3>
                            <input 
                                type="text" 
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                placeholder="Filter..."
                                className="minimal-input py-1 px-2 text-xs w-48"
                            />
                        </div>
                        <div className="minimal-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="px-4 py-3">Book</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {filteredBooks.map(book => (
                                            <tr key={book.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-slate-900 dark:text-slate-100">{book.title}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">{arrayToString(book.authors)}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${book.shelf === 'currentlyReading' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800' : book.shelf === 'read' ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:border-green-800' : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-700 dark:border-slate-600'}`}>
                                                        {book.shelf}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right space-x-2">
                                                    <button onClick={() => startEditing(book)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800"><Edit size={16} /></button>
                                                    <button onClick={() => handleDeleteBook(book.id, book.title)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
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

            {/* Edit Modal */}
            {editingBook && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="minimal-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-3">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit Book</h2>
                            <button onClick={() => setEditingBook(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleUpdateBook} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">TITLE</label>
                                <input type="text" value={editingBook.title} onChange={e => setEditingBook({...editingBook, title: e.target.value})} className="minimal-input px-3 py-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">AUTHORS</label>
                                <input type="text" value={editingBook.authorsInput} onChange={e => setEditingBook({...editingBook, authorsInput: e.target.value})} className="minimal-input px-3 py-2 text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">SHELF</label>
                                    <select value={editingBook.shelf} onChange={e => setEditingBook({...editingBook, shelf: e.target.value})} className="minimal-input px-3 py-2 text-sm">
                                        <option value="watchlist">Watchlist</option>
                                        <option value="currentlyReading">Reading Now</option>
                                        <option value="read">Finished</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">PROGRESS %</label>
                                    <input type="number" min="0" max="100" value={editingBook.readingProgress} onChange={e => setEditingBook({...editingBook, readingProgress: e.target.value})} className="minimal-input px-3 py-2 text-sm" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setEditingBook(null)} className="px-4 py-2 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
                                <button type="submit" className="px-4 py-2 rounded bg-slate-900 dark:bg-slate-700 text-white text-sm font-bold hover:bg-slate-800">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;