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
    setEditedBook({
      ...book,
      authors: book.authors?.join(', ') || '',
      highlights: (book.highlights || []).map(h => `- ${h}`).join('\n')
    });
    setIsEditMode(true);
  };

  const cancelEdit = () => {
    setEditedBook(null);
    setIsEditMode(false);
  };

  const handleChange = (field, value) => {
    setEditedBook(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveEdit = async () => {
    requireAuth(async (pwd) => {
      try {
        // Parse highlights from markdown
        const highlightsArray = editedBook.highlights
          .split('\n')
          .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
          .map(line => line.replace(/^[-*]\s*/, '').trim())
          .filter(Boolean);

        // Parse authors
        const authorsArray = editedBook.authors
          .split(',')
          .map(a => a.trim())
          .filter(Boolean);

        const updatedData = {
          ...book,
          ...editedBook,
          authors: authorsArray,
          highlights: highlightsArray
        };

        await updateBook(updatedData, pwd);
        await loadData();
        setIsEditMode(false);
        setEditedBook(null);
        showGlobalToast('Book updated successfully', 'success');
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

  if (!book) return null;

  const displayBook = isEditMode ? editedBook : book;
  const coverUrl = book.imageLinks?.thumbnail || 'https://placehold.co/400x600/e2e8f0/475569?text=No+Cover';
  const bookTags = tags.filter(tag => (book.tags || []).includes(tag.id));
  const highlights = book.highlights || [];

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
                <p className="text-2xl font-bold text-gray-900">{displayBook.title || 'N/A'}</p>
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
                <p className="text-lg text-gray-700">{book.authors?.join(', ') || 'N/A'}</p>
              )}
            </div>

            {/* Book Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Publisher */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Publisher</h3>
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

              {/* Published Date */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Published</h3>
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

              {/* Page Count */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Pages</h3>
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

              {/* Reading Medium */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Reading Medium</h3>
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
            </div>

            {/* Reading Dates & Progress */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Started On</h3>
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
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Finished On</h3>
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

              {isEditMode && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
                    Reading Progress: {displayBook.readingProgress || 0}%
                  </h3>
                  <input
                    type="range"
                    value={displayBook.readingProgress || 0}
                    onChange={(e) => handleChange('readingProgress', e.target.value)}
                    min="0"
                    max="100"
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}

              {isEditMode && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Shelf</h3>
                  <select
                    value={displayBook.shelf || 'watchlist'}
                    onChange={(e) => handleChange('shelf', e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="watchlist">Watchlist</option>
                    <option value="currentlyReading">Currently Reading</option>
                    <option value="read">Read</option>
                  </select>
                </div>
              )}
            </div>

            {/* Description */}
            {book.bookDescription && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Description</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{book.bookDescription}</p>
              </div>
            )}

            {/* Tags */}
            {bookTags.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {bookTags.map(tag => (
                    <span
                      key={tag.id}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg"
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Highlights */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 uppercase mb-4">Highlights</h3>

              {isEditMode ? (
                <div className="space-y-2">
                  <textarea
                    value={displayBook.highlights}
                    onChange={(e) => handleChange('highlights', e.target.value)}
                    className="input-field min-h-[200px] font-mono text-sm"
                    placeholder="- Highlight 1&#10;- Highlight 2&#10;- Highlight 3"
                  />
                  <p className="text-xs text-gray-500">Use markdown list format (- or * at the start of each line)</p>
                </div>
              ) : highlights.length === 0 ? (
                <p className="text-gray-500 italic text-sm">No highlights yet</p>
              ) : (
                <div className="space-y-3">
                  {highlights.map((highlight, index) => (
                    <div key={index} className="pl-4 border-l-4 border-blue-200 py-2">
                      <p className="text-sm text-gray-700">{highlight}</p>
                    </div>
                  ))}
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
