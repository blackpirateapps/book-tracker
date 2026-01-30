import React from 'react';

const BookListItem = ({ book, tagsMap, onClick, isPartial }) => {
    const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/40x60?text=No+Cover`;
    const authors = isPartial ? '...' : (book.authors ? book.authors.join(', ') : 'Unknown');
    const resolvedTags = (!isPartial && book.tags) ? book.tags.map(id => tagsMap.get(id)).filter(Boolean) : [];

    return (
        <div onClick={() => onClick(book.id)} className="flex gap-2 cursor-pointer hover:bg-yellow-100 transition-colors p-1 border-b border-dotted border-gray-300 last:border-0">
            {/* Tiny Cover */}
            <div className="flex-shrink-0 border border-gray-400 w-[40px] h-[60px] bg-gray-200">
                <img src={coverUrl} alt="" className="w-full h-full object-cover" />
            </div>

            {/* Text Info */}
            <div className="flex-grow min-w-0 flex flex-col justify-between">
                <div>
                    <div className="font-bold text-sm text-blue-800 leading-tight">
                        {book.title}
                    </div>
                    <div className="text-xs text-gray-700">
                        by {authors}
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-1">
                     {/* Tags */}
                    {resolvedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {resolvedTags.map(tag => (
                                <span key={tag.id} className="text-[10px] border border-gray-300 px-1 bg-gray-50 text-gray-600">
                                    {tag.name}
                                </span>
                            ))}
                        </div>
                    )}
                    
                    {/* Progress Text */}
                    {book.shelf === 'currentlyReading' && (
                        <span className="text-[10px] font-mono text-green-700 ml-auto border border-green-200 bg-green-50 px-1">
                            {book.readingProgress}%
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookListItem;