import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, 
    BookOpen, 
    Calendar, 
    Clock, 
    Tag, 
    MessageSquareQuote,
    FileText,
    Info 
} from 'lucide-react';
import TagBadge from './TagBadge';

const BookDetails = ({ bookId, onBack, tagsMap }) => {
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                // Fetch full details using your existing highlights API
                const res = await fetch(`/api/highlights?id=${bookId}`);
                if (!res.ok) throw new Error('Book not found');
                const data = await res.json();
                
                // Parse JSON fields
                if (typeof data.authors === 'string') try { data.authors = JSON.parse(data.authors); } catch(e) { data.authors = []; }
                if (typeof data.imageLinks === 'string') try { data.imageLinks = JSON.parse(data.imageLinks); } catch(e) { data.imageLinks = {}; }
                if (typeof data.highlights === 'string') try { data.highlights = JSON.parse(data.highlights); } catch(e) { data.highlights = []; }
                if (typeof data.tags === 'string') try { data.tags = JSON.parse(data.tags); } catch(e) { data.tags = []; }

                setBook(data);
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (bookId) fetchDetails();
    }, [bookId]);

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading book details...</div>;
    if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
    if (!book) return null;

    const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/200x300?text=No+Cover`;
    const authors = Array.isArray(book.authors) ? book.authors.join(', ') : 'Unknown';
    const resolvedTags = book.tags ? book.tags.map(id => tagsMap.get(id)).filter(Boolean) : [];

    // Date formatting helper
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const sectionHeaderStyle = {
        borderBottom: '1px solid #000',
        paddingBottom: '5px',
        marginBottom: '15px',
        fontSize: '16px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#f0f0f0',
        padding: '8px'
    };

    const cardStyle = {
        marginBottom: '25px',
        border: '1px solid #ddd',
        padding: '15px',
        backgroundColor: '#fff'
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Back Button */}
            <button 
                onClick={onBack}
                style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#0000AA', 
                    cursor: 'pointer', 
                    marginBottom: '20px',
                    display: 'flex', 
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '14px',
                    padding: 0
                }}
            >
                <ArrowLeft size={16} /> Back to Library
            </button>

            {/* Main Header Area */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
                <div style={{ flexShrink: 0 }}>
                    <img 
                        src={coverUrl} 
                        alt={book.title} 
                        style={{ border: '1px solid #000', width: '120px', boxShadow: '3px 3px 0 #ccc' }} 
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <h1 style={{ marginTop: 0, marginBottom: '10px', fontSize: '24px' }}>{book.title}</h1>
                    <div style={{ fontSize: '16px', color: '#555', marginBottom: '15px' }}>by {authors}</div>
                    
                    {book.shelf === 'currentlyReading' && (
                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Current Progress: {book.readingProgress}%</div>
                            <div style={{ width: '100%', maxWidth: '300px', border: '1px solid #000', height: '12px' }}>
                                <div style={{ width: `${book.readingProgress}%`, height: '100%', backgroundColor: '#000080' }}></div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {resolvedTags.map(tag => <TagBadge key={tag.id} tag={tag} />)}
                    </div>
                </div>
            </div>

            {/* Reading Log */}
            <div style={cardStyle}>
                <div style={sectionHeaderStyle}>
                    <Clock size={16} /> Reading Log
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: '1.8', fontSize: '14px' }}>
                    <li><strong>Medium:</strong> {book.readingMedium || 'Not set'}</li>
                    <li><strong>Started:</strong> {formatDate(book.startedOn)}</li>
                    <li><strong>Finished:</strong> {formatDate(book.finishedOn)}</li>
                    {book.startedOn && book.finishedOn && (
                        <li><strong>Duration:</strong> {Math.ceil((new Date(book.finishedOn) - new Date(book.startedOn)) / (1000 * 60 * 60 * 24))} days</li>
                    )}
                </ul>
            </div>

            {/* Metadata */}
            <div style={cardStyle}>
                <div style={sectionHeaderStyle}>
                    <Info size={16} /> Metadata
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: '1.8', fontSize: '14px' }}>
                    <li><strong>Publisher:</strong> {book.publisher || 'N/A'}</li>
                    <li><strong>Published Date:</strong> {formatDate(book.fullPublishDate || book.publishedDate)}</li>
                    <li><strong>Pages:</strong> {book.pageCount || 'N/A'}</li>
                </ul>
            </div>

            {/* Description */}
            <div style={cardStyle}>
                <div style={sectionHeaderStyle}>
                    <FileText size={16} /> Description
                </div>
                <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
                    {book.bookDescription || 'No description available.'}
                </div>
            </div>

            {/* Highlights */}
            <div style={cardStyle}>
                <div style={sectionHeaderStyle}>
                    <MessageSquareQuote size={16} /> Highlights ({book.highlights?.length || 0})
                </div>
                
                {book.highlights && book.highlights.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {book.highlights.map((highlight, index) => (
                            <blockquote 
                                key={index} 
                                style={{ 
                                    margin: 0, 
                                    padding: '10px 15px', 
                                    borderLeft: '3px solid #0000AA', 
                                    backgroundColor: '#f9f9ff',
                                    fontStyle: 'italic',
                                    fontSize: '14px'
                                }}
                            >
                                "{highlight}"
                            </blockquote>
                        ))}
                    </div>
                ) : (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>No highlights recorded yet.</p>
                )}
            </div>
        </div>
    );
};

export default BookDetails;