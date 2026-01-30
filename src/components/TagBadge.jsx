import React from 'react';

const TagBadge = ({ tag }) => {
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 mr-1.5 mt-1 tracking-wide uppercase">
            {tag.name}
        </span>
    );
};

export default TagBadge;