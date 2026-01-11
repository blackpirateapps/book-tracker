import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, 
    Plus, 
    Trash2, 
    Edit, 
    Save, 
    X, 
    Search,
    Lock
} from 'lucide-react';

const Dashboard = ({ onBack }) => {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');

    // Add Book State
    const [newBookOLID, setNewBookOLID] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    // Edit Book State
    const [editingBook, setEditingBook] = useState(null);

    // Filter State
    const [filter, setFilter] = useState('');

    // --- Authentication ---
    const handleLogin = (e) => {
        e.preventDefault();
        // Simple client-side check to persist session temporarily, 
        // real auth happens on every API call.
        if (password) {
            setIsAuthenticated(true);
            fetchBooks();
        }
    };

    // --- Fetch Data ---
    const fetchBooks = async () => {
        setLoading(true);
        try {
            // Re-using the public endpoint for list, but admin actions go to /api/books
            const res = await fetch('/api/public'); 
            if (res.ok) {
                const data = await res.json();
                setBooks(data);
            } else {
                setError('Failed to fetch books');
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---

    const handleAddBook = async (e) => {
        e.preventDefault();
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
                    data: { olid: newBookOLID }
                })
            });

            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Failed to add book');
            
            setSuccessMsg(`Book added: ${data.book.title}`);
            setNewBookOLID('');
            fetchBooks(); // Refresh list
        } catch (e) {
            setError(e.message);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteBook = async (id) => {
        if (!window.confirm('Are you sure you want to delete this book?')) return;

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
            
            setSuccessMsg('Book deleted successfully');
            fetchBooks();
        } catch (e) {
            setError(e.message);
        }
    };

    const handleUpdateBook = async (e) => {
        e.preventDefault();
        
        try {
            // Parse JSON fields back to objects/arrays if they were edited as strings
            const updatedData = { ...editingBook };
            
            // Helper to parse if string, else keep as is
            const safeParse = (val) => {
                if (typeof val === 'string') {
                    try { return JSON.parse(val); } catch(e) { return val; } // Return as string if parse fails (allows simple text updates if schema changes)
                }
                return val;
            };

            // Prepare data for API
            // Note: The API expects these fields. We send them as is, the API handler stringifies them.
            // But if we edited them in a textarea, they are strings. We should try to parse them back to objects
            // if we want the API to re-stringify them correctly, OR just send them if the API handles raw strings.
            // Looking at your API code: `values.push(JSON.stringify(value))` if object.
            // So if we send a string, it saves a string. If we send an object, it saves a stringified object.
            // Best approach: Parse JSON-string fields in UI to objects before sending.
            
            try { updatedData.authors = JSON.parse(editingBook.authors); } catch(e) {}
            try { updatedData.tags = JSON.parse(editingBook.tags); } catch(e) {}
            try { updatedData.highlights = JSON.parse(editingBook.highlights); } catch(e) {}
            
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

    // --- Render Helpers ---

    const filteredBooks = books.filter(b => 
        b.title.toLowerCase().includes(filter.toLowerCase())
    );

    // --- LOGIN VIEW ---
    if (!isAuthenticated) {
        return (
            <div style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center', fontFamily: '"Times New Roman", serif' }}>
                <h2 style={{ borderBottom: '1px solid black', paddingBottom: '10px' }}>Admin Access</h2>
                <form onSubmit={handleLogin} style={{ marginTop: '20px' }}>
                    <input 
                        type="password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter Admin Password"
                        style={{ padding: '8px', width: '100%', marginBottom: '10px' }}
                    />
                    <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#eee', border: '1px solid black' }}>
                        Unlock Dashboard
                    </button>
                </form>
                <button onClick={onBack} style={{ marginTop: '20px', background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}>
                    Cancel
                </button>
            </div>
        );
    }

    // --- DASHBOARD VIEW ---
    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: '"Times New Roman", serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid black', paddingBottom: '10px' }}>
                <h1 style={{ margin: 0, fontSize: '24px' }}>Dashboard</h1>
                <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <ArrowLeft size={16} /> Exit
                </button>
            </div>

            {/* Notifications */}
            {error && <div style={{ backgroundColor: '#fee', color: 'red', padding: '10px', border: '1px solid red', marginBottom: '15px' }}>{error}</div>}
            {successMsg && <div style={{ backgroundColor: '#efe', color: 'green', padding: '10px', border: '1px solid green', marginBottom: '15px' }}>{successMsg}</div>}

            {/* Add Book Section */}
            <div style={{ backgroundColor: '#f9f9f9', padding: '15px', border: '1px solid #ccc', marginBottom: '30px' }}>
                <h3 style={{ margin: '0 0 10px 0' }}>Add New Book</h3>
                <form onSubmit={handleAddBook} style={{ display: 'flex', gap: '10px' }}>
                    <input 
                        type="text" 
                        value={newBookOLID}
                        onChange={e => setNewBookOLID(e.target.value)}
                        placeholder="OpenLibrary ID (e.g., OL27448W)"
                        style={{ flex: 1, padding: '8px' }}
                        required
                    />
                    <button type="submit" disabled={isAdding} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 15px', cursor: 'pointer', backgroundColor: 'black', color: 'white', border: 'none' }}>
                        {isAdding ? 'Adding...' : <><Plus size={16} /> Fetch & Add</>}
                    </button>
                </form>
                <small style={{ color: '#666' }}>Fetches metadata automatically from OpenLibrary.</small>
            </div>

            {/* Book List */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3>Manage Library ({books.length})</h3>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: '8px', top: '8px', color: '#666' }} />
                        <input 
                            type="text" 
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            placeholder="Filter books..."
                            style={{ padding: '5px 5px 5px 25px' }}
                        />
                    </div>
                </div>

                <table width="100%" cellPadding="8" style={{ borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#eee', textAlign: 'left', borderBottom: '1px solid #000' }}>
                            <th>Title</th>
                            <th>Author</th>
                            <th>Shelf</th>
                            <th>Status</th>
                            <th align="right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBooks.map(book => {
                            // Safe parse for display
                            let authors = book.authors;
                            if (typeof authors === 'string') try { authors = JSON.parse(authors); } catch(e){}
                            if (Array.isArray(authors)) authors = authors.join(', ');

                            return (
                                <tr key={book.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td><strong>{book.title}</strong></td>
                                    <td>{authors}</td>
                                    <td>
                                        <span style={{ 
                                            padding: '2px 6px', 
                                            borderRadius: '4px', 
                                            fontSize: '11px', 
                                            backgroundColor: book.shelf === 'read' ? '#e6fffa' : book.shelf === 'currentlyReading' ? '#ebf8ff' : '#fffaf0',
                                            border: '1px solid #ccc'
                                        }}>
                                            {book.shelf}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '12px' }}>
                                        {book.shelf === 'currentlyReading' ? `${book.readingProgress}%` : book.shelf === 'read' ? 'Done' : '-'}
                                    </td>
                                    <td align="right">
                                        <button onClick={() => setEditingBook(book)} style={{ marginRight: '10px', cursor: 'pointer', background: 'none', border: 'none', color: 'blue' }} title="Edit">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteBook(book.id)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'red' }} title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* --- EDIT MODAL --- */}
            {editingBook && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
                    <div style={{ backgroundColor: 'white', padding: '20px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid black', boxShadow: '5px 5px 15px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                            <h2 style={{ margin: 0 }}>Edit Book</h2>
                            <button onClick={() => setEditingBook(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        
                        <form onSubmit={handleUpdateBook} style={{ display: 'grid', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px' }}>Title</label>
                                <input 
                                    type="text" 
                                    value={editingBook.title} 
                                    onChange={e => setEditingBook({...editingBook, title: e.target.value})}
                                    style={{ width: '100%', padding: '5px' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px' }}>Shelf</label>
                                    <select 
                                        value={editingBook.shelf}
                                        onChange={e => setEditingBook({...editingBook, shelf: e.target.value})}
                                        style={{ width: '100%', padding: '5px' }}
                                    >
                                        <option value="watchlist">Watchlist</option>
                                        <option value="currentlyReading">Reading Now</option>
                                        <option value="read">Finished</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px' }}>Progress (%)</label>
                                    <input 
                                        type="number" 
                                        min="0" max="100"
                                        value={editingBook.readingProgress} 
                                        onChange={e => setEditingBook({...editingBook, readingProgress: parseInt(e.target.value)})}
                                        style={{ width: '100%', padding: '5px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px' }}>Started On</label>
                                    <input 
                                        type="date" 
                                        value={editingBook.startedOn || ''} 
                                        onChange={e => setEditingBook({...editingBook, startedOn: e.target.value})}
                                        style={{ width: '100%', padding: '5px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px' }}>Finished On</label>
                                    <input 
                                        type="date" 
                                        value={editingBook.finishedOn || ''} 
                                        onChange={e => setEditingBook({...editingBook, finishedOn: e.target.value})}
                                        style={{ width: '100%', padding: '5px' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px' }}>Authors (JSON Array)</label>
                                <input 
                                    type="text" 
                                    value={typeof editingBook.authors === 'string' ? editingBook.authors : JSON.stringify(editingBook.authors)} 
                                    onChange={e => setEditingBook({...editingBook, authors: e.target.value})}
                                    style={{ width: '100%', padding: '5px', fontFamily: 'monospace' }}
                                />
                                <small style={{ color: '#666' }}>e.g. ["Author Name", "Second Author"]</small>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px' }}>Tags (JSON Array of IDs)</label>
                                <input 
                                    type="text" 
                                    value={typeof editingBook.tags === 'string' ? editingBook.tags : JSON.stringify(editingBook.tags)} 
                                    onChange={e => setEditingBook({...editingBook, tags: e.target.value})}
                                    style={{ width: '100%', padding: '5px', fontFamily: 'monospace' }}
                                />
                                <small style={{ color: '#666' }}>e.g. ["1", "3"] (See api/tags for IDs)</small>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px' }}>Highlights (JSON Array)</label>
                                <textarea 
                                    value={typeof editingBook.highlights === 'string' ? editingBook.highlights : JSON.stringify(editingBook.highlights)} 
                                    onChange={e => setEditingBook({...editingBook, highlights: e.target.value})}
                                    style={{ width: '100%', padding: '5px', fontFamily: 'monospace', height: '80px' }}
                                />
                            </div>

                            <button type="submit" style={{ marginTop: '10px', padding: '10px', backgroundColor: 'black', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
                                <Save size={16} /> Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;