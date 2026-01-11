import React from 'react';

const TagBadge = ({ tag }) => {
    const style = {
        border: '1px solid #ccc',
        padding: '1px 4px',
        fontSize: '10px',
        marginRight: '4px',
        backgroundColor: '#f4f4f4',
        color: '#333',
        textTransform: 'uppercase',
        fontFamily: 'monospace',
        borderRadius: '2px',
        display: 'inline-block',
        marginTop: '2px'
    };

    return (
        <span style={style}>
            {tag.name}
        </span>
    );
};

export default TagBadge;