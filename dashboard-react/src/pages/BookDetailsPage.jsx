import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchBooks, fetchTags, updateBook } from '../services/bookService';
import { showGlobalToast } from '../hooks/useToast';
import PasswordModal from '../components/PasswordModal';
import { READING_MEDIUMS } from '../utils/constants';

const BookDetailsPage = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { password, authenticate } = useAuth();
  const [book, setBook] = useState(null);
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedBook, setEditedBook] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    loadData();
  }, [bookId]);

  const loadData = async () => {
    try {
      const [booksData, tagsData] = await Promise.all([fetchBooks(), fetchTags()]);
      const foundBook = booksData.find(b => b.id === bookId);
      if (!foundBook) {
        showGlobalToast('Book not found', 'error');
        navigate('/');
        return;
      }
      setBook(foundBook);
      setTags(tagsData);
    } catch (error) {
      showGlobalToast('Failed to load book details', 'error');
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

  const startEdit = () => {
    setIsEditMode(true);
    // FIX: Ensure authors is always an array before calling .join()
    const authorsArray = Array.isArray(book.authors) ? book.authors : [book.authors || ''];
    setEditedBook({
      ...book,
      authors: authorsArray.join(', '),
      highlights: (book.highlights || []).map(h => `- ${h}`).join('\n')
    });
  };

  const cancelEdit = () => {
    setIsEditMode(false);
    setEditedBook(null);
  };

  const handleChange = (field, value) => {
    setEditedBook(prev => ({ ...prev, [field]: value }));
  };

  const handleTagToggle = (tagId) => {
    setEditedBook(prev => {
      const currentTags = prev.tags || [];
      const newTags = currentTags.includes(tagId)
        ? currentTags.filter(id => id !== tagId)
        : [...currentTags, tagId];
      return { ...prev, tags: newTags };
    });
  };

  const addHighlight = () => {
    const newHighlight = prompt('Enter your highlight:');
    if (newHighlight && newHighlight.trim()) {
      const currentHighlights = editedBook.highlights || '';
      const newHighlights = currentHighlights 
        ? `${currentHighlights}
- ${newHighlight.trim()}`
        : `- ${newHighlight.trim()}`;
      setEditedBook(prev => ({
        ...prev,
        highlights: newHighlights
      }));
    }
  };

  const removeHighlight = (index) => {
    if (confirm('Remove this highlight?')) {
      const highlightsArray = editedBook.highlights
        .split('\n')
        .filter(h => h.trim().startsWith('- '))
        .map(h => h.substring(2).trim());
      
      highlightsArray.splice(index, 1);
      
      setEditedBook(prev => ({
        ...prev,
        highlights: highlightsArray.map(h => `- ${h}`).join('
')
      }));
    }
  };

  const saveEdit = () => {
    requireAuth(async (pwd) => {
      try {
        // Parse authors
        const authorsArray = editedBook.authors
          .split(',')
          .map(a => a.trim())
          .filter(a => a);

        // Parse highlights
        const highlightsArray = editedBook.highlights
          .split('
')
          .filter(h => h.trim().startsWith('- '))
          .map(h => h.substring(2).trim());

        const updatedBook = {
          ...book,
          ...editedBook,
          authors: authorsArray,
          highlights: highlightsArray
        };

        await updateBook(updatedBook, pwd);
        await loadData();
        showGlobalToast('Book updated successfully', 'success');
        setIsEditMode(false);
        setEditedBook(null);
      } catch (error) {
        showGlobalToast(error.message, 'error');
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Book not found</p>
          <Link to="/" className="btn-primary">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  const displayBook = isEditMode ? editedBook : book;
  const coverUrl = book.imageLinks?.thumbnail || 'https://placehold.co/400x600/e2e8f0/475569?text=No+Cover';
  const bookTags = tags.filter(tag => (book.tags || []).includes(tag.id));
  const highlights = book.highlights || [];

  // FIX: Ensure authors is always treated as an array
  const authorsArray = Array.isArray(book.authors) ? book.authors : [book.authors || 'Unknown Author'];
  const authorsDisplay = authorsArray.join(', ');

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="glass-effect sticky top-0 z-50 shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Book Details</h1>
            <div className="flex items-center space-x-2">
              {!isEditMode ? (
                <>
                  <button onClick={startEdit} className="btn-primary text-sm flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    <span>Edit</span>
                  </button>
                  <Link to="/" className="btn-secondary text-sm">
                    Back
                  </Link>
                </>
              ) : (
                <>
                  <button onClick={saveEdit} className="btn-primary text-sm">
                    Save Changes
                  </button>
                  <button onClick={cancelEdit} className="btn-secondary text-sm">
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Cover Image */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
              <img
                src={coverUrl}
                alt={book.title}
                className="w-full rounded-lg shadow-lg mb-4"
              />

              {/* Quick Stats */}
              {book.shelf === 'currentlyReading' && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600 font-medium">Progress</span>
                    <span className="text-blue-600 font-bold">{book.readingProgress || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${book.readingProgress || 0}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {book.shelf === 'read' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <svg className="w-8 h-8 text-green-600 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                  <p className="text-sm font-medium text-green-800">Completed</p>
                </div>
              )}

              {book.shelf === 'watchlist' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                  <svg className="w-8 h-8 text-orange-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                  </svg>
                  <p className="text-sm font-medium text-orange-800">On Watchlist</p>
                </div>
              )}
            </div>
          </div>

          {/* Book Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Title */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-sm font-medium text-gray-500 uppercase mb-2">Title</h2>
              {isEditMode ? (
                <input
                  type="text"
                  value={displayBook.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="input-field"
                />
              ) : (
                <h1 className="text-2xl font-bold text-gray-900">{displayBook.title || 'N/A'}</h1>
              )}
            </div>

            {/* Authors */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-sm font-medium text-gray-500 uppercase mb-2">Authors</h2>
              {isEditMode ? (
                <input
                  type="text"
                  value={displayBook.authors}
                  onChange={(e) => handleChange('authors', e.target.value)}
                  className="input-field"
                  placeholder="Comma-separated authors"
                />
              ) : (
                <p className="text-lg text-gray-700">{authorsDisplay || 'N/A'}</p>
              )}
            </div>

            {/* Meta Information Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Publisher</h3>
                {isEditMode ? (
                  <input
                    type="text"
                    value={displayBook.publisher || ''}
                    onChange={(e) => handleChange('publisher', e.target.value)}
                    className="input-field text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-700">{displayBook.publisher || 'N/A'}</p>
                )}
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Published</h3>
                {isEditMode ? (
                  <input
                    type="text"
                    value={displayBook.publishedDate || ''}
                    onChange={(e) => handleChange('publishedDate', e.target.value)}
                    className="input-field text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-700">{displayBook.publishedDate || 'N/A'}</p>
                )}
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Pages</h3>
                {isEditMode ? (
                  <input
                    type="number"
                    value={displayBook.pageCount || ''}
                    onChange={(e) => handleChange('pageCount', e.target.value)}
                    className="input-field text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-700">{displayBook.pageCount || 'N/A'}</p>
                )}
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Reading Medium</h3>
                {isEditMode ? (
                  <select
                    value={displayBook.readingMedium || 'Not set'}
                    onChange={(e) => handleChange('readingMedium', e.target.value)}
                    className="input-field text-sm"
                  >
                    {READING_MEDIUMS.map(medium => (
                      <option key={medium} value={medium}>{medium}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-gray-700">{displayBook.readingMedium || 'N/A'}</p>
                )}
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Started On</h3>
                {isEditMode ? (
                  <input
                    type="date"
                    value={displayBook.startedOn || ''}
                    onChange={(e) => handleChange('startedOn', e.target.value)}
                    className="input-field text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-700">
                    {book.startedOn ? new Date(book.startedOn).toLocaleDateString() : 'N/A'}
                  </p>
                )}
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Finished On</h3>
                {isEditMode ? (
                  <input
                    type="date"
                    value={displayBook.finishedOn || ''}
                    onChange={(e) => handleChange('finishedOn', e.target.value)}
                    className="input-field text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-700">
                    {book.finishedOn ? new Date(book.finishedOn).toLocaleDateString() : 'N/A'}
                  </p>
                )}
              </div>
            </div>

            {/* Reading Progress (only show for currently reading) */}
            {(book.shelf === 'currentlyReading' || isEditMode) && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-sm font-medium text-gray-500 uppercase mb-2">Reading Progress</h2>
                {isEditMode ? (
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={displayBook.readingProgress || 0}
                      onChange={(e) => handleChange('readingProgress', parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-lg font-bold text-blue-600 min-w-[50px]">
                      {displayBook.readingProgress || 0}%
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${book.readingProgress || 0}%` }}
                      ></div>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{book.readingProgress || 0}%</span>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-sm font-medium text-gray-500 uppercase mb-3">Tags</h2>
              {isEditMode ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => {
                    const isSelected = (displayBook.tags || []).includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => handleTagToggle(tag.id)}
                        className={`px-3 py-1 text-sm font-medium rounded-lg transition-all ${
                          isSelected
                            ? 'ring-2 ring-offset-2'
                            : 'opacity-50 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                          ringColor: isSelected ? tag.color : 'transparent'
                        }}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {bookTags.length > 0 ? (
                    bookTags.map(tag => (
                      <span
                        key={tag.id}
                        className="px-3 py-1 text-sm font-medium rounded-lg"
                        style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No tags assigned</p>
                  )}
                </div>
              )}
            </div>

            {/* Highlights */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-gray-500 uppercase">Highlights</h2>
                {isEditMode && (
                  <button
                    onClick={addHighlight}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Highlight
                  </button>
                )}
              </div>
              {isEditMode ? (
                <textarea
                  value={displayBook.highlights || ''}
                  onChange={(e) => handleChange('highlights', e.target.value)}
                  className="input-field font-mono text-sm"
                  rows="10"
                  placeholder="- Highlight 1&#10;- Highlight 2"
                />
              ) : (
                <div className="space-y-3">
                  {highlights.length > 0 ? (
                    highlights.map((highlight, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                        </svg>
                        <p className="text-sm text-gray-700 flex-1">{highlight}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No highlights yet</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handlePasswordConfirm}
      />
    </div>
  );
};

export default BookDetailsPage;