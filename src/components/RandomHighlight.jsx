import React, { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';

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

    if (loading) return null;
    if (!highlight) return null;

    return (
        <div className="minimal-card p-5 mb-8 relative group">
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-slate-400">
                    <Quote size={14} className="text-slate-300" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                        Daily Inspiration
                    </span>
                </div>
                
                <p className="font-serif text-base text-slate-700 italic leading-relaxed px-1">
                    "{highlight.highlight}"
                </p>
                
                <div className="text-right mt-1">
                    <div className="text-xs font-semibold text-slate-800">{highlight.author}</div>
                    <div className="text-[10px] text-slate-400">{highlight.title}</div>
                </div>
            </div>
        </div>
    );
};

export default RandomHighlight;