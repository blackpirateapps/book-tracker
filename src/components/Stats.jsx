import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { BookOpen, Calendar, Clock, User, ChevronDown, Download } from 'lucide-react';

const Stats = ({ onBack }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState('all');
    const booksGridRef = useRef(null);

    const handleDownloadScreenshot = async () => {
        if (!booksGridRef.current) return;
        try {
            const canvas = await html2canvas(booksGridRef.current, {
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                scale: 2
            });
            const link = document.createElement('a');
            link.download = `books-${selectedYear === 'all' ? 'all-years' : selectedYear}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Screenshot failed:', err);
        }
    };

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

    // Calculate reading duration in days
    const calcDuration = (startedOn, finishedOn) => {
        if (!startedOn || !finishedOn) return null;
        const start = new Date(startedOn);
        const end = new Date(finishedOn);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        if (days < 0) return null;
        if (days === 0) return '< 1 day';
        if (days === 1) return '1 day';
        if (days < 7) return `${days} days`;
        const weeks = Math.floor(days / 7);
        const remainingDays = days % 7;
        if (weeks === 1 && remainingDays === 0) return '1 week';
        if (remainingDays === 0) return `${weeks} weeks`;
        return `${weeks}w ${remainingDays}d`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return null;
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Memoized filtered data
    const { years, filteredBooks, filteredStats } = useMemo(() => {
        if (!stats) return { years: [], filteredBooks: [], filteredStats: null };

        const yrs = Object.keys(stats.booksByYear).sort((a, b) => b - a);

        let books = [];
        if (selectedYear === 'all') {
            Object.values(stats.booksByYear).forEach(yearBooks => {
                books = books.concat(yearBooks);
            });
        } else {
            books = stats.booksByYear[selectedYear] || [];
        }

        // Calculate filtered stats
        const totalPages = books.reduce((sum, b) => sum + (b.pageCount || 0), 0);

        return {
            years: yrs,
            filteredBooks: books,
            filteredStats: {
                books: books.length,
                pages: totalPages
            }
        };
    }, [stats, selectedYear]);

    // Chart data
    const chartData = useMemo(() => {
        if (!stats) return [];
        return Object.keys(stats.booksByYear).sort().map(year => {
            const books = stats.booksByYear[year];
            return {
                name: year,
                books: books.length,
                pages: books.reduce((sum, b) => sum + (b.pageCount || 0), 0)
            };
        });
    }, [stats]);

    if (loading) return <div className="p-4 italic text-gray-600">Loading statistical data...</div>;
    if (!stats) return <div className="p-4 text-red-700 font-bold">Error loading statistical data.</div>;

    return (
        <div className="text-sm pb-10">
            {/* Header */}
            <div className="mb-4 border-b border-black pb-1 flex justify-between items-center">
                <button onClick={onBack} className="text-blue-800 underline text-xs">&larr; RETURN TO INDEX</button>
                <span className="text-tiny text-gray-500 font-mono">REP_ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
            </div>

            <h1 className="font-bold text-xl mb-6 font-serif border-b-2 border-black pb-1">LIBRARY STATISTICAL REPORT</h1>

            {/* Year Selector & Summary Row */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                {/* Year Selector */}
                <div className="relative">
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Filter by Year</label>
                    <div className="relative">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="appearance-none border border-black bg-white px-3 py-2 pr-8 text-sm font-mono cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-black min-w-[140px]"
                        >
                            <option value="all">All Years</option>
                            {years.map(year => (
                                <option key={year} value={year}>{year} ({stats.booksByYear[year].length})</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-500" />
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="flex gap-4 items-end">
                    <div className="border border-black px-4 py-2 bg-white">
                        <div className="text-tiny text-gray-500 uppercase">Books</div>
                        <div className="text-xl font-bold font-mono">{filteredStats?.books || 0}</div>
                    </div>
                    <div className="border border-black px-4 py-2 bg-white">
                        <div className="text-tiny text-gray-500 uppercase">Pages</div>
                        <div className="text-xl font-bold font-mono">{(filteredStats?.pages || 0).toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                {/* Books Chart */}
                <div className="flex-1 border border-gray-400 p-3 bg-white shadow-sm">
                    <div className="font-bold text-xs uppercase mb-4 border-b border-gray-200 pb-1 text-gray-500">Books Read / Year</div>
                    <div style={{ width: '100%', height: 180 }}>
                        <ResponsiveContainer>
                            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={{ stroke: '#ccc' }} />
                                <YAxis fontSize={10} tickLine={false} axisLine={{ stroke: '#ccc' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #000', fontSize: '11px' }}
                                    cursor={{ fill: '#f5f5f5' }}
                                />
                                <Bar dataKey="books" barSize={30}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.name === selectedYear ? '#2563eb' : '#333'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pages Chart */}
                <div className="flex-1 border border-gray-400 p-3 bg-white shadow-sm">
                    <div className="font-bold text-xs uppercase mb-4 border-b border-gray-200 pb-1 text-gray-500">Pages Read / Year</div>
                    <div style={{ width: '100%', height: 180 }}>
                        <ResponsiveContainer>
                            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={{ stroke: '#ccc' }} />
                                <YAxis fontSize={10} tickLine={false} axisLine={{ stroke: '#ccc' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #000', fontSize: '11px' }}
                                    cursor={{ fill: '#f5f5f5' }}
                                />
                                <Bar dataKey="pages" barSize={30}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.name === selectedYear ? '#2563eb' : '#666'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Books Grid */}
            <div className="mb-6">
                <h3 className="font-bold bg-gray-200 border border-black border-b-0 px-2 py-1 text-xs uppercase flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <BookOpen className="w-3 h-3" />
                        Books {selectedYear !== 'all' ? `(${selectedYear})` : '(All Years)'}
                    </span>
                    <button
                        onClick={handleDownloadScreenshot}
                        className="flex items-center gap-1 text-gray-600 hover:text-black transition-colors p-1 hover:bg-gray-300 rounded"
                        title="Download as image"
                    >
                        <Download className="w-3 h-3" />
                    </button>
                </h3>
                <div ref={booksGridRef} className="border border-black p-4 bg-white">
                    {filteredBooks.length === 0 ? (
                        <div className="text-center text-gray-500 italic py-8">No books found for this selection.</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredBooks.map(book => {
                                const coverUrl = book.imageLinks?.thumbnail || `https://placehold.co/80x120/f3f4f6/9ca3af?text=No+Cover`;
                                const authors = Array.isArray(book.authors) ? book.authors.join(', ') : (book.authors || 'Unknown');
                                const duration = calcDuration(book.startedOn, book.finishedOn);
                                const finishDate = formatDate(book.finishedOn);

                                return (
                                    <div
                                        key={book.id}
                                        className="flex gap-3 p-3 border border-gray-300 hover:border-gray-500 hover:shadow-sm transition-all bg-gray-50 hover:bg-white"
                                    >
                                        {/* Cover */}
                                        <div className="flex-shrink-0">
                                            <img
                                                src={coverUrl}
                                                alt={book.title}
                                                className="w-16 h-24 object-cover border border-gray-300 shadow-sm"
                                            />
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0 flex flex-col">
                                            <h4 className="font-bold text-sm leading-tight line-clamp-2 text-gray-900 mb-1">
                                                {book.title}
                                            </h4>

                                            <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                                                <User className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate">{authors}</span>
                                            </div>

                                            <div className="mt-auto space-y-1">
                                                {book.pageCount && (
                                                    <div className="flex items-center gap-1 text-tiny text-gray-500">
                                                        <BookOpen className="w-3 h-3" />
                                                        <span>{book.pageCount} pages</span>
                                                    </div>
                                                )}

                                                {finishDate && (
                                                    <div className="flex items-center gap-1 text-tiny text-gray-500">
                                                        <Calendar className="w-3 h-3" />
                                                        <span>{finishDate}</span>
                                                    </div>
                                                )}

                                                {duration && (
                                                    <div className="flex items-center gap-1 text-tiny text-blue-700 font-medium">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{duration}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Stats Row */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Top Authors */}
                <div className="w-full lg:w-1/2">
                    <h3 className="font-bold bg-gray-200 border border-black border-b-0 px-2 py-1 text-xs uppercase">
                        Distribution: Top Authors
                    </h3>
                    <div className="border border-black bg-white">
                        <table className="w-full border-collapse text-xs">
                            <thead className="bg-gray-50 border-b border-gray-300 text-gray-500">
                                <tr>
                                    <th className="p-2 text-left">Author Name</th>
                                    <th className="p-2 text-right">Volume</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.authorStats.slice(0, 10).map((a, i) => (
                                    <tr key={i} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                                        <td className="p-2 border-r border-gray-200">{a.name}</td>
                                        <td className="p-2 text-right font-mono font-bold">{a.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Formats */}
                <div className="w-full lg:w-1/2">
                    <h3 className="font-bold bg-gray-200 border border-black border-b-0 px-2 py-1 text-xs uppercase">
                        Distribution: Media Type
                    </h3>
                    <div className="border border-black bg-white p-3">
                        {Object.entries(stats.mediumStats).map(([medium, count]) => (
                            <div key={medium} className="mb-3 last:mb-0">
                                <div className="flex justify-between text-tiny font-bold text-gray-600 mb-1">
                                    <span className="uppercase">{medium}</span>
                                    <span>{count} units</span>
                                </div>
                                <div className="w-full bg-gray-100 h-2 border border-gray-200">
                                    <div
                                        className="bg-gray-600 h-full"
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