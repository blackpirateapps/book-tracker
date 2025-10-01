import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchTags, fetchBooks, createTag, updateTag, deleteTag, bulkAddTagToBooks } from '../services/bookService';
import { showGlobalToast } from '../hooks/useToast';
import PasswordModal from '../components/PasswordModal';
import { TAG_COLORS } from '../utils/constants';

const TagsManager = () => {
  const { password, authenticate } = useAuth();
  const [tags, setTags] = useState([]);
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [editingTag, setEditingTag] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [formData, setFormData] = useState({ name: '', color: TAG_COLORS[0] });
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const [tagsData, booksData] = await Promise.all([fetchTags(), fetchBooks()]);
      setTags(tagsData);
      setBooks(booksData);
    } catch (error) {
      showGlobalToast('Failed to load data', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const requireAuth = (action) => {
    if (password) {
      action(password);
    } else {
      setPendingAction(() => action);
      setShowPasswordModal(true);
    }
  };
  
  const handlePasswordConfirm = (pwd, remember) => {
    authenticate(pwd, remember);
    if (pendingAction) {
      pendingAction(pwd);
      setPendingAction(null);
    }
    setShowPasswordModal(false);
  };
  
  const handleCreateTag = () => {
    if (!formData.name.trim()) {
      showGlobalToast('Tag name is required', 'error');
      return;
    }
    
    requireAuth(async (pwd) => {
      try {
        await createTag(formData, pwd);
        await loadData();
        setShowCreateModal(false);
        setFormData({ name: '', color: TAG_COLORS[0] });
        showGlobalToast('Tag created successfully', 'success');
      } catch (error) {
        showGlobalToast(error.message, 'error');
      }
    });
  };
  
  const handleUpdateTag = () => {
    requireAuth(async (pwd) => {
      try {
        await updateTag({ ...formData, id: editingTag.id }, pwd);
        await loadData();
        setEditingTag(null);
        setFormData({ name: '', color: TAG_COLORS[0] });
        showGlobalToast('Tag updated successfully', 'success');
      } catch (error) {
        showGlobalToast(error.message, 'error');
      }
    });
  };
  
  const handleDeleteTag = (tagId) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    
    requireAuth(async (pwd) => {
      try {
        await deleteTag(tagId, pwd);
        await loadData();
        showGlobalToast('Tag deleted successfully', 'success');
      } catch (error) {
        showGlobalToast(error.message, 'error');
      }
    });
  };
  
  const handleBulkAdd = () => {
    if (selectedBooks.length === 0) {
      showGlobalToast('Please select at least one book', 'error');
      return;
    }
    
    requireAuth(async (pwd) => {
      try {
        await bulkAddTagToBooks(selectedTag, selectedBooks, pwd);
        await loadData();
        setShowBulkModal(false);
        setSelectedBooks([]);
        showGlobalToast(`Tag added to ${selectedBooks.length} books`, 'success');
      } catch (error) {
        showGlobalToast(error.message, 'error');
      }
    });
  };
  
  const openEditModal = (tag) => {
    setEditingTag(tag);
    setFormData({ name: tag.name, color: tag.color });
    setShowCreateModal(true);
  };
  
  const openBulkModal = (tagId) => {
    setSelectedTag(tagId);
    setSelectedBooks([]);
    setShowBulkModal(true);
  };
  
  const toggleBookSelection = (bookId) => {
    setSelectedBooks(prev =>
      prev.includes(bookId)
        ? prev.filter(id => id !== bookId)
        : [...prev, bookId]
    );
  };
  
  return (
    <div className="min-h-screen">
      <nav className="glass-effect sticky top-0 z-50 shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Tags Manager</h1>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setEditingTag(null);
                  setFormData({ name: '', color: TAG_COLORS[0] });
                  setShowCreateModal(true);
                }}
                className="btn-primary text-sm"
              >
                <span className="hidden sm:inline">Create Tag</span>
                <span className="sm:hidden">New</span>
              </button>
              <Link to="/" className="btn-secondary text-sm">
                Back
              </Link>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          </div>
        ) : (
          <>
            {tags.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                </svg>
                <p className="text-gray-500 text-lg mb-4">No tags yet</p>
                <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                  Create Your First Tag
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tags.map(tag => {
                  const taggedBooks = books.filter(book => {
                    try {
                      const bookTags = JSON.parse(book.tags || '[]');
                      return bookTags.includes(tag.id);
                    } catch (e) {
                      return false;
                    }
                  });
                  
                  return (
                    <div key={tag.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          ></div>
                          <h3 className="font-semibold text-gray-900">{tag.name}</h3>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => openEditModal(tag)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteTag(tag.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        {taggedBooks.length} {taggedBooks.length === 1 ? 'book' : 'books'}
                      </p>
                      
                      <button
                        onClick={() => openBulkModal(tag.id)}
                        className="w-full btn-secondary text-sm"
                      >
                        Add to Books
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
      
      {/* Create/Edit Tag Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              {editingTag ? 'Edit Tag' : 'Create New Tag'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tag Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Fiction, Self-Help"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="grid grid-cols-5 gap-2">
                  {TAG_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-full h-10 rounded-lg transition-all ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-purple-600' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    ></button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={editingTag ? handleUpdateTag : handleCreateTag}
                className="btn-primary"
              >
                {editingTag ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Bulk Add Modal */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Add Tag to Books</h2>
            
            <div className="max-h-96 overflow-y-auto space-y-2 mb-4">
              {books.map(book => (
                <label
                  key={book.id}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedBooks.includes(book.id)}
                    onChange={() => toggleBookSelection(book.id)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="flex-1 text-sm text-gray-900">{book.title}</span>
                </label>
              ))}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowBulkModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleBulkAdd} className="btn-primary">
                Add to {selectedBooks.length} {selectedBooks.length === 1 ? 'Book' : 'Books'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handlePasswordConfirm}
      />
    </div>
  );
};

export default TagsManager;