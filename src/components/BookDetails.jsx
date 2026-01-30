import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, 
    Clock, 
    MessageSquareQuote,
    FileText,
    Info,
    BookOpen
} from 'lucide-react';
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

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 animate-pulse">
            <BookOpen size={32} className="mb-3 opacity-50" />
            <div className="text-xs font-medium tracking-widest uppercase">Loading...</div>
        </div>
    );

    if (error) return (
        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-lg text-sm text-center">
            {error}
        </div>
    );
    
    if (!book) return null;

    const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/200x300?text=No+Cover`;
    const authors = Array.isArray(book.authors) ? book.authors.join(', ') : 'Unknown';
    const resolvedTags = book.tags ? book.tags.map(id => tagsMap.get(id)).filter(Boolean) : [];

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return (
        <div className="w-full max-w-4xl mx-auto animate-fadeIn pb-12">
            {/* Back Button */}
            <button 
                onClick={onBack}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-8 group text-xs font-semibold uppercase tracking-wide"
            >
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                Back
            </button>

            {/* Header Section */}
            <div className="minimal-card p-6 sm:p-8 mb-6 flex flex-col md:flex-row gap-8 items-start">
                {/* Cover Image */}
                <div className="flex-shrink-0 mx-auto md:mx-0">
                    <div className="w-[120px] shadow-sm rounded border border-slate-200 overflow-hidden">
                        <img 
                            src={coverUrl} 
                            alt={book.title} 
                            className="w-full h-auto object-cover block"
                        />
                    </div>
                </div>

                {/* Info */}
                <div className="flex-grow text-center md:text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-2">
                        {book.title}
                    </h1>
                    <div className="text-base text-slate-500 mb-6">
                        by <span className="text-slate-800 font-medium">{authors}</span>
                    </div>
                    
                    {book.shelf === 'currentlyReading' && (
                        <div className="bg-slate-50 rounded-lg p-4 mb-5 border border-slate-100 inline-block md:block w-full max-w-md">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                <span>Progress</span>
                                <span>{book.readingProgress}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-500 rounded-full" 
                                    style={{ width: `${book.readingProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                        {resolvedTags.map(tag => <TagBadge key={tag.id} tag={tag} />)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column (Metadata) */}
                <div className="md:col-span-1 flex flex-col gap-4">
                    <div className="minimal-card p-5">
                        <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                            <Clock size={12} /> Reading Log
                        </div>
                        <ul className="space-y-3 text-sm">
                            <li className="flex justify-between items-baseline">
                                <span className="text-slate-400 text-xs">Medium</span>
                                <span className="font-medium text-slate-700">{book.readingMedium || '—'}</span>
                            </li>
                            <li className="flex justify-between items-baseline">
                                <span className="text-slate-400 text-xs">Started</span>
                                <span className="font-medium text-slate-700">{formatDate(book.startedOn)}</span>
                            </li>
                            <li className="flex justify-between items-baseline">
                                <span className="text-slate-400 text-xs">Finished</span>
                                <span className="font-medium text-slate-700">{formatDate(book.finishedOn)}</span>
                            </li>
                        </ul>
                    </div>

                    <div className="minimal-card p-5">
                         <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                            <Info size={12} /> Metadata
                        </div>
                        <ul className="space-y-3 text-sm">
                            <li className="flex flex-col gap-0.5">
                                <span className="text-slate-400 text-[10px] uppercase">Publisher</span>
                                <span className="font-medium text-slate-700">{book.publisher || '—'}</span>
                            </li>
                            <li className="flex flex-col gap-0.5">
                                <span className="text-slate-400 text-[10px] uppercase">Published</span>
                                <span className="font-medium text-slate-700">{formatDate(book.fullPublishDate || book.publishedDate)}</span>
                            </li>
                            <li className="flex justify-between items-baseline pt-2 border-t border-slate-50 mt-1">
                                <span className="text-slate-400 text-xs">Pages</span>
                                <span className="font-medium text-slate-700">{book.pageCount || '—'}</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Right Column (Description & Highlights) */}
                <div className="md:col-span-2 flex flex-col gap-6">
                    {/* Description */}
                    <div className="minimal-card p-6">
                        <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-4">
                            <FileText size={16} className="text-slate-400" /> Description
                        </div>
                        <div className="text-slate-600 leading-relaxed text-sm">
                            {book.bookDescription || <span className="italic text-slate-400">No description available.</span>}
                        </div>
                    </div>

                    {/* Highlights */}
                    <div className="minimal-card p-6">
                        <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-6">
                            <MessageSquareQuote size={16} className="text-slate-400" /> 
                            Highlights <span className="text-xs font-normal text-slate-400 ml-auto bg-slate-50 px-2 py-0.5 rounded-full">{book.highlights?.length || 0}</span>
                        </div>
                        
                        {book.highlights && book.highlights.length > 0 ? (
                            <div className="space-y-6">
                                {book.highlights.map((highlight, index) => (
                                    <div 
                                        key={index} 
                                        className="relative pl-4 border-l-2 border-slate-100 hover:border-blue-300 transition-colors"
                                    >
                                        <p className="font-serif text-slate-700 leading-relaxed text-sm">
                                            "{highlight}"
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400 italic text-sm border border-dashed border-slate-200 rounded-lg">
                                No highlights recorded.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookDetails;