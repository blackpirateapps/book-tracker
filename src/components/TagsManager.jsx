import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Tag, CheckSquare, Save } from 'lucide-react';

const TAG_COLORS = ['blue', 'purple', 'green', 'emerald', 'amber', 'orange', 'red', 'gray'];

const TagsManager = ({ password, onBack }) => {
    const [tags, setTags] = useState([]);
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');

    // State for actions
    const [view, setView] = useState('list'); // 'list', 'create', 'edit', 'bulk'
    const [editingTag, setEditingTag] = useState(null);
    const [selectedTagForBulk, setSelectedTagForBulk] = useState(null);
    const [selectedBooks, setSelectedBooks] = useState([]);

    // Form Data
    const [tagName, setTagName] = useState('');
    const [tagColor, setTagColor] = useState(TAG_COLORS[0]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch Tags
            const tagsRes = await fetch('/api/public?action=tags');
            if (tagsRes.ok) setTags(await tagsRes.json());

            // Fetch Books (needed for bulk add)
            // Using public endpoint as it is lighter, or books endpoint if we need all fields
            const booksRes = await fetch('/api/public?limit=1000'); // Fetch mostly all for management
            if (booksRes.ok) setBooks(await booksRes.json());

        } catch (e) {
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTag = async (e) => {
        e.preventDefault();
        if (!tagName) return;

        try {
            const res = await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password,
                    action: 'tag-create',
                    data: { name: tagName, color: tagColor }
                })
            });

            if (!res.ok) throw new Error('Failed to create tag');

            setSuccessMsg('Tag created!');
            setTagName('');
            setView('list');
            loadData();
        } catch (e) {
            setError(e.message);
        }
    };

    const handleUpdateTag = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password,
                    action: 'tag-update',
                    data: { id: editingTag.id, name: tagName, color: tagColor }
                })
            });

            if (!res.ok) throw new Error('Failed to update tag');

            setSuccessMsg('Tag updated!');
            setEditingTag(null);
            setView('list');
            loadData();
        } catch (e) {
            setError(e.message);
        }
    };

    const handleDeleteTag = async (id) => {
        if (!window.confirm('Delete this tag?')) return;
        try {
            const res = await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password,
                    action: 'tag-delete',
                    data: { id }
                })
            });

            if (!res.ok) throw new Error('Failed to delete tag');

            setSuccessMsg('Tag deleted');
            loadData();
        } catch (e) {
            setError(e.message);
        }
    };

    const handleBulkAdd = async () => {
        if (selectedBooks.length === 0) return;
        try {
            const res = await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password,
                    action: 'tag-bulk-add',
                    data: { tagId: selectedTagForBulk.id, bookIds: selectedBooks }
                })
            });

            if (!res.ok) throw new Error('Bulk add failed');

            setSuccessMsg(`Added tag to ${selectedBooks.length} books`);
            setView('list');
            setSelectedBooks([]);
            loadData();
        } catch (e) {
            setError(e.message);
        }
    };

    // --- Helpers ---
    const startEdit = (tag) => {
        setEditingTag(tag);
        setTagName(tag.name);
        setTagColor(tag.color);
        setView('edit');
    };

    const startBulk = (tag) => {
        setSelectedTagForBulk(tag);
        setSelectedBooks([]);
        setView('bulk');
    };

    const toggleBookSelection = (id) => {
        setSelectedBooks(prev =>
            prev.includes(id) ? prev.filter(bId => bId !== id) : [...prev, id]
        );
    };

    // --- RENDER ---

    return (
        <div style={{ fontFamily: '"Times New Roman", serif', padding: '10px' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid black', paddingBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>Tags Manager</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { setView('create'); setTagName(''); }} style={{ cursor: 'pointer', padding: '5px 10px', backgroundColor: '#eee', border: '1px solid #999', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Plus size={14} /> New Tag
                    </button>
                    <button onClick={onBack} style={{ cursor: 'pointer', padding: '5px 10px', backgroundColor: 'white', border: '1px solid #999' }}>
                        Close
                    </button>
                </div>
            </div>

            {error && <div style={{ color: 'red', border: '1px solid red', padding: '10px', marginBottom: '10px' }}>{error}</div>}
            {successMsg && <div style={{ color: 'green', border: '1px solid green', padding: '10px', marginBottom: '10px' }}>{successMsg}</div>}

            {/* VIEWS */}

            {(view === 'create' || view === 'edit') && (
                <div style={{ backgroundColor: '#f9f9f9', padding: '20px', border: '1px solid #ccc', marginBottom: '20px' }}>
                    <h3>{view === 'create' ? 'Create New Tag' : 'Edit Tag'}</h3>
                    <form onSubmit={view === 'create' ? handleCreateTag : handleUpdateTag}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontWeight: 'bold' }}>Name:</label>
                            <input
                                type="text"
                                value={tagName}
                                onChange={e => setTagName(e.target.value)}
                                style={{ width: '100%', padding: '8px', border: '1px solid #999' }}
                                required
                            />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontWeight: 'bold' }}>Color:</label>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                {TAG_COLORS.map(color => (
                                    <div
                                        key={color}
                                        onClick={() => setTagColor(color)}
                                        style={{
                                            width: '25px', height: '25px', backgroundColor: color === 'white' ? '#eee' : color,
                                            border: tagColor === color ? '2px solid black' : '1px solid #ccc',
                                            cursor: 'pointer'
                                        }}
                                        title={color}
                                    />
                                ))}
                            </div>
                            <small>Selected: {tagColor}</small>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="submit" style={{ padding: '8px 15px', backgroundColor: 'black', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Save size={14} /> Save
                            </button>
                            <button type="button" onClick={() => setView('list')} style={{ padding: '8px 15px', backgroundColor: '#fff', border: '1px solid #999', cursor: 'pointer' }}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {view === 'bulk' && (
                <div style={{ backgroundColor: '#f0f8ff', padding: '20px', border: '1px solid #0000AA', marginBottom: '20px' }}>
                    <h3>Add "{selectedTagForBulk.name}" to Books</h3>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ccc', backgroundColor: 'white', padding: '10px', marginBottom: '15px' }}>
                        {books.map(book => (
                            <div key={book.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                                <input
                                    type="checkbox"
                                    id={`book_${book.id}`}
                                    checked={selectedBooks.includes(book.id)}
                                    onChange={() => toggleBookSelection(book.id)}
                                    style={{ marginRight: '10px' }}
                                />
                                <label htmlFor={`book_${book.id}`} style={{ cursor: 'pointer' }}>{book.title}</label>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleBulkAdd} style={{ padding: '8px 15px', backgroundColor: '#0000AA', color: 'white', border: 'none', cursor: 'pointer' }}>
                            Apply to {selectedBooks.length} Books
                        </button>
                        <button onClick={() => setView('list')} style={{ padding: '8px 15px', backgroundColor: '#fff', border: '1px solid #999', cursor: 'pointer' }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* LIST VIEW */}
            {view === 'list' && (
                <table width="100%" cellPadding="10" style={{ borderCollapse: 'collapse', border: '1px solid #999' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#eee', borderBottom: '1px solid #000', textAlign: 'left' }}>
                            <th>Name</th>
                            <th>Color</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tags.map(tag => (
                            <tr key={tag.id} style={{ borderBottom: '1px solid #ddd' }}>
                                <td>
                                    <span style={{
                                        backgroundColor: '#f4f4f4', border: '1px solid #ccc',
                                        padding: '2px 6px', fontSize: '12px', fontFamily: 'monospace', textTransform: 'uppercase'
                                    }}>
                                        {tag.name}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ width: '20px', height: '20px', backgroundColor: tag.color, border: '1px solid #ccc' }}></div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => startEdit(tag)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'blue' }} title="Edit">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => startBulk(tag)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'green' }} title="Bulk Add">
                                            <CheckSquare size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteTag(tag.id)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'red' }} title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {tags.length === 0 && <tr><td colSpan="3" align="center">No tags found.</td></tr>}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default TagsManager;