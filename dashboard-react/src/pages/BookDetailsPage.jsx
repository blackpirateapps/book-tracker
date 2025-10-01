import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchBookDetails } from '../services/bookService';
import { parseBook } from '../utils/bookParser';
import { showGlobalToast } from '../hooks/useToast';

const BookDetailsPage = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadBookDetails();
  }, [bookId]);
  
  const loadBookDetails = async () => {
    try {
      const data = await fetchBookDetails(bookId);
      setBook(parseBook(data));
    } catch (error) {
      showGlobalToast('Failed to load book details', 'error');
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!book) return null;
  
  const coverUrl = book.imageLinks?.thumbnail || 'https://placehold.co/128x192/e2e8f0/475569?text=N/A';
  const authors = book.authors ? book.authors.join(', ') : 'Unknown Author';
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-6">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <img src={coverUrl} alt={book.title} className="w-48 h-72 object-cover rounded" />
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-100 mb-2">{book.title}</h1>
              <p className="text-xl text-gray-400 mb-4">{authors}</p>
              
              <div className="space-y-2 text-gray-300">
                {book.pageCount && <p>Pages: {book.pageCount}</p>}
                {book.publishedDate && <p>Published: {book.publishedDate}</p>}
                {book.publisher && <p>Publisher: {book.publisher}</p>}
                {book.readingMedium && book.readingMedium !== 'Not set' && (
                  <p>Medium: {book.readingMedium}</p>
                )}
                {book.startedOn && <p>Started: {new Date(book.startedOn).toLocaleDateString()}</p>}
                {book.finishedOn && <p>Finished: {new Date(book.finishedOn).toLocaleDateString()}</p>}
              </div>
            </div>
          </div>
          
          {book.bookDescription && (
            <div className="mt-6">
              <h2 className="text-2xl font-semibold text-gray-100 mb-3">Description</h2>
              <p className="text-gray-300 leading-relaxed">{book.bookDescription}</p>
            </div>
          )}
          
          {book.highlights && book.highlights.length > 0 && (
            <div className="mt-6">
              <h2 className="text-2xl font-semibold text-gray-100 mb-3">
                Highlights ({book.highlights.length})
              </h2>
              <div className="space-y-3">
                {book.highlights.map((highlight, index) => (
                  <div key={index} className="bg-gray-700 p-4 rounded-lg text-gray-200">
                    {highlight}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookDetailsPage;