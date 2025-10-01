import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchBooks, updateBook, deleteBook } from '../services/bookService';
import { groupBooksIntoLibrary } from '../utils/bookParser';
import { showGlobalToast } from '../hooks/useToast';
import Shelf from '../components/Shelf';
import SearchBar from '../components/SearchBar';
import EditBookModal from '../components/EditBookModal';
import PasswordModal from '../components/PasswordModal';
import HighlightsManager from '../components/HighlightsManager';
import SkeletonLoader from '../components/SkeletonLoader';

const Dashboard = () => {
  const { isAuthenticated, password, authenticate } = useAuth();
  const [library, setLibrary] = useState({ watchlist: [], currentlyReading: [], read: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showHighlightsModal, setShowHighlightsModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  
  useEffect(() => {
    loadBooks();
  }, []);
  
  const loadBooks = async () => {
    try {
      const books = await fetchBooks();
      setLibrary(groupBooksIntoLibrary(books));
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
  };
  
  const handleSelectBook = (openLibraryBook) => {
    requireAuth(async (pwd) => {
      try {
        const bookData = {
          olid: openLibraryBook.key.replace('/works/', ''),
          shelf: 'watchlist'
        };
        
        await updateBook(bookData, pwd);
        await loadBooks();
        showGlobalToast('Book added successfully', 'success');
      } catch (error) {
        showGlobalToast(error.message, 'error');
      }
    });
  };
  
  const handleEditBook = (book) => {
    setSelectedBook(book);
    setShowEditModal(true);
  };
  
  const handleSaveBook = (updatedBook) => {
    requireAuth(async (pwd) => {
      try {
        await updateBook({
          id: updatedBook.id,
          title: updatedBook.title,
          authors: JSON.stringify(updatedBook.authors),
          imageLinks: JSON.stringify(updatedBook.imageLinks),
          readingProgress: updatedBook.readingProgress,
          readingMedium: updatedBook.readingMedium,
          startedOn: updatedBook.startedOn,
          finishedOn: updatedBook.finishedOn,
          shelf: updatedBook.shelf
        }, pwd);
        
        await loadBooks();
        showGlobalToast('Book updated successfully', 'success');
      } catch (error) {
        showGlobalToast(error.message, 'error');
      }
    });
  };
  
  const handleMoveBook = (bookId, newShelf) => {
    requireAuth(async (pwd) => {
      try {
        await updateBook({ id: bookId, shelf: newShelf }, pwd);
        await loadBooks();
        showGlobalToast('Book moved successfully', 'success');
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
        await loadBooks();
        showGlobalToast('Book removed successfully', 'success');
      } catch (error) {
        showGlobalToast(error.message, 'error');
      }
    });
  };
  
  const handleImportHighlights = (book) => {
    setSelectedBook(book);
    setShowHighlightsModal(true);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-100">Book Tracker Dashboard</h1>
          <div className="flex items-center space-x-4">
            <SearchBar onSelectBook={handleSelectBook} />
            <Link to="/admin" className="btn-secondary">
              Admin Tools
            </Link>
          </div>
        </div>
        
        {!isAuthenticated && (
          <div className="bg-yellow-600 text-white px-4 py-3 rounded-lg mb-6">
            <p>You are in view-only mode. Authenticate to make changes.</p>
          </div>
        )}
        
        {isLoading ? (
          <SkeletonLoader />
        ) : (
          <>
            <Shelf
              shelf="currentlyReading"
              books={library.currentlyReading}
              onEdit={handleEditBook}
              onDelete={handleDeleteBook}
              onMove={handleMoveBook}
              onImportHighlights={handleImportHighlights}
            />
            <Shelf
              shelf="read"
              books={library.read}
              onEdit={handleEditBook}
              onDelete={handleDeleteBook}
              onMove={handleMoveBook}
              onImportHighlights={handleImportHighlights}
            />
            <Shelf
              shelf="watchlist"
              books={library.watchlist}
              onEdit={handleEditBook}
              onDelete={handleDeleteBook}
              onMove={handleMoveBook}
              onImportHighlights={handleImportHighlights}
            />
          </>
        )}
      </div>
      
      <EditBookModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        book={selectedBook}
        onSave={handleSaveBook}
      />
      
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handlePasswordConfirm}
      />
      
      {showHighlightsModal && (
        <div className="modal-overlay" onClick={() => setShowHighlightsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <HighlightsManager
              book={selectedBook}
              onUpdate={handleSaveBook}
              password={password}
            />
            <button onClick={() => setShowHighlightsModal(false)} className="btn-secondary mt-4">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;