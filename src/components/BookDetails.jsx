import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, 
    Clock, 
    MessageSquareQuote,
    FileText,
    Info,
    Calendar,
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
        <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 animate-pulse">
            <BookOpen size={48} className="mb-4 opacity-50" />
            <div className="text-sm font-medium tracking-widest">LOADING BOOK DETAILS...</div>
        </div>
    );

    if (error) return (
        <div className="bg-red-50 border border-red-200 text-red-600 p-6 rounded-xl text-center">
            Error: {error}
        </div>
    );
    
    if (!book) return null;

    const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/200x300?text=No+Cover`;
    const authors = Array.isArray(book.authors) ? book.authors.join(', ') : 'Unknown';
    const resolvedTags = book.tags ? book.tags.map(id => tagsMap.get(id)).filter(Boolean) : [];

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <div className="w-full max-w-4xl mx-auto animate-fadeIn">
            {/* Back Button */}
            <button 
                onClick={onBack}
                className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-6 group text-sm font-medium"
            >
                <div className="p-1.5 rounded-full bg-white/50 group-hover:bg-indigo-50 transition-colors">
                    <ArrowLeft size={16} />
                </div>
                Back to Library
            </button>

            {/* Header Section */}
            <div className="glass-card rounded-3xl p-6 sm:p-8 mb-8 flex flex-col md:flex-row gap-8 items-start">
                {/* Cover Image */}
                <div className="flex-shrink-0 mx-auto md:mx-0">
                    <div className="w-[140px] shadow-2xl rounded-lg overflow-hidden border-4 border-white/30 transform transition-transform hover:scale-105 duration-500">
                        <img 
                            src={coverUrl} 
                            alt={book.title} 
                            className="w-full h-auto object-cover block"
                        />
                    </div>
                </div>

                {/* Info */}
                <div className="flex-grow text-center md:text-left">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 leading-tight mb-2">
                        {book.title}
                    </h1>
                    <div className="text-lg text-slate-500 font-medium mb-4">
                        by <span className="text-slate-700">{authors}</span>
                    </div>
                    
                    {book.shelf === 'currentlyReading' && (
                        <div className="bg-indigo-50/50 rounded-xl p-4 mb-4 border border-indigo-100 inline-block md:block w-full">
                            <div className="flex justify-between text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">
                                <span>Reading Progress</span>
                                <span>{book.readingProgress}%</span>
                            </div>
                            <div className="h-2.5 bg-indigo-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full" 
                                    style={{ width: `${book.readingProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                        {resolvedTags.map(tag => <TagBadge key={tag.id} tag={tag} />)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column (Metadata) */}
                <div className="md:col-span-1 flex flex-col gap-6">
                    <div className="glass-panel p-5 rounded-2xl">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase text-xs tracking-widest mb-4 border-b border-indigo-100 pb-2">
                            <Clock size={14} /> Reading Log
                        </div>
                        <ul className="space-y-3 text-sm">
                            <li className="flex justify-between">
                                <span className="text-slate-400">Medium</span>
                                <span className="font-medium text-slate-700">{book.readingMedium || 'Not set'}</span>
                            </li>
                            <li className="flex justify-between">
                                <span className="text-slate-400">Started</span>
                                <span className="font-medium text-slate-700">{formatDate(book.startedOn)}</span>
                            </li>
                            <li className="flex justify-between">
                                <span className="text-slate-400">Finished</span>
                                <span className="font-medium text-slate-700">{formatDate(book.finishedOn)}</span>
                            </li>
                        </ul>
                    </div>

                    <div className="glass-panel p-5 rounded-2xl">
                         <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase text-xs tracking-widest mb-4 border-b border-indigo-100 pb-2">
                            <Info size={14} /> Metadata
                        </div>
                        <ul className="space-y-3 text-sm">
                            <li className="flex flex-col">
                                <span className="text-slate-400 text-xs">Publisher</span>
                                <span className="font-medium text-slate-700">{book.publisher || 'N/A'}</span>
                            </li>
                            <li className="flex flex-col">
                                <span className="text-slate-400 text-xs">Published Date</span>
                                <span className="font-medium text-slate-700">{formatDate(book.fullPublishDate || book.publishedDate)}</span>
                            </li>
                            <li className="flex justify-between">
                                <span className="text-slate-400">Pages</span>
                                <span className="font-medium text-slate-700">{book.pageCount || 'N/A'}</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Right Column (Description & Highlights) */}
                <div className="md:col-span-2 flex flex-col gap-6">
                    {/* Description */}
                    <div className="glass-card p-6 rounded-2xl">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-lg mb-4">
                            <FileText size={20} className="text-indigo-500" /> Description
                        </div>
                        <div className="text-slate-600 leading-relaxed text-sm md:text-base">
                            {book.bookDescription || <span className="italic text-slate-400">No description available.</span>}
                        </div>
                    </div>

                    {/* Highlights */}
                    <div className="glass-card p-6 rounded-2xl">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-lg mb-4">
                            <MessageSquareQuote size={20} className="text-pink-500" /> 
                            Highlights <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">({book.highlights?.length || 0})</span>
                        </div>
                        
                        {book.highlights && book.highlights.length > 0 ? (
                            <div className="space-y-4">
                                {book.highlights.map((highlight, index) => (
                                    <div 
                                        key={index} 
                                        className="relative pl-6 py-2 group"
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-purple-400 rounded-full opacity-30 group-hover:opacity-100 transition-opacity"></div>
                                        <p className="font-serif italic text-slate-700 leading-loose">
                                            "{highlight}"
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400 italic text-sm border-2 border-dashed border-slate-200 rounded-xl">
                                No highlights recorded yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookDetails;