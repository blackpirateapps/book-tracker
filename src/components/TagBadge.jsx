import React from 'react';

const TagBadge = ({ tag }) => {
    return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 tracking-wide lowercase">
            #{tag.name}
        </span>
    );
};

export default TagBadge;