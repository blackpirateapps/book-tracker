import React, { useState, useEffect } from 'react';
import { Quote, Sparkles } from 'lucide-react';

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

    if (loading) return (
        <div className="glass-card rounded-2xl p-6 mb-8 animate-pulse flex flex-col items-center justify-center h-32">
            <Sparkles size={20} className="text-slate-300 mb-2" />
            <div className="text-xs text-slate-400 font-medium tracking-wider">LOADING INSPIRATION...</div>
        </div>
    );
    
    if (!highlight) return null;

    return (
        <div className="glass-card rounded-2xl p-6 mb-8 relative overflow-hidden group">
            {/* Decoration */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-200/30 rounded-full blur-2xl pointer-events-none group-hover:bg-yellow-300/40 transition-colors duration-700"></div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-yellow-100 rounded-lg text-yellow-600">
                        <Quote size={14} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Quote of the Day
                    </span>
                </div>
                
                <p className="font-serif text-lg md:text-xl text-slate-700 italic leading-relaxed mb-4 text-center px-4">
                    "{highlight.highlight}"
                </p>
                
                <div className="flex justify-end items-center gap-2 border-t border-slate-200/50 pt-3 mt-2">
                    <div className="text-right">
                        <div className="text-sm font-bold text-slate-800">{highlight.author}</div>
                        <div className="text-xs text-slate-500 font-medium italic">{highlight.title}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RandomHighlight;