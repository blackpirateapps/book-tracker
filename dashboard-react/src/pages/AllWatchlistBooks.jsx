import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchBooks, fetchTags, updateBook, deleteBook } from '../services/bookService';
import { groupBooksIntoLibrary } from '../utils/bookParser';
import { showGlobalToast } from '../hooks/useToast';
import BookCard from '../components/BookCard';
import EditBookModal from '../components/EditBookModal';
import PasswordModal from '../components/PasswordModal';

const AllWatchlistBooks = () => {
  const { password, authenticate } = useAuth();
  const [books, setBooks] = useState([]);
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const [booksData, tagsData] = await Promise.all([fetchBooks(), fetchTags()]);
      const library = groupBooksIntoLibrary(booksData);
      setBooks(library.watchlist);
      setTags(tagsData);
    } catch (error) {
      showGlobalToast('Failed to load books', 'error');
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
  
  const handleEditBook = (book) => {
    setSelectedBook(book);
    setShowEditModal(true);
  };
  
  const handleSaveBook = (updatedBook) => {
    requireAuth(async (pwd) => {
      try {
        await updateBook(updatedBook, pwd);
        await loadData();
        showGlobalToast('Book updated successfully', 'success');
        setShowEditModal(false);
      } catch (error) {
        showGlobalToast(error.message, 'error');
      }
    });
  };
  
  const handleDeleteBook = (bookId) => {
    if (!confirm('Are you sure you want to remove this book?')) return;
    
    requireAuth(async (pwd) => {
      try {
        await deleteBook(bookId, pwd);
        await loadData();
        showGlobalToast('Book removed successfully', 'success');
      } catch (error) {
        showGlobalToast(error.message, 'error');
      }
    });
  };
  
  return (
    <div className="min-h-screen">
      <nav className="glass-effect sticky top-0 z-50 shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">All Watchlist Books</h1>
            <Link to="/" className="btn-secondary text-sm">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : books.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
            </svg>
            <p className="text-gray-500 text-lg">No books in watchlist</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-600">Showing {books.length} {books.length === 1 ? 'book' : 'books'}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map(book => (
                <BookCard
                  key={book.id}
                  book={book}
                  tags={tags}
                  onEdit={handleEditBook}
                  onDelete={handleDeleteBook}
                />
              ))}
            </div>
          </>
        )}
      </main>
      
      <EditBookModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        book={selectedBook}
        tags={tags}
        onSave={handleSaveBook}
      />
      
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handlePasswordConfirm}
      />
    </div>
  );
};

export default AllWatchlistBooks;