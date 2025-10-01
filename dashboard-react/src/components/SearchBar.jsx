import React, { useState, useEffect } from 'react';
import { searchOpenLibrary } from '../services/bookService';

const SearchBar = ({ onSelectBook }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
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
  
  const handleSelectBook = (book) => {
    onSelectBook(book);
    setQuery('');
    setShowResults(false);
    setIsExpanded(false);
  };
  
  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          className={`px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500 transition-all duration-300 ${
            isExpanded ? 'w-64' : 'w-48'
          }`}
          placeholder="Search books..."
        />
        <button
          onClick={() => {
            setIsExpanded(!isExpanded);
            if (isExpanded) {
              setQuery('');
              setShowResults(false);
            }
          }}
          className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>
      
      {showResults && (
        <div className="absolute top-full mt-2 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto z-10">
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
                  className="flex items-center p-3 space-x-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
                >
                  <img src={coverUrl} alt={book.title} className="w-12 h-16 object-cover rounded" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-100 truncate">{book.title}</h4>
                    <p className="text-sm text-gray-400 truncate">
                      {(book.author_name || []).join(', ')}
                    </p>
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