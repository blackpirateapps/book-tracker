import React, { useState, useEffect } from 'react';

const RandomHighlight = () => {
    const [highlight, setHighlight] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHighlight = async () => {
            try {
                const res = await fetch('/api/random-highlight');
                if (res.ok) {
                    const data = await res.json();
                    setHighlight(data);
                } else {
                    setHighlight(null); 
                }
            } catch (e) {
                console.error("Failed to fetch highlight", e);
                setHighlight(null);
            } finally {
                setLoading(false);
            }
        };
        fetchHighlight();
    }, []);

    if (loading) return <div className="border border-gray-400 p-2 text-xs italic">Loading quote...</div>;
    if (!highlight) return null;

    return (
        <div className="border border-gray-400 p-2 bg-white">
            <div className="font-bold border-b border-gray-300 mb-2 pb-1 text-sm bg-gray-100 px-1">Quote of Day</div>
            <div className="font-serif italic text-sm text-gray-800 mb-2 px-1">
                "{highlight.highlight}"
            </div>
            <div className="text-right text-xs text-gray-600 px-1">
                &mdash; {highlight.author}, <cite>{highlight.title}</cite>
            </div>
        </div>
    );
};

export default RandomHighlight;