import React from 'react';
import { MoreHorizontal, CheckCircle2 } from 'lucide-react';
import TagBadge from './TagBadge';

const BookListItem = ({ book, shelf, tagsMap, onClick, isPartial }) => {
    const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/80x120?text=No+Cover`;
    
    const authors = isPartial ? 'Loading...' : (book.authors ? book.authors.join(', ') : 'Unknown');
    const resolvedTags = (!isPartial && book.tags) ? book.tags.map(id => tagsMap.get(id)).filter(Boolean) : [];

    return (
        <div 
            onClick={() => onClick(book.id)}
            className="group minimal-card p-3 mb-3 flex gap-4 cursor-pointer"
        >
            {/* Cover Image */}
            <div className="flex-shrink-0 w-[50px] sm:w-[60px] h-[75px] sm:h-[90px] rounded overflow-hidden bg-slate-100 border border-slate-100">
                <img 
                    src={coverUrl} 
                    alt={book.title} 
                    loading="lazy"
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Content */}
            <div className="flex-grow min-w-0 flex flex-col justify-center">
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight mb-0.5 truncate pr-6">
                    {book.title}
                </h3>
                
                <p className={`text-xs text-slate-500 mb-1.5 ${isPartial ? 'animate-pulse bg-slate-100 w-24 h-4 rounded' : ''}`}>
                    {isPartial ? '' : authors}
                </p>
                
                {shelf === 'currentlyReading' && !isPartial && (
                    <div className="mb-1.5">
                        <div className="w-full max-w-[120px] h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-blue-500 rounded-full" 
                                style={{ width: `${book.readingProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {shelf === 'read' && book.finishedOn && !isPartial && (
                    <div className="flex items-center text-[10px] text-slate-400 mb-1">
                        <CheckCircle2 size={10} className="mr-1 text-emerald-500" /> 
                        {book.finishedOn}
                    </div>
                )}
                
                <div className="flex flex-wrap gap-1 mt-auto">
                    {book.readingMedium && !isPartial && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-500 uppercase tracking-wider border border-slate-200">
                            {book.readingMedium}
                        </span>
                    )}
                    {resolvedTags.map(tag => (
                        <TagBadge key={tag.id} tag={tag} />
                    ))}
                </div>
            </div>

            {/* Action Icon */}
            <div className="text-slate-300 group-hover:text-slate-500 transition-colors">
                <MoreHorizontal size={16} />
            </div>
        </div>
    );
};

export default BookListItem;