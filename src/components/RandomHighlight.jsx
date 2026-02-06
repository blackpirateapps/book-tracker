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

    if (loading) {
        return (
            <div className="glass-panel p-4">
                <div className="animate-pulse flex items-center gap-2 text-muted text-sm">
                    <Quote className="w-4 h-4" />
                    Loading quote...
                </div>
            </div>
        );
    }

    if (!highlight) return null;

    return (
        <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-3">
                <Quote className="w-4 h-4 text-purple-400" />
                <span className="font-medium text-sm">Quote of the Day</span>
            </div>
            <blockquote className="text-sm italic text-white/80 leading-relaxed mb-3 pl-3 border-l-2 border-purple-400/50">
                "{highlight.highlight}"
            </blockquote>
            <div className="text-right text-xs text-muted">
                — {highlight.author}, <cite className="text-accent">{highlight.title}</cite>
            </div>
        </div>
    );
};

export default RandomHighlight;