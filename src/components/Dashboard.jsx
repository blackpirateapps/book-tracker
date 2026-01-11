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
    RefreshCw
} from 'lucide-react';

const Dashboard = ({ onBack }) => {
    // Auth State
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    // Data State
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [filter, setFilter] = useState('');

    // Action State
    const [newBookOLID, setNewBookOLID] = useState('');
    const [newBookShelf, setNewBookShelf] = useState('watchlist');
    const [isAdding, setIsAdding] = useState(false);
    const [editingBook, setEditingBook] = useState(null);

    // --- Authentication & Initialization ---

    const handleLogin = (e) => {
        e.preventDefault();
        // Try to fetch books to verify access/connection
        if (password) {
            setIsAuthenticated(true);
            fetchBooks();
        }
    };

    const fetchBooks = async () => {
        setLoading(true);
        setError(null);
        try {
            // Using the books endpoint which usually returns all raw data
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

    // Convert Array/JSON -> Comma Separated String
    const arrayToString = (data) => {
        if (!data) return '';
        try {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            if (Array.isArray(parsed)) return parsed.join(', ');
            return String(parsed);
        } catch (e) {
            return String(data); // Fallback for raw strings
        }
    };

    // Convert Comma Separated String -> Array
    const stringToArray = (str) => {
        if (!str) return [];
        return str.split(',').map(s => s.trim()).filter(Boolean);
    };

    // --- Actions ---

    const handleAddBook = async (e) => {
        e.preventDefault();
        if (!newBookOLID.trim()) return;

        setIsAdding(true);
        setError(null);
        setSuccessMsg('');

        try {
            const res = await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password,
                    action: 'add',
                    data: { olid: newBookOLID.trim(), shelf: newBookShelf }
                })
            });

            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Failed to add book');
            
            setSuccessMsg(`Successfully added: "${data.book.title}"`);
            setNewBookOLID('');
            fetchBooks(); 
        } catch (e) {
            setError(e.message);
        } finally {
            setIsAdding(false);
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
            // Prepare data for API
            // We transform the comma-separated strings back to Arrays here
            const updatedData = { 
                ...editingBook,
                authors: stringToArray(editingBook.authorsInput),
                tags: stringToArray(editingBook.tagsInput)
            };
            
            // Remove temporary input fields before sending
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

    // Prep book for editing (flatten arrays to strings)
    const startEditing = (book) => {
        setEditingBook({
            ...book,
            authorsInput: arrayToString(book.authors),
            tagsInput: arrayToString(book.tags)
        });
    };

    // --- Filtering ---
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

            {/* Notifications */}
            {error && <div style={{ backgroundColor: '#ffe6e6', color: '#d00', padding: '10px', border: '1px solid #d00', marginBottom: '15px' }}>Error: {error}</div>}
            {successMsg && <div style={{ backgroundColor: '#e6fffa', color: '#006600', padding: '10px', border: '1px solid #006600', marginBottom: '15px' }}>{successMsg}</div>}

            {/* Add Book Panel */}
            <div style={{ backgroundColor: '#f4f4f4', padding: '15px', border: '1px solid #999', marginBottom: '30px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', borderBottom: '1px dotted #999', paddingBottom: '5px' }}>
                    <Plus size={14} style={{ display: 'inline' }} /> Add Book via OpenLibrary
                </h3>
                <form onSubmit={handleAddBook} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '3px' }}>OLID (e.g. OL27448W):</label>
                        <input 
                            type="text" 
                            value={newBookOLID}
                            onChange={e => setNewBookOLID(e.target.value)}
                            placeholder="OL..."
                            style={{ width: '100%', padding: '6px', border: '1px solid #999' }}
                            required
                        />
                    </div>
                    <div style={{ width: '150px' }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '3px' }}>Shelf:</label>
                        <select 
                            value={newBookShelf} 
                            onChange={e => setNewBookShelf(e.target.value)}
                            style={{ width: '100%', padding: '6px', border: '1px solid #999' }}
                        >
                            <option value="watchlist">Watchlist</option>
                            <option value="currentlyReading">Reading Now</option>
                            <option value="read">Finished</option>
                        </select>
                    </div>
                    <button type="submit" disabled={isAdding} style={{ padding: '7px 15px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                        {isAdding ? 'Fetching...' : 'ADD BOOK'}
                    </button>
                </form>
            </div>

            {/* Filter */}
            <div style={{ marginBottom: '10px', textAlign: 'right' }}>
                <Search size={12} style={{ display: 'inline', marginRight: '5px' }} />
                <input 
                    type="text" 
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    placeholder="Filter list..."
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
                            <tr><td colSpan="5" align="center" style={{ padding: '20px', fontStyle: 'italic' }}>No books found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- EDIT MODAL --- */}
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
                            
                            {/* Basic Info */}
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

                            {/* Status Row */}
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

                            {/* Medium & Dates */}
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

                            {/* Tags & Desc */}
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
        </div>
    );
};

export default Dashboard;