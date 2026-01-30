import React from 'react';
import { MoreHorizontal, CheckCircle2 } from 'lucide-react';
import TagBadge from './TagBadge';

const BookListItem = ({ book, shelf, tagsMap, onClick, isPartial, viewMode = 'list' }) => {
    const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/80x120?text=No+Cover`;
    
    const authors = isPartial ? 'Loading...' : (book.authors ? book.authors.join(', ') : 'Unknown');
    const resolvedTags = (!isPartial && book.tags) ? book.tags.map(id => tagsMap.get(id)).filter(Boolean) : [];

    const isGrid = viewMode === 'grid';

    return (
        <div 
            onClick={() => onClick(book.id)}
            className={`group minimal-card cursor-pointer flex ${isGrid ? 'flex-col p-4 h-full' : 'p-3 mb-3 gap-4'}`}
        >
            {/* Cover Image */}
            <div className={`flex-shrink-0 bg-slate-100 border border-slate-100 dark:bg-slate-700 dark:border-slate-700 rounded overflow-hidden ${isGrid ? 'w-full aspect-[2/3] mb-3 shadow-sm' : 'w-[50px] sm:w-[60px] h-[75px] sm:h-[90px]'}`}>
                <img 
                    src={coverUrl} 
                    alt={book.title} 
                    loading="lazy"
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Content */}
            <div className={`flex-grow min-w-0 flex flex-col ${isGrid ? 'text-center items-center' : 'justify-center'}`}>
                <h3 className={`font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate w-full ${isGrid ? 'text-sm mb-1' : 'text-sm sm:text-base mb-0.5 pr-6'}`}>
                    {book.title}
                </h3>
                
                <p className={`text-xs text-slate-500 dark:text-slate-400 ${isGrid ? 'mb-2' : 'mb-1.5'} ${isPartial ? 'animate-pulse bg-slate-100 dark:bg-slate-700 w-24 h-4 rounded inline-block' : ''}`}>
                    {isPartial ? '' : authors}
                </p>
                
                {shelf === 'currentlyReading' && !isPartial && (
                    <div className={`${isGrid ? 'w-full px-2 mb-2' : 'mb-1.5'}`}>
                        <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-blue-500 rounded-full" 
                                style={{ width: `${book.readingProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {shelf === 'read' && book.finishedOn && !isPartial && (
                    <div className="flex items-center text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                        <CheckCircle2 size={10} className="mr-1 text-emerald-500" /> 
                        {book.finishedOn}
                    </div>
                )}
                
                <div className={`flex flex-wrap gap-1 mt-auto ${isGrid ? 'justify-center' : ''}`}>
                    {book.readingMedium && !isPartial && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                            {book.readingMedium}
                        </span>
                    )}
                    {resolvedTags.slice(0, isGrid ? 2 : undefined).map(tag => ( // Limit tags in grid
                        <TagBadge key={tag.id} tag={tag} />
                    ))}
                </div>
            </div>

            {/* Action Icon - Hide in Grid or absolute position */}
            {!isGrid && (
                <div className="text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors">
                    <MoreHorizontal size={16} />
                </div>
            )}
        </div>
    );
};

export default BookListItem;