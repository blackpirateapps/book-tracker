import React, { useState, useEffect } from 'react';

const BookDetails = ({ bookId, onBack, tagsMap, initialData }) => {
    const [book, setBook] = useState(initialData || null);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await fetch(`/api/highlights?id=${bookId}`);
                if (!res.ok) throw new Error('Book not found');
                const data = await res.json();
                
                // Parse JSON fields
                if (typeof data.authors === 'string') try { data.authors = JSON.parse(data.authors); } catch(e) { data.authors = [data.authors]; }
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

        fetchDetails();
    }, [bookId]);

    if (loading && !book) return <div className="p-4 italic">Loading book details...</div>;
    if (error && !book) return <div className="p-4 text-red-700 font-bold">Error: {error}</div>;
    if (!book) return null;

    const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/200x300?text=No+Cover`;
    
    // Improved Authors Display
    let authors = 'Unknown';
    if (Array.isArray(book.authors)) authors = book.authors.join(', ');
    else if (book.authors) authors = String(book.authors);

    const resolvedTags = book.tags ? (Array.isArray(book.tags) ? book.tags : []).map(id => tagsMap.get(id)).filter(Boolean) : [];

    // Robust Date Formatting
    const formatDate = (dateString) => {
        if (!dateString) return 'n/a';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString; // Return as-is if not standard date
        return d.toLocaleDateString();
    };

    return (
        <div className="flex flex-col gap-4 animate-fadeIn">
            <div className="border-b border-black pb-1 mb-2">
                <button onClick={onBack} className="text-blue-800 underline">&larr; Return to Index</button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Left Column: Cover & Metadata */}
                <div className="w-full md:w-1/3 flex flex-col gap-4">
                    <div className="border border-black p-1 bg-gray-100 text-center">
                        <img src={coverUrl} alt={book.title} className="max-w-full h-auto mx-auto border border-gray-400" />
                    </div>

                    <div className="border border-gray-400 p-2">
                        <div className="font-bold border-b border-gray-300 mb-2 pb-1 bg-gray-50 text-xs uppercase">METADATA</div>
                        <table className="w-full text-sm text-left border-collapse">
                            <tbody>
                                <tr className="border-b border-gray-200">
                                    <td className="p-1 font-bold text-gray-600 w-24">Authors</td>
                                    <td className="p-1">{authors}</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="p-1 font-bold text-gray-600">Publisher</td>
                                    <td className="p-1">{book.publisher || 'n/a'}</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="p-1 font-bold text-gray-600">Published</td>
                                    <td className="p-1">{formatDate(book.fullPublishDate || book.publishedDate)}</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="p-1 font-bold text-gray-600">Pages</td>
                                    <td className="p-1">{book.pageCount || 'n/a'}</td>
                                </tr>
                                <tr>
                                    <td className="p-1 font-bold text-gray-600">Tags</td>
                                    <td className="p-1">
                                        <div className="flex flex-wrap gap-1">
                                            {resolvedTags.map(tag => (
                                                <span key={tag.id} className="border border-gray-300 px-1 text-[10px] bg-white">{tag.name}</span>
                                            ))}
                                            {resolvedTags.length === 0 && <span className="text-gray-400 text-xs">none</span>}
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="border border-gray-400 p-2">
                        <div className="font-bold border-b border-gray-300 mb-2 pb-1 bg-gray-50 text-xs uppercase">READING LOG</div>
                        <table className="w-full text-sm text-left border-collapse">
                            <tbody>
                                <tr className="border-b border-gray-200">
                                    <td className="p-1 font-bold text-gray-600 w-24">Status</td>
                                    <td className="p-1 uppercase font-bold text-blue-900">{book.shelf || 'watchlist'}</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="p-1 font-bold text-gray-600">Progress</td>
                                    <td className="p-1">
                                        {book.readingProgress}%
                                    </td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="p-1 font-bold text-gray-600">Medium</td>
                                    <td className="p-1">{book.readingMedium || 'n/a'}</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="p-1 font-bold text-gray-600">Started</td>
                                    <td className="p-1">{formatDate(book.startedOn)}</td>
                                </tr>
                                <tr>
                                    <td className="p-1 font-bold text-gray-600">Finished</td>
                                    <td className="p-1">{formatDate(book.finishedOn)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: Content */}
                <div className="w-full md:w-2/3 flex flex-col gap-4">
                    <div className="border-b-2 border-black pb-2">
                        <h1 className="text-3xl font-bold font-serif leading-tight">{book.title}</h1>
                        <h2 className="text-xl text-gray-600 font-serif">by {authors}</h2>
                    </div>

                    <div className="border border-gray-400 p-2 bg-white">
                        <div className="font-bold border-b border-gray-300 mb-2 pb-1 bg-gray-50 text-xs uppercase">DESCRIPTION</div>
                        <div className="p-2 text-base leading-relaxed font-serif text-gray-800 whitespace-pre-wrap">
                            {book.bookDescription || <span className="italic text-gray-500">No description provided.</span>}
                        </div>
                    </div>

                    <div className="border border-gray-400 p-2 bg-white">
                        <div className="font-bold border-b border-gray-300 mb-2 pb-1 bg-gray-50 flex justify-between items-center px-1">
                            <span className="text-xs uppercase">HIGHLIGHTS</span>
                            <span className="text-tiny font-normal text-gray-600">COUNT: {book.highlights?.length || 0}</span>
                        </div>
                        
                        {book.highlights && book.highlights.length > 0 ? (
                            <div className="flex flex-col gap-4 p-2">
                                {book.highlights.map((highlight, index) => (
                                    <div key={index} className="border-l-4 border-gray-300 pl-4 py-1 hover:border-blue-400 transition-colors">
                                        <p className="font-serif italic text-gray-800 leading-relaxed text-base">
                                            "{highlight}"
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center italic text-gray-500 text-sm">
                                No highlights recorded for this book.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookDetails;