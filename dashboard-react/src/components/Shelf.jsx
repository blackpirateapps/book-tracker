import React, { useState, useMemo } from 'react';
import BookCard from './BookCard';
import { BOOKS_PER_PAGE, SHELF_LABELS } from '../utils/constants';

const Shelf = ({ shelf, books, onEdit, onDelete, onMove, onImportHighlights }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * BOOKS_PER_PAGE;
    const end = start + BOOKS_PER_PAGE;
    return books.slice(start, end);
  }, [books, currentPage]);
  
  const totalPages = Math.ceil(books.length / BOOKS_PER_PAGE);
  
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };
  
  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };
  
  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <div
        className="flex items-center justify-between mb-4 cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold text-gray-100">{SHELF_LABELS[shelf]}</h2>
          <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm font-medium">
            {books.length}
          </span>
        </div>
        <svg
          className={`w-6 h-6 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {!isCollapsed && (
        <>
          {books.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nothing here yet.</p>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedBooks.map(book => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onMove={onMove}
                    onImportHighlights={onImportHighlights}
                  />
                ))}
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Shelf;