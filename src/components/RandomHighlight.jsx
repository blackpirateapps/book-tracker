import React, { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';
import { MOCK_DATA } from '../data/mockData';

const RandomHighlight = () => {
    const [highlight, setHighlight] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            // Simulating an API call
            await new Promise(r => setTimeout(r, 600));
            setHighlight(MOCK_DATA.highlight);
            setLoading(false);
        };
        load();
    }, []);

    if (loading) return <div style={{ fontSize: '12px', color: '#666' }}>Loading daily quote...</div>;

    return (
        <div style={{ backgroundColor: '#ffffe0', border: '1px solid #ccc', padding: '10px', marginBottom: '25px' }}>
            <div style={{ fontWeight: 'bold', borderBottom: '1px dotted #999', paddingBottom: '5px', marginBottom: '5px', fontSize: '12px' }}>
                <Quote size={12} style={{ display: 'inline', marginRight: '5px' }} />
                Quote of The day
            </div>
            <p style={{ fontFamily: 'serif', fontStyle: 'italic', margin: '5px 0', fontSize: '14px', lineHeight: '1.4' }}>
                "{highlight.highlight}"
            </p>
            <div style={{ textAlign: 'right', fontSize: '12px' }}>
                -- {highlight.author}
            </div>
        </div>
    );
};

export default RandomHighlight;