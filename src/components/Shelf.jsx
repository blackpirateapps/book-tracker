import React from 'react';
import BookListItem from './BookListItem';

const Shelf = ({ title, books, icon: Icon, loading, tagsMap, onBookClick }) => {
    // If books are empty and we are not loading, show empty state
    // If books are present, just map them. Infinite scroll is handled in parent (Home.jsx) by appending to these lists.
    
    return (
        <div style={{ marginBottom: '30px' }}>
            <h4 style={{ 
                borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '15px', 
                backgroundColor: '#eee', padding: '5px', fontSize: '14px', fontWeight: 'bold'
            }}>
                <Icon size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                {title.toUpperCase()} ({books.length})
            </h4>
            
            {loading && books.length === 0 ? (
                <div style={{ fontSize: '12px' }}>Loading shelf...</div>
            ) : books.length > 0 ? (
                <div>
                    {books.map(book => (
                        <BookListItem 
                            key={book.id} 
                            book={book} 
                            shelf={book.shelf} 
                            tagsMap={tagsMap} 
                            onClick={onBookClick} 
                        />
                    ))}
                </div>
            ) : (
                <p style={{ fontSize: '12px', color: '#666' }}>[ Empty Shelf ]</p>
            )}
        </div>
    );
};
export default Shelf;