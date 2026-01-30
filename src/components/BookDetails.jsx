import React, { useState, useEffect } from 'react';
import TagBadge from './TagBadge';

const BookDetails = ({ bookId, onBack, tagsMap }) => {
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await fetch(`/api/highlights?id=${bookId}`);
                if (!res.ok) throw new Error('Book not found');
                const data = await res.json();
                
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

    if (loading) return <div className="p-4 italic">Loading book details...</div>;
    if (error) return <div className="p-4 text-red-700 font-bold">Error: {error}</div>;
    if (!book) return null;

    const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/200x300?text=No+Cover`;
    const authors = Array.isArray(book.authors) ? book.authors.join(', ') : 'Unknown';
    const resolvedTags = book.tags ? book.tags.map(id => tagsMap.get(id)).filter(Boolean) : [];

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="flex flex-col gap-4">
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
                        <div className="font-bold border-b border-gray-300 mb-2 pb-1 bg-gray-50">METADATA</div>
                        <table className="w-full text-sm text-left collapse">
                            <tbody>
                                <tr className="border-b border-gray-200">
                                    <td className="p-1 font-bold text-gray-600 w-24">Authors</td>
                                    <td className="p-1">{authors}</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="p-1 font-bold text-gray-600">Publisher</td>
                                    <td className="p-1">{book.publisher || '-'}</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="p-1 font-bold text-gray-600">Published</td>
                                    <td className="p-1">{formatDate(book.fullPublishDate || book.publishedDate)}</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="p-1 font-bold text-gray-600">Pages</td>
                                    <td className="p-1">{book.pageCount || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="p-1 font-bold text-gray-600">Tags</td>
                                    <td className="p-1">
                                        <div className="flex flex-wrap gap-1">
                                            {resolvedTags.map(tag => (
                                                <span key={tag.id} className="border border-gray-300 px-1 text-xs bg-white">{tag.name}</span>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="border border-gray-400 p-2">
                        <div className="font-bold border-b border-gray-300 mb-2 pb-1 bg-gray-50">READING LOG</div>
                        <table className="w-full text-sm text-left collapse">
                            <tbody>
                                <tr className="border-b border-gray-200">
                                    <td className="p-1 font-bold text-gray-600 w-24">Status</td>
                                    <td className="p-1 uppercase font-bold">{book.shelf}</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="p-1 font-bold text-gray-600">Progress</td>
                                    <td className="p-1">
                                        {book.shelf === 'currentlyReading' ? `${book.readingProgress}%` : '-'}
                                    </td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="p-1 font-bold text-gray-600">Medium</td>
                                    <td className="p-1">{book.readingMedium || '-'}</td>
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
                        <h1 className="text-2xl font-bold font-serif">{book.title}</h1>
                        <h2 className="text-lg text-gray-600">by {authors}</h2>
                    </div>

                    <div className="border border-gray-400 p-2 bg-white">
                        <div className="font-bold border-b border-gray-300 mb-2 pb-1 bg-gray-50">DESCRIPTION</div>
                        <div className="p-2 text-sm leading-relaxed font-serif text-gray-800">
                            {book.bookDescription || <span className="italic text-gray-500">No description provided.</span>}
                        </div>
                    </div>

                    <div className="border border-gray-400 p-2 bg-white">
                        <div className="font-bold border-b border-gray-300 mb-2 pb-1 bg-gray-50 flex justify-between">
                            <span>HIGHLIGHTS</span>
                            <span className="text-xs font-normal text-gray-600">Count: {book.highlights?.length || 0}</span>
                        </div>
                        
                        {book.highlights && book.highlights.length > 0 ? (
                            <div className="flex flex-col gap-4 p-2">
                                {book.highlights.map((highlight, index) => (
                                    <div key={index} className="border-l-4 border-gray-300 pl-3 py-1">
                                        <p className="font-serif italic text-gray-800 leading-relaxed">
                                            "{highlight}"
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center italic text-gray-500">
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