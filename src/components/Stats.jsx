import React, { useState, useEffect } from 'react';

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

    if (loading) return <div>Loading...</div>;
    if (!stats) return <div className="text-red-700 font-bold">Error loading data.</div>;

    const years = Object.keys(stats.booksByYear).sort((a, b) => b - a);

    return (
        <div className="text-sm">
            <div className="mb-4 border-b border-black pb-1">
                <button onClick={onBack} className="text-blue-800 underline">&larr; Return to Index</button>
            </div>

            <h1 className="font-bold text-lg mb-4">STATISTICAL REPORT</h1>

            {/* Overview Table */}
            <div className="mb-6">
                <h3 className="font-bold bg-gray-200 border border-black border-b-0 px-2 py-1 inline-block text-xs">OVERVIEW</h3>
                <table className="w-full border border-black collapse text-left">
                    <thead className="bg-gray-100 border-b border-black">
                        <tr>
                            <th className="p-1 border-r border-gray-400 w-1/3">Metric</th>
                            <th className="p-1">Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-gray-300">
                            <td className="p-1 border-r border-gray-300">Total Books</td>
                            <td className="p-1 font-mono font-bold">{stats.totals.books}</td>
                        </tr>
                        <tr className="border-b border-gray-300">
                            <td className="p-1 border-r border-gray-300">Total Pages</td>
                            <td className="p-1 font-mono font-bold">{stats.totals.pages.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td className="p-1 border-r border-gray-300">Avg Books/Year</td>
                            <td className="p-1 font-mono font-bold">{stats.totals.avgPerYear}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Year Log */}
                <div className="w-full md:w-1/2">
                    <h3 className="font-bold bg-gray-200 border border-black border-b-0 px-2 py-1 inline-block text-xs">ANNUAL LOG</h3>
                    <div className="border border-black p-2 bg-white">
                        {years.map(year => (
                            <div key={year} className="mb-4">
                                <div className="font-bold border-b border-gray-400 mb-1 flex justify-between bg-gray-50 px-1">
                                    <span>{year}</span>
                                    <span>{stats.booksByYear[year].length} books</span>
                                </div>
                                <ul className="list-disc pl-5 text-xs">
                                    {stats.booksByYear[year].map(b => (
                                        <li key={b.id}>
                                            <span className="font-bold">{b.title}</span> 
                                            {b.pageCount > 0 && <span className="text-gray-500"> ({b.pageCount}p)</span>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Authors & Medium */}
                <div className="w-full md:w-1/2 flex flex-col gap-6">
                    <div>
                        <h3 className="font-bold bg-gray-200 border border-black border-b-0 px-2 py-1 inline-block text-xs">TOP AUTHORS</h3>
                        <table className="w-full border border-black collapse text-xs">
                            <tbody>
                                {stats.authorStats.slice(0, 10).map((a, i) => (
                                    <tr key={i} className="border-b border-gray-300 last:border-0 hover:bg-yellow-50">
                                        <td className="p-1 border-r border-gray-300">{a.name}</td>
                                        <td className="p-1 w-10 text-right font-mono">{a.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <h3 className="font-bold bg-gray-200 border border-black border-b-0 px-2 py-1 inline-block text-xs">FORMATS</h3>
                        <table className="w-full border border-black collapse text-xs">
                            <tbody>
                                {Object.entries(stats.mediumStats).map(([medium, count]) => (
                                    <tr key={medium} className="border-b border-gray-300 last:border-0">
                                        <td className="p-1 border-r border-gray-300 uppercase">{medium}</td>
                                        <td className="p-1 w-10 text-right font-mono">{count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Stats;