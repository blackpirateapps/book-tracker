import React, { useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { ArrowLeft, BookOpen, FileText, TrendingUp, Users, Tablet } from 'lucide-react';

const Stats = ({ onBack }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/stats');
                if (res.ok) setStats(await res.json());
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="glass-panel p-8 text-center">
                <div className="animate-pulse text-muted">Loading statistical data...</div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="glass-panel bg-red-500/20 border-red-500/30 p-6 text-center">
                <p className="text-red-300 font-medium">Error loading statistical data.</p>
            </div>
        );
    }

    const years = Object.keys(stats.booksByYear).sort((a, b) => b - a);

    // Transform data for charts
    const chartData = years.slice().reverse().map(year => {
        const books = stats.booksByYear[year];
        const pages = books.reduce((sum, b) => sum + (b.pageCount || 0), 0);
        return {
            name: year,
            books: books.length,
            pages: pages
        };
    });

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-panel-dark px-3 py-2 text-sm">
                    <p className="text-white font-medium">{label}</p>
                    <p className="text-muted">{payload[0].value} {payload[0].dataKey}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="pb-10">
            {/* Back Button */}
            <button
                onClick={onBack}
                className="btn-glass inline-flex items-center gap-2 text-sm mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Library
            </button>

            {/* Title */}
            <div className="glass-panel p-6 mb-6">
                <h1 className="font-semibold text-2xl mb-2">Library Statistics</h1>
                <p className="text-muted text-sm">Comprehensive reading activity report</p>
            </div>

            {/* --- TOP ROW: SUMMARY & GRAPHS --- */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6">

                {/* Metric Cards */}
                <div className="glass-panel p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <div className="text-3xl font-bold">{stats.totals.books}</div>
                        <div className="text-xs text-muted uppercase tracking-wide">Total Books</div>
                    </div>
                </div>

                <div className="glass-panel p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <div className="text-3xl font-bold">{stats.totals.pages.toLocaleString()}</div>
                        <div className="text-xs text-muted uppercase tracking-wide">Total Pages</div>
                    </div>
                </div>

                <div className="glass-panel p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <div className="text-3xl font-bold">{stats.totals.avgPerYear}</div>
                        <div className="text-xs text-muted uppercase tracking-wide">Avg / Year</div>
                    </div>
                </div>

                <div className="glass-panel p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <Users className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                        <div className="text-3xl font-bold">{stats.authorStats?.length || 0}</div>
                        <div className="text-xs text-muted uppercase tracking-wide">Unique Authors</div>
                    </div>
                </div>
            </div>

            {/* Graphs Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                {/* Books Chart */}
                <div className="glass-panel p-4">
                    <div className="section-header -mx-4 -mt-4 mb-4 rounded-t-[20px]">
                        <BookOpen className="w-4 h-4" />
                        Books Read / Year
                    </div>
                    <div style={{ width: '100%', height: 200 }}>
                        <ResponsiveContainer>
                            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                <XAxis
                                    dataKey="name"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: 'rgba(255,255,255,0.5)' }}
                                />
                                <YAxis
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: 'rgba(255,255,255,0.5)' }}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                <Bar dataKey="books" radius={[6, 6, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={`url(#booksGradient)`} />
                                    ))}
                                </Bar>
                                <defs>
                                    <linearGradient id="booksGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#8b5cf6" />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pages Chart */}
                <div className="glass-panel p-4">
                    <div className="section-header -mx-4 -mt-4 mb-4 rounded-t-[20px]">
                        <FileText className="w-4 h-4" />
                        Pages Read / Year
                    </div>
                    <div style={{ width: '100%', height: 200 }}>
                        <ResponsiveContainer>
                            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                                <XAxis
                                    dataKey="name"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: 'rgba(255,255,255,0.5)' }}
                                />
                                <YAxis
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: 'rgba(255,255,255,0.5)' }}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                <Bar dataKey="pages" radius={[6, 6, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={`url(#pagesGradient)`} />
                                    ))}
                                </Bar>
                                <defs>
                                    <linearGradient id="pagesGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#a855f7" />
                                        <stop offset="100%" stopColor="#ec4899" />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* --- DETAILED DATA ROW --- */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* Year Log (Left) */}
                <div className="lg:col-span-3">
                    <div className="glass-panel p-4">
                        <div className="section-header -mx-4 -mt-4 mb-4 rounded-t-[20px]">
                            <TrendingUp className="w-4 h-4" />
                            Annual Reading Log
                        </div>
                        <div className="overflow-y-auto max-h-[500px] space-y-6">
                            {years.map(year => (
                                <div key={year}>
                                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10">
                                        <span className="font-semibold text-lg">{year}</span>
                                        <span className="text-xs text-muted">
                                            {stats.booksByYear[year].length} books • {stats.booksByYear[year].reduce((s, b) => s + (b.pageCount || 0), 0).toLocaleString()} pages
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {stats.booksByYear[year].map(b => (
                                            <div key={b.id} className="flex justify-between items-center py-2 px-3 glass-card hover:bg-white/10 transition-colors">
                                                <span className="font-medium text-sm">{b.title}</span>
                                                <span className="text-xs text-muted">{b.pageCount || 0} pages</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Analysis (Right) */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* Top Authors */}
                    <div className="glass-panel p-4">
                        <div className="section-header -mx-4 -mt-4 mb-4 rounded-t-[20px]">
                            <Users className="w-4 h-4" />
                            Top Authors
                        </div>
                        <div className="space-y-2">
                            {stats.authorStats.slice(0, 10).map((a, i) => (
                                <div key={i} className="flex justify-between items-center py-2 px-3 glass-card">
                                    <span className="text-sm">{a.name}</span>
                                    <span className="text-xs font-bold text-accent">{a.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Formats */}
                    <div className="glass-panel p-4">
                        <div className="section-header -mx-4 -mt-4 mb-4 rounded-t-[20px]">
                            <Tablet className="w-4 h-4" />
                            Reading Format
                        </div>
                        <div className="space-y-4">
                            {Object.entries(stats.mediumStats).map(([medium, count]) => (
                                <div key={medium}>
                                    <div className="flex justify-between text-xs text-muted mb-1">
                                        <span className="capitalize">{medium}</span>
                                        <span>{count} books</span>
                                    </div>
                                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                                            style={{ width: `${(count / stats.totals.books) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Stats;