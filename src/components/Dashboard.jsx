import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, 
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
    Loader2
} from 'lucide-react';
import TagsManager from './TagsManager';

const Dashboard = ({ onBack }) => {
    // Auth State
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    // View State
    const [activeTab, setActiveTab] = useState('books'); // 'books' or 'tags'

    // Data State (Books)
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [filter, setFilter] = useState('');

    // --- Search & Add State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [addingBookId, setAddingBookId] = useState(null); 

    // Action State (Edit)
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

    // --- Authentication ---
    const handleLogin = (e) => {
        e.preventDefault();
        // Simple client-side check to persist session temporarily
        if (password) {
            setIsAuthenticated(true);
            fetchBooks();
        }
    };

    // --- Book Fetching ---
    const fetchBooks = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/books'); 
            if (res.ok) {
                const data = await res.json();
                setBooks(data);
            } else {
                setError('Failed to fetch books. Check your connection.');
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // --- Helpers for Data Transformation ---
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

    const parseMarkdownHighlights = (mdContent) => {
        if (!mdContent) return [];
        const lines = mdContent.split('\n');
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
        const parsed = parseMarkdownHighlights(highlightMarkdown);
        if (parsed.length === 0) {
            setHighlightPreview([]);
            setHighlightError('No unordered list items found in the markdown.');
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
            const parsed = parseMarkdownHighlights(content);
            setHighlightPreview(parsed);
        };
        reader.readAsText(file);
    };

    const handleUploadHighlights = async () => {
        setHighlightError('');
        setHighlightSuccess('');
        if (!highlightBookId) {
            setHighlightError('Select a book before uploading highlights.');
            return;
        }
        if (highlightPreview.length === 0) {
            setHighlightError('Parse the markdown to preview highlights before uploading.');
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
                throw new Error(data.error || 'Failed to upload highlights');
            }

            setHighlightSuccess(`Uploaded ${highlightPreview.length} highlight${highlightPreview.length === 1 ? '' : 's'}.`);
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

    // --- OpenLibrary Search ---
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setSearchResults([]);
        setError(null);

        try {
            // Using the proxy API to avoid CORS and normalize data
            const res = await fetch(`/api/openlibrary-search?q=${encodeURIComponent(searchQuery)}`);
            
            if (!res.ok) throw new Error('Search failed');
            
            const results = await res.json();
            setSearchResults(results);
        } catch (e) {
            console.error(e);
            setError("Could not fetch results from OpenLibrary.");
        } finally {
            setIsSearching(false);
        }
    };

    // --- Book Actions ---
    const handleAddBook = async (olid, shelf) => {
        setAddingBookId(olid);
        setError(null);
        setSuccessMsg('');

        try {
            const res = await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password,
                    action: 'add',
                    data: { olid, shelf }
                })
            });

            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Failed to add book');
            
            setSuccessMsg(`Successfully added: "${data.book.title}"`);
            fetchBooks(); // Refresh local list
        } catch (e) {
            setError(e.message);
        } finally {
            setAddingBookId(null);
        }
    };

    const handleDeleteBook = async (id, title) => {
        if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;

        try {
            const res = await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password,
                    action: 'delete',
                    data: { id }
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete');
            }
            
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
                body: JSON.stringify({
                    password,
                    action: 'update',
                    data: updatedData
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Update failed');
            }

            setSuccessMsg('Book updated successfully');
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

    // --- LOGIN VIEW ---
    if (!isAuthenticated) {
        return (
            <div style={{ maxWidth: '400px', margin: '60px auto', border: '1px solid #000', padding: '20px', backgroundColor: '#fff' }}>
                <div style={{ borderBottom: '1px solid #000', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Lock size={16} />
                    <h2 style={{ margin: 0, fontSize: '18px' }}>Admin Dashboard</h2>
                </div>
                
                <form onSubmit={handleLogin}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>Password:</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={{ width: '100%', padding: '8px', marginBottom: '15px', boxSizing: 'border-box', border: '1px solid #999' }}
                        autoFocus
                    />
                    <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                        ENTER
                    </button>
                </form>
                <div style={{ marginTop: '15px', textAlign: 'center' }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0000AA', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px' }}>
                        &larr; Return to Library
                    </button>
                </div>
            </div>
        );
    }

    // --- MAIN DASHBOARD VIEW ---
    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '10px', fontFamily: '"Times New Roman", serif', color: '#000' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid black', paddingBottom: '10px' }}>
                <h1 style={{ margin: 0, fontSize: '24px' }}>Library Dashboard</h1>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <button onClick={fetchBooks} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <RefreshCw size={14} /> Refresh
                    </button>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: '#0000AA' }}>
                        <LogOut size={14} /> Exit
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '1px solid #ccc' }}>
                <button 
                    onClick={() => setActiveTab('books')}
                    style={{ 
                        padding: '10px 20px', 
                        border: '1px solid #ccc', 
                        borderBottom: 'none', 
                        backgroundColor: activeTab === 'books' ? '#fff' : '#f4f4f4',
                        fontWeight: activeTab === 'books' ? 'bold' : 'normal',
                        cursor: 'pointer',
                        marginBottom: '-1px'
                    }}
                >
                    Books Management
                </button>
                <button 
                    onClick={() => setActiveTab('tags')}
                    style={{ 
                        padding: '10px 20px', 
                        border: '1px solid #ccc', 
                        borderBottom: 'none', 
                        backgroundColor: activeTab === 'tags' ? '#fff' : '#f4f4f4',
                        fontWeight: activeTab === 'tags' ? 'bold' : 'normal',
                        cursor: 'pointer',
                        marginBottom: '-1px',
                        display: 'flex', alignItems: 'center', gap: '5px'
                    }}
                >
                    <Tag size={14} /> Tags Manager
                </button>
            </div>

            {/* Content Switch */}
            {activeTab === 'tags' ? (
                <TagsManager password={password} onBack={() => setActiveTab('books')} />
            ) : (
                <>
                    {/* --- BOOKS MANAGEMENT UI --- */}
                    {error && <div style={{ backgroundColor: '#ffe6e6', color: '#d00', padding: '10px', border: '1px solid #d00', marginBottom: '15px' }}>Error: {error}</div>}
                    {successMsg && <div style={{ backgroundColor: '#e6fffa', color: '#006600', padding: '10px', border: '1px solid #006600', marginBottom: '15px' }}>{successMsg}</div>}

                    {/* NEW: SEARCH & ADD SECTION */}
                    <div style={{ backgroundColor: '#f4f4f4', padding: '15px', border: '1px solid #999', marginBottom: '30px' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', borderBottom: '1px dotted #999', paddingBottom: '5px' }}>
                            <Plus size={14} style={{ display: 'inline' }} /> Add New Books
                        </h3>
                        
                        {/* Search Input */}
                        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '8px', top: '8px', color: '#666' }} />
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search by Title, Author, or OLID..."
                                    style={{ width: '100%', padding: '8px 8px 8px 30px', border: '1px solid #999', boxSizing: 'border-box' }}
                                />
                            </div>
                            <button type="submit" disabled={isSearching} style={{ padding: '8px 20px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                                {isSearching ? 'SEARCHING...' : 'SEARCH'}
                            </button>
                        </form>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ccc', backgroundColor: 'white' }}>
                                {searchResults.map(result => {
                                    // Check if book exists in local library
                                    const existingBook = books.find(b => b.id === result.key);
                                    
                                    const coverUrl = result.cover_i 
                                        ? `https://covers.openlibrary.org/b/id/${result.cover_i}-S.jpg` 
                                        : null;

                                    return (
                                        <div key={result.key} style={{ display: 'flex', padding: '10px', borderBottom: '1px solid #eee', alignItems: 'center', gap: '15px' }}>
                                            {/* Cover */}
                                            <div style={{ width: '40px', height: '60px', backgroundColor: '#eee', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {coverUrl ? <img src={coverUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%' }} /> : <span style={{ fontSize: '10px' }}>No Img</span>}
                                            </div>

                                            {/* Info */}
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{result.title}</div>
                                                <div style={{ fontSize: '12px', color: '#666' }}>
                                                    {result.author_name ? result.author_name.join(', ') : 'Unknown Author'} 
                                                    {result.first_publish_year && ` (${result.first_publish_year})`}
                                                </div>
                                                <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>OLID: {result.key}</div>
                                            </div>

                                            {/* Actions */}
                                            <div style={{ textAlign: 'right' }}>
                                                {existingBook ? (
                                                    <span style={{ fontSize: '12px', color: 'green', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <CheckCircle2 size={14} /> Added ({existingBook.shelf})
                                                    </span>
                                                ) : addingBookId === result.key ? (
                                                    <span style={{ fontSize: '12px', color: '#666' }}>Adding...</span>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: '5px' }}>
                                                        <button onClick={() => handleAddBook(result.key, 'watchlist')} title="Add to Watchlist" style={{ cursor: 'pointer', padding: '5px', background: '#fff', border: '1px solid #ccc' }}>
                                                            <Clock size={16} />
                                                        </button>
                                                        <button onClick={() => handleAddBook(result.key, 'currentlyReading')} title="Add to Reading" style={{ cursor: 'pointer', padding: '5px', background: '#fff', border: '1px solid #ccc' }}>
                                                            <BookOpen size={16} />
                                                        </button>
                                                        <button onClick={() => handleAddBook(result.key, 'read')} title="Add to Finished" style={{ cursor: 'pointer', padding: '5px', background: '#fff', border: '1px solid #ccc' }}>
                                                            <CheckCircle2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {searchResults.length === 0 && !isSearching && searchQuery && (
                            <div style={{ fontStyle: 'italic', color: '#666', marginTop: '10px' }}>Search above to find books.</div>
                        )}
                    </div>

                    {/* NEW: HIGHLIGHTS UPLOAD SECTION */}
                    <div style={{ backgroundColor: '#f9f9f9', padding: '15px', border: '1px solid #999', marginBottom: '30px' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', borderBottom: '1px dotted #999', paddingBottom: '5px' }}>
                            <Plus size={14} style={{ display: 'inline' }} /> Upload Highlights (Markdown)
                        </h3>
                        <div style={{ fontSize: '12px', color: '#555', marginBottom: '10px' }}>
                            Each unordered list item is treated as a highlight. Example:
                            <pre style={{ margin: '8px 0', padding: '8px', backgroundColor: '#fff', border: '1px solid #ddd' }}>
                                - First highlight{'\n'}- Second highlight
                            </pre>
                        </div>

                        {highlightError && <div style={{ backgroundColor: '#ffe6e6', color: '#d00', padding: '8px', border: '1px solid #d00', marginBottom: '10px' }}>{highlightError}</div>}
                        {highlightSuccess && <div style={{ backgroundColor: '#e6fffa', color: '#006600', padding: '8px', border: '1px solid #006600', marginBottom: '10px' }}>{highlightSuccess}</div>}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Target Book</label>
                                <select
                                    value={highlightBookId}
                                    onChange={e => setHighlightBookId(e.target.value)}
                                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                >
                                    <option value="">Select a book...</option>
                                    {books.map(book => (
                                        <option key={book.id} value={book.id}>
                                            {book.title}
                                        </option>
                                    ))}
                                </select>
                                {highlightBookId && (
                                    <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                        Existing highlights: {parseHighlightsField(books.find(book => book.id === highlightBookId)?.highlights).length}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Upload Markdown File (.md)</label>
                                <input
                                    type="file"
                                    accept=".md,text/markdown"
                                    onChange={handleHighlightFileChange}
                                    style={{ width: '100%' }}
                                />
                                {highlightFileName && (
                                    <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Loaded: {highlightFileName}</div>
                                )}
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Or Paste Markdown</label>
                                <textarea
                                    value={highlightMarkdown}
                                    onChange={e => setHighlightMarkdown(e.target.value)}
                                    rows="6"
                                    placeholder="- Highlight one\n- Highlight two"
                                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                                <label style={{ fontSize: '12px' }}>
                                    <input
                                        type="checkbox"
                                        checked={highlightReplaceExisting}
                                        onChange={e => setHighlightReplaceExisting(e.target.checked)}
                                        style={{ marginRight: '6px' }}
                                    />
                                    Replace existing highlights
                                </label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button type="button" onClick={handleParseHighlights} style={{ padding: '6px 12px', backgroundColor: '#fff', border: '1px solid #000', cursor: 'pointer' }}>
                                        Parse Highlights
                                    </button>
                                    <button type="button" disabled={highlightBusy} onClick={handleUploadHighlights} style={{ padding: '6px 12px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer' }}>
                                        {highlightBusy ? 'UPLOADING...' : 'Upload Highlights'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {highlightPreview.length > 0 && (
                            <div style={{ marginTop: '12px', borderTop: '1px dashed #ccc', paddingTop: '10px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>
                                    Preview ({highlightPreview.length})
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#333' }}>
                                    {highlightPreview.slice(0, 8).map((highlight, index) => (
                                        <li key={`${highlight}-${index}`}>{highlight}</li>
                                    ))}
                                </ul>
                                {highlightPreview.length > 8 && (
                                    <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                                        Showing first 8 highlights.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Filter Local List */}
                    <div style={{ marginBottom: '10px', textAlign: 'right' }}>
                        <Search size={12} style={{ display: 'inline', marginRight: '5px' }} />
                        <input 
                            type="text" 
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            placeholder="Filter existing library..."
                            style={{ padding: '4px', border: '1px solid #ccc' }}
                        />
                    </div>

                    {/* Books Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table width="100%" cellPadding="8" cellSpacing="0" style={{ borderCollapse: 'collapse', border: '1px solid #999', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#eee', borderBottom: '1px solid #000', textAlign: 'left' }}>
                                    <th width="40">Cover</th>
                                    <th>Title / Author</th>
                                    <th>Tags</th>
                                    <th>Shelf</th>
                                    <th align="center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBooks.map(book => {
                                    let cover = null;
                                    try {
                                        const links = typeof book.imageLinks === 'string' ? JSON.parse(book.imageLinks) : book.imageLinks;
                                        cover = links?.thumbnail;
                                    } catch(e){}

                                    return (
                                        <tr key={book.id} style={{ borderBottom: '1px solid #ddd' }}>
                                            <td>
                                                {cover && <img src={cover} alt="" style={{ width: '30px', height: '45px', border: '1px solid #999' }} />}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 'bold' }}>{book.title}</div>
                                                <div style={{ fontSize: '12px', color: '#555' }}>
                                                    {arrayToString(book.authors)}
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '12px', color: '#444' }}>
                                                {arrayToString(book.tags)}
                                            </td>
                                            <td>
                                                <span style={{ 
                                                    border: '1px solid #ccc', padding: '2px 5px', fontSize: '11px',
                                                    backgroundColor: book.shelf === 'currentlyReading' ? '#e6f7ff' : book.shelf === 'read' ? '#f6ffed' : '#fff'
                                                }}>
                                                    {book.shelf}
                                                </span>
                                            </td>
                                            <td align="center">
                                                <button onClick={() => startEditing(book)} style={{ marginRight: '8px', cursor: 'pointer', background: 'none', border: 'none', color: 'blue' }} title="Edit">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteBook(book.id, book.title)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'red' }} title="Delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredBooks.length === 0 && (
                                    <tr><td colSpan="5" align="center" style={{ padding: '20px', fontStyle: 'italic' }}>No books found in library.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Edit Modal */}
                    {editingBook && (
                        <div style={{ 
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                            backgroundColor: 'rgba(0,0,0,0.6)', 
                            display: 'flex', justifyContent: 'center', alignItems: 'center', 
                            zIndex: 1000 
                        }}>
                            <div style={{ 
                                backgroundColor: '#fff', 
                                padding: '20px', 
                                width: '90%', 
                                maxWidth: '600px', 
                                maxHeight: '90vh', 
                                overflowY: 'auto', 
                                border: '2px solid black',
                                boxShadow: '10px 10px 0px rgba(0,0,0,0.5)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                    <h2 style={{ margin: 0, fontSize: '20px' }}>Edit: {editingBook.title}</h2>
                                    <button onClick={() => setEditingBook(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                                </div>
                                
                                <form onSubmit={handleUpdateBook} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Title</label>
                                        <input 
                                            type="text" 
                                            value={editingBook.title} 
                                            onChange={e => setEditingBook({...editingBook, title: e.target.value})}
                                            style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Authors (comma separated)</label>
                                        <input 
                                            type="text" 
                                            value={editingBook.authorsInput} 
                                            onChange={e => setEditingBook({...editingBook, authorsInput: e.target.value})}
                                            style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Shelf</label>
                                            <select 
                                                value={editingBook.shelf}
                                                onChange={e => setEditingBook({...editingBook, shelf: e.target.value})}
                                                style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                            >
                                                <option value="watchlist">Watchlist</option>
                                                <option value="currentlyReading">Reading Now</option>
                                                <option value="read">Finished</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Progress (%)</label>
                                            <input 
                                                type="number" 
                                                min="0" max="100"
                                                value={editingBook.readingProgress} 
                                                onChange={e => setEditingBook({...editingBook, readingProgress: e.target.value})}
                                                style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Reading Medium</label>
                                            <input 
                                                type="text" 
                                                value={editingBook.readingMedium || ''} 
                                                onChange={e => setEditingBook({...editingBook, readingMedium: e.target.value})}
                                                placeholder="e.g. Kindle"
                                                style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Started</label>
                                            <input 
                                                type="date" 
                                                value={editingBook.startedOn || ''} 
                                                onChange={e => setEditingBook({...editingBook, startedOn: e.target.value})}
                                                style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Finished</label>
                                            <input 
                                                type="date" 
                                                value={editingBook.finishedOn || ''} 
                                                onChange={e => setEditingBook({...editingBook, finishedOn: e.target.value})}
                                                style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Tags (comma separated)</label>
                                        <input 
                                            type="text" 
                                            value={editingBook.tagsInput} 
                                            onChange={e => setEditingBook({...editingBook, tagsInput: e.target.value})}
                                            placeholder="e.g. Fiction, History, Tech"
                                            style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Description</label>
                                        <textarea 
                                            value={editingBook.bookDescription || ''} 
                                            onChange={e => setEditingBook({...editingBook, bookDescription: e.target.value})}
                                            rows="4"
                                            style={{ width: '100%', padding: '6px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                        />
                                    </div>

                                    <div style={{ borderTop: '1px solid #eee', paddingTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                        <button type="button" onClick={() => setEditingBook(null)} style={{ padding: '8px 15px', background: '#eee', border: '1px solid #ccc', cursor: 'pointer' }}>Cancel</button>
                                        <button type="submit" style={{ padding: '8px 20px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Save size={16} /> Save Changes
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Dashboard;
