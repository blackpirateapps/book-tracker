import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BookCard = ({ book, onEdit, onDelete, onMove, onImportHighlights }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const coverUrl = book.imageLinks?.thumbnail || 'https://placehold.co/80x120/e2e8f0/475569?text=N/A';
  const authors = book.authors ? book.authors.join(', ') : 'Unknown Author';
  const progress = book.readingProgress || 0;
  
  const handleAction = async (action) => {
    setIsLoading(true);
    try {
      await action();
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="relative bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors" data-book-id={book.id}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center rounded-lg z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      <div className="flex items-start space-x-4">
        <img
          src={coverUrl}
          alt={book.title}
          className="w-20 h-28 object-cover rounded cursor-pointer"
          onClick={() => navigate(`/details/${book.id}`)}
        />
        
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-lg text-gray-100 mb-1 cursor-pointer hover:text-blue-400 truncate"
            onClick={() => navigate(`/details/${book.id}`)}
          >
            {book.title}
          </h3>
          <p className="text-gray-400 text-sm mb-2 truncate">{authors}</p>
          
          {book.shelf === 'currentlyReading' && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {book.shelf === 'read' && book.finishedOn && (
            <p className="text-sm text-gray-400 mb-2">
              Finished: {new Date(book.finishedOn).toLocaleDateString()}
            </p>
          )}
          
          {book.readingMedium && book.readingMedium !== 'Not set' && (
            <span className="inline-block px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded mb-2">
              {book.readingMedium}
            </span>
          )}
          
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={() => onEdit(book)} className="text-sm text-blue-400 hover:text-blue-300">
              Edit
            </button>
            
            {book.shelf !== 'watchlist' && (
              <button
                onClick={() => handleAction(() => onMove(book.id, 'watchlist'))}
                className="text-sm text-gray-400 hover:text-gray-300"
              >
                → Watchlist
              </button>
            )}
            
            {book.shelf !== 'currentlyReading' && (
              <button
                onClick={() => handleAction(() => onMove(book.id, 'currentlyReading'))}
                className="text-sm text-gray-400 hover:text-gray-300"
              >
                → Reading
              </button>
            )}
            
            {book.shelf !== 'read' && (
              <button
                onClick={() => handleAction(() => onMove(book.id, 'read'))}
                className="text-sm text-gray-400 hover:text-gray-300"
              >
                → Read
              </button>
            )}
            
            <button
              onClick={() => onImportHighlights(book)}
              className="text-sm text-green-400 hover:text-green-300"
            >
              Import Highlights
            </button>
            
            <button
              onClick={() => handleAction(() => onDelete(book.id))}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookCard;