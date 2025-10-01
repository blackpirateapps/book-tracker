import React, { useState, useEffect, useRef } from 'react';
import { searchOpenLibrary } from '../services/bookService';

const SearchBar = ({ onSelectBook }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  
  useEffect(() => {
    if (query.length < 3) {
      setShowResults(false);
      return;
    }
    
    setIsSearching(true);
    setShowResults(true);
    
    const timer = setTimeout(async () => {
      try {
        const data = await searchOpenLibrary(query);
        setResults(data.docs || []);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [query]);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleSelectBook = (book, shelf) => {
    onSelectBook(book, shelf);
    setQuery('');
    setShowResults(false);
  };
  
  return (
    <div className="flex-1 w-full md:max-w-2xl md:mx-8 relative" ref={searchRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all text-sm md:text-base"
          placeholder="Search library or add new books..."
        />
        <svg className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
      
      {showResults && (
        <div className="absolute top-full mt-2 w-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl max-h-[70vh] overflow-y-auto z-50">
          {isSearching ? (
            <div className="p-4 text-center text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm">Searching...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-gray-400">No books found</div>
          ) : (
            results.map((book, index) => {
              const coverUrl = book.cover_i
                ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
                : 'https://placehold.co/80x120/e2e8f0/475569?text=N/A';
              
              return (
                <div
                  key={index}
                  className="flex items-start p-3 space-x-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <img 
                    src={coverUrl} 
                    alt={book.title} 
                    className="w-12 h-16 object-cover rounded flex-shrink-0" 
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm line-clamp-2">{book.title}</h4>
                    <p className="text-xs text-gray-600 truncate">
                      {(book.author_name || []).join(', ')}
                    </p>
                    {book.first_publish_year && (
                      <p className="text-xs text-gray-500">{book.first_publish_year}</p>
                    )}
                  </div>
                  <div className="flex flex-col space-y-1 flex-shrink-0">
                    <button
                      onClick={() => handleSelectBook(book, 'currentlyReading')}
                      className="p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
                      title="Add to Currently Reading"
                    >
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                      </svg>
                    </button>
                    <button
                      onClick={() => handleSelectBook(book, 'watchlist')}
                      className="p-2 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors group"
                      title="Add to Watchlist"
                    >
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;