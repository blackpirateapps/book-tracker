import React from 'react';
import { MoreHorizontal, CheckCircle2 } from 'lucide-react';
import TagBadge from './TagBadge';

const BookListItem = ({ book, shelf, tagsMap }) => {
    const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/80x120?text=No+Cover`;
    const authors = book.authors ? book.authors.join(', ') : 'Unknown';
    const resolvedTags = book.tags ? book.tags.map(id => tagsMap.get(id)).filter(Boolean) : [];

    const containerStyle = {
        borderBottom: '1px solid #ddd',
        marginBottom: '10px',
        paddingBottom: '10px',
        backgroundColor: 'transparent',
        display: 'flex',
        gap: '15px',
        alignItems: 'flex-start'
    };

    return (
        <div style={containerStyle}>
            {/* Image Column */}
            <div style={{ flexShrink: 0 }}>
                <img 
                    src={coverUrl} 
                    alt={book.title} 
                    width="45"
                    style={{ border: '1px solid #999', display: 'block' }} 
                />
            </div>

            {/* Content Column */}
            <div style={{ flexGrow: 1, minWidth: 0 }}>
                <div style={{ fontSize: '16px', color: '#0000AA', lineHeight: '1.2' }}>
                    <b>{book.title}</b>
                </div>
                <div style={{ fontSize: '12px', color: '#444', marginBottom: '6px' }}>
                    by {authors}
                </div>
                
                {shelf === 'currentlyReading' && (
                    <div style={{ marginBottom: '5px', fontSize: '12px' }}>
                        Progress: {book.readingProgress}%
                        <br/>
                        <div style={{ width: '100%', maxWidth: '150px', border: '1px solid #666', height: '8px', display: 'inline-block', marginTop: '2px' }}>
                            <div style={{ width: `${book.readingProgress}%`, background: '#000080', height: '100%' }}></div>
                        </div>
                    </div>
                )}

                {shelf === 'read' && book.finishedOn && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                        <CheckCircle2 size={10} style={{ display: 'inline', marginRight: '3px' }} /> 
                        Read on: {book.finishedOn}
                    </div>
                )}
                
                <div style={{ marginTop: '4px' }}>
                    {book.readingMedium && <span style={{ fontSize: '10px', color: '#666', marginRight: '5px' }}>[{book.readingMedium}]</span>}
                    {resolvedTags.map(tag => (
                        <TagBadge key={tag.id} tag={tag} />
                    ))}
                </div>
            </div>

            {/* Action Column */}
            <div style={{ flexShrink: 0 }}>
                 <a href="#" onClick={e => e.preventDefault()} style={{ color: '#000', textDecoration: 'none' }}>
                    <MoreHorizontal size={16} />
                 </a>
            </div>
        </div>
    );
};

export default BookListItem;