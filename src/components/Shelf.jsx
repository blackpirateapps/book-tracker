import React from 'react';
import BookListItem from './BookListItem';

const Shelf = ({ title, books, icon: Icon, loading, tagsMap, onBookClick }) => {
    return (
        <div style={{ marginBottom: '30px' }}>
            <h4 style={{ 
                borderBottom: '1px solid #000', 
                paddingBottom: '2px', 
                marginBottom: '15px', 
                backgroundColor: '#eee', 
                padding: '5px',
                fontSize: '14px',
                fontWeight: 'bold'
            }}>
                <Icon size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                {title.toUpperCase()} ({books.length})
            </h4>
            
            {loading ? (
                <div style={{ fontSize: '12px' }}>Loading...</div>
            ) : books.length > 0 ? (
                <div>
                    {books.map(book => (
                        <BookListItem 
                            key={book.id} 
                            book={book} 
                            shelf={book.shelf} 
                            tagsMap={tagsMap} 
                            onClick={onBookClick} // Pass the click handler down
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