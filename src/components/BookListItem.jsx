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
            className="group relative glass-card rounded-2xl p-3 mb-4 flex gap-4 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg cursor-pointer overflow-hidden"
        >
            {/* Hover Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-500 pointer-events-none" />

            {/* Cover Image */}
            <div className="flex-shrink-0 w-[60px] sm:w-[70px] h-[90px] sm:h-[105px] rounded-lg overflow-hidden shadow-md border border-white/20 relative z-10 bg-slate-100">
                <img 
                    src={coverUrl} 
                    alt={book.title} 
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
            </div>

            {/* Content */}
            <div className="flex-grow min-w-0 flex flex-col justify-center z-10">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight mb-1 group-hover:text-indigo-600 transition-colors truncate pr-6">
                    {book.title}
                </h3>
                
                <p className={`text-xs text-slate-500 font-medium mb-2 ${isPartial ? 'animate-pulse bg-slate-200/50 w-24 h-4 rounded' : ''}`}>
                    {isPartial ? '' : `by ${authors}`}
                </p>
                
                {shelf === 'currentlyReading' && !isPartial && (
                    <div className="mb-2">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                            <span>Progress</span>
                            <span>{book.readingProgress}%</span>
                        </div>
                        <div className="w-full max-w-[140px] h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" 
                                style={{ width: `${book.readingProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {shelf === 'read' && book.finishedOn && !isPartial && (
                    <div className="flex items-center text-[11px] text-emerald-600 font-medium mb-1">
                        <CheckCircle2 size={12} className="mr-1" /> 
                        Finished on {book.finishedOn}
                    </div>
                )}
                
                <div className="flex flex-wrap gap-1 mt-auto">
                    {book.readingMedium && !isPartial && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200/50 text-slate-500 uppercase tracking-wider">
                            {book.readingMedium}
                        </span>
                    )}
                    {resolvedTags.map(tag => (
                        <TagBadge key={tag.id} tag={tag} />
                    ))}
                </div>
            </div>

            {/* Action Icon */}
            <div className="absolute top-3 right-3 text-slate-300 group-hover:text-indigo-500 transition-colors">
                <MoreHorizontal size={20} />
            </div>
        </div>
    );
};

export default BookListItem;