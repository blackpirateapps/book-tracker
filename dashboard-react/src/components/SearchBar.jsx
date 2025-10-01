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
  
  const handleSelectBook = (book) => {
    onSelectBook(book);
    setQuery('');
    setShowResults(false);
  };
  
  return (
    <div className="flex-1 max-w-2xl mx-4 md:mx-8 relative" ref={searchRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm transition-all"
          placeholder="Search library or add new books..."
        />
        <svg className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
      
      {showResults && (
        <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-96 overflow-y-auto z-50">
          {isSearching ? (
            <div className="p-4 text-center text-gray-400">Searching...</div>
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
                  onClick={() => handleSelectBook(book)}
                  className="flex items-center p-3 space-x-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <img src={coverUrl} alt={book.title} className="w-12 h-16 object-cover rounded" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{book.title}</h4>
                    <p className="text-sm text-gray-600 truncate">
                      {(book.author_name || []).join(', ')}
                    </p>
                    {book.first_publish_year && (
                      <p className="text-xs text-gray-500">{book.first_publish_year}</p>
                    )}
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