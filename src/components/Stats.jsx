import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, 
    BarChart2, 
    Book, 
    Layers, 
    User, 
    PieChart,
    Loader2
} from 'lucide-react';

const Stats = ({ onBack }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/stats');
                if (!res.ok) throw new Error('Failed to load stats');
                const data = await res.json();
                setStats(data);
                
                // Set default year
                const years = Object.keys(data.booksByYear).sort((a, b) => b - a);
                if (years.length > 0) setSelectedYear(years[0]);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
            <Loader2 size={32} className="animate-spin mb-3 opacity-50" />
            <div className="text-xs font-medium tracking-widest uppercase">Analyzing Data...</div>
        </div>
    );
    
    if (!stats) return <div className="p-8 text-center text-red-500">Error loading statistics.</div>;

    const years = Object.keys(stats.booksByYear).sort((a, b) => b - a);
    const currentYearBooks = stats.booksByYear[selectedYear] || [];
    const currentYearPages = currentYearBooks.reduce((sum, b) => sum + (b.pageCount || 0), 0);
    const maxBooksInAYear = Math.max(...Object.values(stats.booksByYear).map(b => b.length), 1);

    return (
        <div className="w-full max-w-4xl mx-auto p-4 animate-fadeIn pb-12">
            {/* Back Button */}
            <button 
                onClick={onBack}
                className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors mb-8 group text-xs font-semibold uppercase tracking-wide"
            >
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                Back to Library
            </button>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-8 pb-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <BarChart2 className="text-blue-500" />
                Reading Statistics
            </h1>

            {/* --- SUMMARY CARDS --- */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="minimal-card p-6 text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Books</div>
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.totals.books}</div>
                </div>
                <div className="minimal-card p-6 text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Pages</div>
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.totals.pages.toLocaleString()}</div>
                </div>
                <div className="minimal-card p-6 text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Avg / Year</div>
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.totals.avgPerYear}</div>
                </div>
            </div>

            {/* --- ANNUAL PROGRESS CHART --- */}
            <div className="minimal-card p-6 mb-8">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                    <Layers size={16} className="text-slate-400" /> Annual Progress
                </h3>
                <div className="space-y-4">
                    {years.map(year => {
                        const count = stats.booksByYear[year].length;
                        const widthPercent = (count / maxBooksInAYear) * 100;
                        return (
                            <div key={year} className="flex items-center gap-4">
                                <span className="w-10 text-sm font-bold text-slate-500 dark:text-slate-400">{year}</span>
                                <div className="flex-grow h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                                        style={{ width: `${Math.max(widthPercent, 2)}%` }}
                                    ></div>
                                </div>
                                <span className="w-16 text-xs text-right text-slate-400">{count} books</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- DETAILED YEAR VIEW --- */}
            <div className="minimal-card p-6 mb-8 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                    <div className="flex items-center gap-2">
                        <Book size={16} className="text-slate-400" />
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Detailed Log</h3>
                        <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="ml-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {currentYearBooks.length} Books • {currentYearPages.toLocaleString()} Pages
                    </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {currentYearBooks.map(book => (
                        <div key={book.id} className="group text-center">
                            <div className="aspect-[2/3] bg-white dark:bg-slate-700 rounded shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden mb-2 group-hover:-translate-y-1 transition-transform">
                                <img 
                                    src={book.imageLinks?.thumbnail || 'https://placehold.co/60x90'} 
                                    alt={book.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium leading-tight truncate px-1">
                                {book.title}
                            </div>
                        </div>
                    ))}
                    {currentYearBooks.length === 0 && <p className="text-sm text-slate-400 col-span-full text-center py-4">No records for this year.</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* --- TOP AUTHORS --- */}
                <div className="minimal-card p-6">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                        <User size={16} className="text-slate-400" /> Top Authors
                    </h3>
                    <div className="space-y-3">
                        {stats.authorStats.slice(0, 8).map((author, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                                <span className="text-slate-600 dark:text-slate-300 truncate pr-4">{author.name}</span>
                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {author.count}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- MEDIUM STATS --- */}
                <div className="minimal-card p-6">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                        <PieChart size={16} className="text-slate-400" /> Reading Medium
                    </h3>
                    <div className="space-y-4">
                        {Object.entries(stats.mediumStats).map(([medium, count], idx) => (
                            <div key={idx}>
                                <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                                    <span className="uppercase">{medium}</span>
                                    <span>{count}</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-slate-600 dark:bg-slate-400 h-full rounded-full" 
                                        style={{ width: `${(count / stats.totals.books) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Stats;