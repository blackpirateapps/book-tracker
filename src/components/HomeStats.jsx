import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';

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

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-panel-dark px-3 py-2 text-sm">
                    <p className="text-white font-medium">{label}</p>
                    <p className="text-muted">{payload[0].value} books</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="font-medium text-sm">Reading Activity</span>
            </div>
            <div style={{ width: '100%', height: 140 }}>
                <ResponsiveContainer>
                    <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <XAxis
                            dataKey="name"
                            fontSize={11}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'rgba(255,255,255,0.5)' }}
                        />
                        <YAxis
                            fontSize={11}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'rgba(255,255,255,0.5)' }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                        <Bar dataKey="books" radius={[6, 6, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={`url(#barGradient)`}
                                />
                            ))}
                        </Bar>
                        <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                        </defs>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="text-center text-xs text-muted mt-2">Books read per year</div>
        </div>
    );
};

export default HomeStats;