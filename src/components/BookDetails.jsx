import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Building, Calendar, FileText, Tag, BookOpen, Clock, Tablet, Sparkles } from 'lucide-react';

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
                if (typeof data.authors === 'string') try { data.authors = JSON.parse(data.authors); } catch (e) { data.authors = [data.authors]; }
                if (typeof data.imageLinks === 'string') try { data.imageLinks = JSON.parse(data.imageLinks); } catch (e) { data.imageLinks = {}; }
                if (typeof data.highlights === 'string') try { data.highlights = JSON.parse(data.highlights); } catch (e) { data.highlights = []; }
                if (typeof data.tags === 'string') try { data.tags = JSON.parse(data.tags); } catch (e) { data.tags = []; }

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

    if (loading && !book) {
        return (
            <div className="glass-panel p-8 text-center">
                <div className="animate-pulse text-muted">Loading book details...</div>
            </div>
        );
    }

    if (error && !book) {
        return (
            <div className="glass-panel bg-red-500/20 border-red-500/30 p-6 text-center">
                <p className="text-red-300 font-medium">Error: {error}</p>
            </div>
        );
    }

    if (!book) return null;

    const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/200x300/1e293b/60a5fa?text=No+Cover`;

    let authors = 'Unknown';
    if (Array.isArray(book.authors)) authors = book.authors.join(', ');
    else if (book.authors) authors = String(book.authors);

    const resolvedTags = book.tags ? (Array.isArray(book.tags) ? book.tags : []).map(id => tagsMap.get(id)).filter(Boolean) : [];

    const formatDate = (dateString) => {
        if (!dateString) return 'n/a';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString();
    };

    const MetaRow = ({ icon: Icon, label, value }) => (
        <div className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
            <Icon className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" />
            <div className="flex-1">
                <div className="text-xs text-muted uppercase tracking-wide">{label}</div>
                <div className="text-sm text-white mt-0.5">{value || 'n/a'}</div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-6">
            {/* Back Button */}
            <button
                onClick={onBack}
                className="btn-glass inline-flex items-center gap-2 self-start text-sm"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Library
            </button>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Column: Cover & Metadata */}
                <div className="w-full lg:w-1/3 flex flex-col gap-6">
                    {/* Cover */}
                    <div className="glass-panel p-4 flex justify-center">
                        <img
                            src={coverUrl}
                            alt={book.title}
                            className="max-w-[200px] w-full h-auto rounded-xl shadow-2xl"
                        />
                    </div>

                    {/* Metadata */}
                    <div className="glass-panel p-4">
                        <div className="section-header -mx-4 -mt-4 mb-4 rounded-t-[20px]">
                            <FileText className="w-4 h-4" />
                            Metadata
                        </div>
                        <MetaRow icon={User} label="Authors" value={authors} />
                        <MetaRow icon={Building} label="Publisher" value={book.publisher} />
                        <MetaRow icon={Calendar} label="Published" value={formatDate(book.fullPublishDate || book.publishedDate)} />
                        <MetaRow icon={FileText} label="Pages" value={book.pageCount} />
                        <div className="flex items-start gap-3 py-2">
                            <Tag className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <div className="text-xs text-muted uppercase tracking-wide">Tags</div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {resolvedTags.length > 0 ? resolvedTags.map(tag => (
                                        <span key={tag.id} className="tag-badge">{tag.name}</span>
                                    )) : <span className="text-muted text-sm">None</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reading Log */}
                    <div className="glass-panel p-4">
                        <div className="section-header -mx-4 -mt-4 mb-4 rounded-t-[20px]">
                            <BookOpen className="w-4 h-4" />
                            Reading Log
                        </div>
                        <MetaRow
                            icon={BookOpen}
                            label="Status"
                            value={<span className="uppercase font-medium text-blue-300">{book.shelf || 'watchlist'}</span>}
                        />
                        <MetaRow
                            icon={Sparkles}
                            label="Progress"
                            value={
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                                            style={{ width: `${book.readingProgress || 0}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-muted">{book.readingProgress}%</span>
                                </div>
                            }
                        />
                        <MetaRow icon={Tablet} label="Medium" value={book.readingMedium} />
                        <MetaRow icon={Calendar} label="Started" value={formatDate(book.startedOn)} />
                        <MetaRow icon={Clock} label="Finished" value={formatDate(book.finishedOn)} />
                    </div>
                </div>

                {/* Right Column: Content */}
                <div className="w-full lg:w-2/3 flex flex-col gap-6">
                    {/* Title */}
                    <div className="glass-panel p-6">
                        <h1 className="text-2xl lg:text-3xl font-semibold text-white leading-tight mb-2">
                            {book.title}
                        </h1>
                        <p className="text-lg text-muted">
                            by {authors}
                        </p>
                    </div>

                    {/* Description */}
                    <div className="glass-panel p-4">
                        <div className="section-header -mx-4 -mt-4 mb-4 rounded-t-[20px]">
                            <FileText className="w-4 h-4" />
                            Description
                        </div>
                        <div className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">
                            {book.bookDescription || <span className="italic text-muted">No description provided.</span>}
                        </div>
                    </div>

                    {/* Highlights */}
                    <div className="glass-panel p-4">
                        <div className="section-header -mx-4 -mt-4 mb-4 rounded-t-[20px] flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                Highlights
                            </div>
                            <span className="text-xs font-normal text-muted">{book.highlights?.length || 0} saved</span>
                        </div>

                        {book.highlights && book.highlights.length > 0 ? (
                            <div className="flex flex-col gap-4">
                                {book.highlights.map((highlight, index) => (
                                    <div
                                        key={index}
                                        className="glass-card p-4 border-l-4 border-l-purple-500/50"
                                    >
                                        <p className="italic text-white/80 leading-relaxed text-sm">
                                            "{highlight}"
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted text-sm italic">
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