import React from 'react';
import { MoreHorizontal, CheckCircle2 } from 'lucide-react';
import TagBadge from './TagBadge';

const BookListItem = ({ book, shelf, tagsMap, onClick }) => {
    const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/80x120?text=No+Cover`;
    const authors = book.authors ? book.authors.join(', ') : 'Unknown';
    const resolvedTags = book.tags ? book.tags.map(id => tagsMap.get(id)).filter(Boolean) : [];

    // Layout Stability: Pre-defined height container for the row
    const containerStyle = {
        borderBottom: '1px solid #ddd',
        marginBottom: '10px',
        paddingBottom: '10px',
        backgroundColor: 'transparent',
        display: 'flex',
        gap: '15px',
        alignItems: 'flex-start',
        cursor: 'pointer',
        // Important for Virtuoso to estimate height correctly if content varies
        minHeight: '80px' 
    };

    return (
        <div style={containerStyle} onClick={() => onClick(book.id)}>
            <div style={{ flexShrink: 0 }}>
                {/* Fixed Dimension Wrapper for Layout Stability */}
                <div style={{ width: '45px', height: '68px', backgroundColor: '#f4f4f4', border: '1px solid #999' }}>
                    <img 
                        src={coverUrl} 
                        alt={book.title} 
                        width="45" height="68"
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
                    />
                </div>
            </div>

            <div style={{ flexGrow: 1, minWidth: 0 }}>
                <div style={{ fontSize: '16px', color: '#0000AA', lineHeight: '1.2' }}>
                    <b style={{ textDecoration: 'underline' }}>{book.title}</b>
                </div>
                <div style={{ fontSize: '12px', color: '#444', marginBottom: '6px' }}>
                    by {authors}
                </div>
                
                {/* Show status explicitly since we merged the shelves */}
                <div style={{ marginBottom: '4px', fontSize: '11px', color: '#666' }}>
                    STATUS: <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{shelf === 'currentlyReading' ? 'Reading' : shelf}</span>
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

            <div style={{ flexShrink: 0 }}>
                 <div style={{ color: '#000' }}>
                    <MoreHorizontal size={16} />
                 </div>
            </div>
        </div>
    );
};

export default BookListItem;