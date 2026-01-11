import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, 
    BarChart2, 
    Book, 
    Layers, 
    User, 
    PieChart 
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
                
                // Set default year to most recent
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

    if (loading) return <div style={{ padding: '20px' }}>Loading statistics...</div>;
    if (!stats) return <div style={{ padding: '20px', color: 'red' }}>Error loading stats.</div>;

    const years = Object.keys(stats.booksByYear).sort((a, b) => b - a);
    const currentYearBooks = stats.booksByYear[selectedYear] || [];
    const currentYearPages = currentYearBooks.reduce((sum, b) => sum + (b.pageCount || 0), 0);

    // --- Helper for "Graph" Bars ---
    // Finds the max value to calculate percentage width
    const maxBooksInAYear = Math.max(...Object.values(stats.booksByYear).map(b => b.length), 1);

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Back Button */}
            <button 
                onClick={onBack}
                style={{ 
                    background: 'none', border: 'none', color: '#0000AA', cursor: 'pointer', 
                    marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '5px',
                    fontSize: '14px', padding: 0
                }}
            >
                <ArrowLeft size={16} /> Back to Library
            </button>

            <h1 style={{ borderBottom: '2px solid black', paddingBottom: '10px', marginBottom: '20px' }}>
                <BarChart2 style={{ display: 'inline', marginRight: '10px' }} />
                Reading Statistics
            </h1>

            {/* --- SUMMARY CARDS --- */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px', border: '1px solid black', padding: '15px', textAlign: 'center', backgroundColor: '#f9f9f9' }}>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', marginBottom: '5px' }}>Total Books</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.totals.books}</div>
                </div>
                <div style={{ flex: 1, minWidth: '150px', border: '1px solid black', padding: '15px', textAlign: 'center', backgroundColor: '#f9f9f9' }}>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', marginBottom: '5px' }}>Total Pages</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.totals.pages.toLocaleString()}</div>
                </div>
                <div style={{ flex: 1, minWidth: '150px', border: '1px solid black', padding: '15px', textAlign: 'center', backgroundColor: '#f9f9f9' }}>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', marginBottom: '5px' }}>Avg / Year</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.totals.avgPerYear}</div>
                </div>
            </div>

            {/* --- ANNUAL PROGRESS CHART --- */}
            <div style={{ marginBottom: '40px' }}>
                <h3 style={{ borderBottom: '1px dotted #999', paddingBottom: '5px' }}>
                    <Layers size={14} style={{ display: 'inline', marginRight: '5px' }} />
                    Annual Progress
                </h3>
                <table width="100%" cellPadding="5">
                    <tbody>
                        {years.map(year => {
                            const count = stats.booksByYear[year].length;
                            const widthPercent = (count / maxBooksInAYear) * 100;
                            return (
                                <tr key={year}>
                                    <td width="50" style={{ fontWeight: 'bold' }}>{year}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ 
                                                width: `${Math.max(widthPercent, 1)}%`, 
                                                backgroundColor: '#000080', 
                                                height: '15px',
                                                border: '1px solid black'
                                            }}></div>
                                            <span style={{ fontSize: '12px' }}>{count} books</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* --- DETAILED YEAR VIEW --- */}
            <div style={{ marginBottom: '40px', backgroundColor: '#f0f0f0', border: '1px solid #ccc', padding: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #999', paddingBottom: '10px' }}>
                    <h3 style={{ margin: 0 }}>
                        <Book size={14} style={{ display: 'inline', marginRight: '5px' }} />
                        Detailed Log: 
                        <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(e.target.value)}
                            style={{ marginLeft: '10px', padding: '5px', fontFamily: 'inherit' }}
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </h3>
                    <div style={{ fontSize: '12px' }}>
                        {currentYearBooks.length} Books • {currentYearPages.toLocaleString()} Pages
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '15px' }}>
                    {currentYearBooks.map(book => (
                        <div key={book.id} title={book.title} style={{ textAlign: 'center' }}>
                            <img 
                                src={book.imageLinks?.thumbnail || 'https://placehold.co/60x90'} 
                                alt={book.title}
                                style={{ border: '1px solid black', width: '100%', height: 'auto', marginBottom: '5px' }}
                            />
                            <div style={{ fontSize: '10px', lineHeight: '1.2', overflow: 'hidden', height: '2.4em' }}>
                                {book.title}
                            </div>
                        </div>
                    ))}
                    {currentYearBooks.length === 0 && <p>No records for this year.</p>}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                
                {/* --- TOP AUTHORS --- */}
                <div style={{ flex: 1, minWidth: '250px' }}>
                    <h3 style={{ borderBottom: '1px dotted #999', paddingBottom: '5px' }}>
                        <User size={14} style={{ display: 'inline', marginRight: '5px' }} />
                        Top Authors
                    </h3>
                    <table width="100%" border="0" cellPadding="5" style={{ fontSize: '13px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#eee', textAlign: 'left' }}>
                                <th>Author</th>
                                <th width="50" align="center">Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.authorStats.map((author, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                    <td>{author.name}</td>
                                    <td align="center">
                                        <span style={{ 
                                            backgroundColor: '#333', color: '#fff', 
                                            borderRadius: '10px', padding: '1px 6px', fontSize: '10px' 
                                        }}>
                                            {author.count}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* --- MEDIUM STATS --- */}
                <div style={{ flex: 1, minWidth: '250px' }}>
                    <h3 style={{ borderBottom: '1px dotted #999', paddingBottom: '5px' }}>
                        <PieChart size={14} style={{ display: 'inline', marginRight: '5px' }} />
                        Reading Medium
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {Object.entries(stats.mediumStats).map(([medium, count], idx) => (
                            <li key={idx} style={{ marginBottom: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '2px' }}>
                                    <span>{medium}</span>
                                    <span>{count}</span>
                                </div>
                                <div style={{ width: '100%', backgroundColor: '#eee', height: '8px' }}>
                                    <div style={{ 
                                        width: `${(count / stats.totals.books) * 100}%`, 
                                        backgroundColor: '#555', 
                                        height: '100%' 
                                    }}></div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

        </div>
    );
};

export default Stats;