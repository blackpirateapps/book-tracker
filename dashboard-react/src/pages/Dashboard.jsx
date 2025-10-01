import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchBooks, fetchTags, updateBook, deleteBook, addBook } from '../services/bookService';
import { groupBooksIntoLibrary } from '../utils/bookParser';
import { showGlobalToast } from '../hooks/useToast';
import StatCard from '../components/StatCard';
import Shelf from '../components/Shelf';
import SearchBar from '../components/SearchBar';
import EditBookModal from '../components/EditBookModal';
import PasswordModal from '../components/PasswordModal';
import SkeletonLoader from '../components/SkeletonLoader';

const Dashboard = () => {
  const { isAuthenticated, password, authenticate } = useAuth();
  const [library, setLibrary] = useState({ watchlist: [], currentlyReading: [], read: [] });
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
      setLibrary(groupBooksIntoLibrary(booksData));
      setTags(tagsData);
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
  
  const handleSelectBook = (openLibraryBook) => {
    requireAuth(async (pwd) => {
      try {
        const bookData = {
          olid: openLibraryBook.key.replace('/works/', ''),
          shelf: 'watchlist'
        };
        
        await addBook(bookData, pwd);
        await loadData();
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
  
  const allBooks = [...library.watchlist, ...library.currentlyReading, ...library.read];
  const avgProgress = library.currentlyReading.length > 0
    ? Math.round(library.currentlyReading.reduce((sum, book) => sum + (book.readingProgress || 0), 0) / library.currentlyReading.length)
    : 0;
  
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="glass-effect sticky top-0 z-50 shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="gradient-primary p-2 rounded-xl shadow-lg hidden sm:block">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Book Tracker
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">Manage your reading journey</p>
              </div>
            </div>
            
            <SearchBar onSelectBook={handleSelectBook} />
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Link to="/tags" className="hidden sm:block btn-secondary text-sm">
                Tags
              </Link>
              <Link to="/admin" className="btn-secondary text-sm">
                Admin
              </Link>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {!isAuthenticated && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-xl mb-6">
            <p className="text-sm">You are in view-only mode. Changes will require authentication.</p>
          </div>
        )}
        
        {isLoading ? (
          <SkeletonLoader />
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <StatCard
                title="Total Books"
                value={allBooks.length}
                subtitle={`+${library.watchlist.length} in watchlist`}
                icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>}
                iconBg="bg-blue-50"
                index={1}
              />
              
              <StatCard
                title="Reading"
                value={library.currentlyReading.length}
                subtitle={`Average ${avgProgress}% complete`}
                icon={<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                iconBg="bg-purple-50"
                index={2}
              />
              
              <StatCard
                title="Completed"
                value={library.read.length}
                subtitle="Books finished"
                icon={<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                iconBg="bg-green-50"
                index={3}
              />
              
              <StatCard
                title="Watchlist"
                value={library.watchlist.length}
                subtitle="Books to read"
                icon={<svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>}
                iconBg="bg-orange-50"
                index={4}
              />
            </div>
            
            <Shelf
              shelf="currentlyReading"
              books={library.currentlyReading}
              tags={tags}
              onEdit={handleEditBook}
              onDelete={handleDeleteBook}
            />
            
            <Shelf
              shelf="read"
              books={library.read}
              tags={tags}
              onEdit={handleEditBook}
              onDelete={handleDeleteBook}
            />
            
            <Shelf
              shelf="watchlist"
              books={library.watchlist}
              tags={tags}
              onEdit={handleEditBook}
              onDelete={handleDeleteBook}
            />
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

export default Dashboard;