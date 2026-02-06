import React, { useState, useEffect } from 'react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer,
    Cell
} from 'recharts';

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

    if (loading) return <div className="p-4 italic text-gray-600">Loading statistical data...</div>;
    if (!stats) return <div className="p-4 text-red-700 font-bold">Error loading statistical data.</div>;

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

    return (
        <div className="text-sm pb-10">
            <div className="mb-4 border-b border-black pb-1 flex justify-between items-center">
                <button onClick={onBack} className="text-blue-800 underline text-xs">&larr; RETURN TO INDEX</button>
                <span className="text-tiny text-gray-500 font-mono">REP_ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
            </div>

            <h1 className="font-bold text-xl mb-6 font-serif border-b-2 border-black pb-1">LIBRARY STATISTICAL REPORT</h1>

            {/* --- TOP ROW: SUMMARY & GRAPHS --- */}
            <div className="flex flex-col xl:flex-row gap-6 mb-8">
                
                {/* Metrics Table */}
                <div className="w-full xl:w-1/4">
                    <h3 className="font-bold bg-gray-200 border border-black border-b-0 px-2 py-1 text-xs">SUMMARY METRICS</h3>
                    <table className="w-full border border-black border-collapse text-left bg-white">
                        <tbody>
                            <tr className="border-b border-gray-300">
                                <td className="p-2 font-bold text-gray-600 border-r border-gray-300">Total Books</td>
                                <td className="p-2 font-mono font-bold text-lg">{stats.totals.books}</td>
                            </tr>
                            <tr className="border-b border-gray-300">
                                <td className="p-2 font-bold text-gray-600 border-r border-gray-300">Total Pages</td>
                                <td className="p-2 font-mono font-bold text-lg">{stats.totals.pages.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td className="p-2 font-bold text-gray-600 border-r border-gray-300">Avg Books / Year</td>
                                <td className="p-2 font-mono font-bold text-lg">{stats.totals.avgPerYear}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Graphs Area */}
                <div className="w-full xl:w-3/4 flex flex-col md:flex-row gap-4">
                    
                    {/* Books Chart */}
                    <div className="flex-1 border border-gray-400 p-3 bg-white shadow-sm">
                        <div className="font-bold text-xs uppercase mb-4 border-b border-gray-200 pb-1 text-gray-500">Books Read / Year</div>
                        <div style={{ width: '100%', height: 200 }}>
                            <ResponsiveContainer>
                                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={{ stroke: '#ccc' }} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={{ stroke: '#ccc' }} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #000', fontSize: '11px' }}
                                        cursor={{ fill: '#f5f5f5' }}
                                    />
                                    <Bar dataKey="books" fill="#000" barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Pages Chart */}
                    <div className="flex-1 border border-gray-400 p-3 bg-white shadow-sm">
                        <div className="font-bold text-xs uppercase mb-4 border-b border-gray-200 pb-1 text-gray-500">Pages Read / Year</div>
                        <div style={{ width: '100%', height: 200 }}>
                            <ResponsiveContainer>
                                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={{ stroke: '#ccc' }} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={{ stroke: '#ccc' }} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #000', fontSize: '11px' }}
                                        cursor={{ fill: '#f5f5f5' }}
                                    />
                                    <Bar dataKey="pages" fill="#444" barSize={30}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#333' : '#666'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            </div>

            {/* --- DETAILED DATA ROW --- */}
            <div className="flex flex-col lg:flex-row gap-6">
                
                {/* Year Log (Left) */}
                <div className="w-full lg:w-3/5">
                    <h3 className="font-bold bg-gray-200 border border-black border-b-0 px-2 py-1 text-xs">ANNUAL LOG [FULL]</h3>
                    <div className="border border-black p-3 bg-white overflow-y-auto max-h-[600px]">
                        {years.map(year => (
                            <div key={year} className="mb-6 last:mb-0">
                                <div className="font-bold border-b border-gray-400 mb-2 flex justify-between bg-gray-50 px-2 py-1 items-center">
                                    <span className="text-base">{year}</span>
                                    <span className="text-xs text-gray-600">{stats.booksByYear[year].length} items • {stats.booksByYear[year].reduce((s,b)=>s+(b.pageCount||0),0).toLocaleString()} pages</span>
                                </div>
                                <table className="w-full text-xs border-collapse">
                                    <tbody>
                                        {stats.booksByYear[year].map(b => (
                                            <tr key={b.id} className="border-b border-dotted border-gray-200 hover:bg-yellow-50">
                                                <td className="py-1 pr-4 font-bold text-blue-900 w-2/3">{b.title}</td>
                                                <td className="py-1 text-gray-500 text-right">{b.pageCount || 0} p.</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Analysis (Right) */}
                <div className="w-full lg:w-2/5 flex flex-col gap-6">
                    
                    {/* Top Authors */}
                    <div>
                        <h3 className="font-bold bg-gray-200 border border-black border-b-0 px-2 py-1 text-xs uppercase">Distribution: Top Authors</h3>
                        <div className="border border-black bg-white">
                            <table className="w-full border-collapse text-xs">
                                <thead className="bg-gray-50 border-b border-gray-300 text-gray-500">
                                    <tr>
                                        <th className="p-2 text-left">Author Name</th>
                                        <th className="p-2 text-right">Volume</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.authorStats.slice(0, 12).map((a, i) => (
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
                    <div>
                        <h3 className="font-bold bg-gray-200 border border-black border-b-0 px-2 py-1 text-xs uppercase">Distribution: Media Type</h3>
                        <div className="border border-black bg-white p-2">
                            {Object.entries(stats.mediumStats).map(([medium, count]) => (
                                <div key={medium} className="mb-2 last:mb-0">
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
        </div>
    );
};

export default Stats;