import React from 'react';

const BookListItem = ({ book, tagsMap, onClick, isPartial }) => {
    const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/48x72/1e293b/60a5fa?text=No+Cover`;

    // Safety check for authors
    let authors = 'Unknown';
    if (!isPartial) {
        if (Array.isArray(book.authors)) {
            authors = book.authors.join(', ');
        } else if (typeof book.authors === 'string') {
            try {
                const parsed = JSON.parse(book.authors);
                if (Array.isArray(parsed)) authors = parsed.join(', ');
                else authors = book.authors;
            } catch (e) {
                authors = book.authors;
            }
        }
    } else {
        authors = '...';
    }

    const resolvedTags = (!isPartial && book.tags) ? (Array.isArray(book.tags) ? book.tags : []).map(id => tagsMap.get(id)).filter(Boolean) : [];

    return (
        <div
            onClick={() => onClick(book.id)}
            className="glass-card flex gap-4 p-3 cursor-pointer group"
        >
            {/* Cover */}
            <div className="flex-shrink-0 w-12 h-[72px] rounded-lg overflow-hidden bg-white/5">
                <img
                    src={coverUrl}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
            </div>

            {/* Text Info */}
            <div className="flex-grow min-w-0 flex flex-col justify-between">
                <div>
                    <div className="font-medium text-sm text-white leading-tight line-clamp-1 group-hover:text-blue-300 transition-colors">
                        {book.title}
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                        by {authors}
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {/* Tags */}
                    {resolvedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {resolvedTags.slice(0, 3).map(tag => (
                                <span key={tag.id} className="tag-badge text-[10px] py-0.5 px-2">
                                    {tag.name}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Progress */}
                    {book.shelf === 'currentlyReading' && (
                        <span className="ml-auto text-[11px] font-medium px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {book.readingProgress}%
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookListItem;