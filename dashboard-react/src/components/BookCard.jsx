import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BookCard = ({ book, onEdit, onDelete, onMove, tags = [] }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const coverUrl = book.imageLinks?.thumbnail || 'https://placehold.co/80x120/e2e8f0/475569?text=N/A';
  const authors = book.authors ? book.authors.join(', ') : 'Unknown Author';
  const progress = book.readingProgress || 0;
  
  const bookTags = tags.filter(tag => (book.tags || []).includes(tag.id));
  
  const handleAction = async (action) => {
    setIsLoading(true);
    try {
      await action();
    } finally {
      setIsLoading(false);
    }
  };
  
  const getProgressBarClass = (progress) => {
    if (progress >= 75) return 'bg-gradient-to-r from-green-500 to-emerald-500';
    if (progress >= 40) return 'bg-blue-500';
    return 'bg-blue-600';
  };
  
  return (
    <div className="book-card relative" data-book-id={book.id}>
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-2xl z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      <div className="flex space-x-4 mb-4">
        <img
          src={coverUrl}
          alt={book.title}
          className="w-24 h-32 object-cover rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate(`/details/${book.id}`)}
        />
        
        <div className="flex-1 min-w-0">
          <h3
            className="font-bold text-gray-900 mb-1 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() => navigate(`/details/${book.id}`)}
          >
            {book.title}
          </h3>
          <p className="text-sm text-gray-600 mb-2 line-clamp-1">{authors}</p>
          
          {bookTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {bookTags.slice(0, 2).map(tag => (
                <span
                  key={tag.id}
                  className="px-2 py-1 text-xs font-medium rounded-lg"
                  style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
              {bookTags.length > 2 && (
                <span className="px-2 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-600">
                  +{bookTags.length - 2}
                </span>
              )}
            </div>
          )}
          
          {book.startedOn && (
            <p className="text-xs text-gray-500">
              Started: {new Date(book.startedOn).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
      
      {book.shelf === 'currentlyReading' && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 font-medium">Progress</span>
            <span className="text-blue-600 font-bold">{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`progress-bar ${getProgressBarClass(progress)} h-2 rounded-full shadow-sm`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {book.shelf === 'read' && book.finishedOn && (
        <p className="text-sm text-gray-600 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
          </svg>
          Finished: {new Date(book.finishedOn).toLocaleDateString()}
        </p>
      )}
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => navigate(`/details/${book.id}`)}
          className="flex-1 px-3 py-2 btn-primary text-sm"
        >
          View Details
        </button>
        <button
          onClick={() => onEdit(book)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Edit"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        </button>
        <button
          onClick={() => handleAction(() => onDelete(book.id))}
          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default BookCard;