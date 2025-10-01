import React, { useState, useMemo } from 'react';
import BookCard from './BookCard';
import { BOOKS_PER_PAGE, SHELF_LABELS } from '../utils/constants';

const Shelf = ({ shelf, books, tags, onEdit, onDelete, onMove }) => {
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
    <section className="mb-8">
      <div
        className="flex items-center justify-between mb-6 cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            {SHELF_LABELS[shelf]}
            <span className="ml-3 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              {books.length}
            </span>
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {shelf === 'currentlyReading' && "Books you're actively reading"}
            {shelf === 'read' && "Books you've completed"}
            {shelf === 'watchlist' && "Books you want to read"}
          </p>
        </div>
        <svg
          className={`w-6 h-6 text-gray-600 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
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
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              </svg>
              <p className="text-gray-500 text-lg">No books here yet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedBooks.map(book => (
                  <BookCard
                    key={book.id}
                    book={book}
                    tags={tags}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onMove={onMove}
                  />
                ))}
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-gray-600 font-medium">
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
    </section>
  );
};

export default Shelf;