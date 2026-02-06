import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const HomeStats = () => {
    const [data, setData] = useState([]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/stats');
                if (res.ok) {
                    const stats = await res.json();
                    // Transform for chart: Last 5 years
                    const years = Object.keys(stats.booksByYear).sort((a, b) => b - a).slice(0, 5).reverse();
                    const chartData = years.map(year => ({
                        name: year,
                        books: stats.booksByYear[year].length
                    }));
                    setData(chartData);
                }
            } catch (e) { console.error(e); }
        };
        fetchStats();
    }, []);

    if (data.length === 0) return null;

    return (
        <div className="border border-gray-400 p-2 bg-white mb-4">
            <div className="font-bold border-b border-gray-300 mb-2 pb-1 text-sm bg-gray-100 px-1">Reading Activity</div>
            <div style={{ width: '100%', height: 150 }}>
                <ResponsiveContainer>
                    <BarChart data={data}>
                        <XAxis dataKey="name" fontSize={10} />
                        <YAxis fontSize={10} />
                        <Tooltip />
                        <Bar dataKey="books" fill="#333" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="text-center text-xs text-gray-500 mt-1">Books read per year</div>
        </div>
    );
};

export default HomeStats;