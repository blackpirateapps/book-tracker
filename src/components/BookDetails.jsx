import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, 
    Clock, 
    MessageSquareQuote,
    FileText,
    Info 
} from 'lucide-react';
import TagBadge from './TagBadge';

const BookDetails = ({ bookId, initialData, onBack, tagsMap }) => {
    // Start with initial data (from list view) so title/cover are instant
    const [book, setBook] = useState(initialData || null);
    const [fullDetailsLoaded, setFullDetailsLoaded] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                // Fetch full details
                const res = await fetch(`/api/highlights?id=${bookId}`);
                if (!res.ok) throw new Error('Book not found');
                const data = await res.json();
                
                // Parse fields
                if (typeof data.authors === 'string') try { data.authors = JSON.parse(data.authors); } catch(e) { data.authors = []; }
                if (typeof data.imageLinks === 'string') try { data.imageLinks = JSON.parse(data.imageLinks); } catch(e) { data.imageLinks = {}; }
                if (typeof data.highlights === 'string') try { data.highlights = JSON.parse(data.highlights); } catch(e) { data.highlights = []; }
                if (typeof data.tags === 'string') try { data.tags = JSON.parse(data.tags); } catch(e) { data.tags = []; }

                setBook(data); // Update with full data
                setFullDetailsLoaded(true);
            } catch (err) {
                console.error(err);
                setError(err.message);
            }
        };

        if (bookId) fetchDetails();
    }, [bookId]);

    if (!book && !error) return <div style={{ padding: '20px' }}>Loading...</div>;
    if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;

    const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/200x300?text=No+Cover`;
    const authors = Array.isArray(book.authors) ? book.authors.join(', ') : 'Unknown';
    const resolvedTags = book.tags ? book.tags.map(id => tagsMap.get(id)).filter(Boolean) : [];

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // --- SKELETON COMPONENT ---
    const SkeletonBlock = ({ lines = 3 }) => (
        <div className="animate-pulse">
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} style={{ 
                    height: '14px', 
                    backgroundColor: '#e0e0e0', 
                    marginBottom: '8px', 
                    width: i === lines - 1 ? '70%' : '100%' 
                }}></div>
            ))}
        </div>
    );

    const sectionHeaderStyle = {
        borderBottom: '1px solid #000',h
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
            <button 
                onClick={onBack}
                style={{ 
                    background: 'none', border: 'none', color: '#0000AA', cursor: 'pointer', 
                    marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', padding: 0
                }}
            >
                <ArrowLeft size={16} /> Back to Library
            </button>

            {/* HEADER (Always Visible if initialData exists) */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
                <div style={{ flexShrink: 0 }}>
                    <div style={{ width: '120px', minHeight: '180px', border: '1px solid #000', boxShadow: '3px 3px 0 #ccc', backgroundColor: '#f4f4f4' }}>
                        <img src={coverUrl} alt={book.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
                    </div>
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

            {/* READING LOG */}
            <div style={cardStyle}>
                <div style={sectionHeaderStyle}><Clock size={16} /> Reading Log</div>
                {fullDetailsLoaded ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: '1.8', fontSize: '14px' }}>
                        <li><strong>Medium:</strong> {book.readingMedium || 'Not set'}</li>
                        <li><strong>Started:</strong> {formatDate(book.startedOn)}</li>
                        <li><strong>Finished:</strong> {formatDate(book.finishedOn)}</li>
                    </ul>
                ) : <SkeletonBlock lines={3} />}
            </div>

            {/* METADATA */}
            <div style={cardStyle}>
                <div style={sectionHeaderStyle}><Info size={16} /> Metadata</div>
                {fullDetailsLoaded ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: '1.8', fontSize: '14px' }}>
                        <li><strong>Publisher:</strong> {book.publisher || 'N/A'}</li>
                        <li><strong>Published:</strong> {formatDate(book.fullPublishDate || book.publishedDate)}</li>
                        <li><strong>Pages:</strong> {book.pageCount || 'N/A'}</li>
                    </ul>
                ) : <SkeletonBlock lines={3} />}
            </div>

            {/* DESCRIPTION */}
            <div style={cardStyle}>
                <div style={sectionHeaderStyle}><FileText size={16} /> Description</div>
                {fullDetailsLoaded ? (
                    <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
                        {book.bookDescription || 'No description available.'}
                    </div>
                ) : <SkeletonBlock lines={6} />}
            </div>

            {/* HIGHLIGHTS */}
            <div style={cardStyle}>
                <div style={sectionHeaderStyle}><MessageSquareQuote size={16} /> Highlights</div>
                {fullDetailsLoaded ? (
                    book.highlights && book.highlights.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {book.highlights.map((highlight, index) => (
                                <blockquote key={index} style={{ margin: 0, padding: '10px 15px', borderLeft: '3px solid #0000AA', backgroundColor: '#f9f9ff', fontStyle: 'italic', fontSize: '14px' }}>
                                    "{highlight}"
                                </blockquote>
                            ))}
                        </div>
                    ) : <p style={{ color: '#666', fontStyle: 'italic' }}>No highlights recorded yet.</p>
                ) : <SkeletonBlock lines={4} />}
            </div>
        </div>
    );
};

export default BookDetails;