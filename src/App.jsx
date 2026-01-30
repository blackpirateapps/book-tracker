import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import BookDetailsPage from './pages/BookDetailsPage';
import StatsPage from './pages/StatsPage';
import DashboardPage from './pages/DashboardPage';

function App() {
    const [tagsMap, setTagsMap] = useState(new Map());
    const navigate = useNavigate();

    // Global Data Initialization (Tags)
    useEffect(() => {
        const init = async () => {
            try {
                let tags = [];
                try {
                    const tagsRes = await fetch('/api/tags');
                    if (tagsRes.ok) tags = await tagsRes.json();
                } catch (e) { console.warn(e); }
                
                if (tags.length === 0) tags = [];

                const tMap = new Map();
                tags.forEach(tag => tMap.set(tag.id, tag));
                setTagsMap(tMap);
            } catch (err) {
                console.error("Global init error", err);
            }
        };
        init();
    }, []);

    const handleHomeClick = () => navigate('/');
    const handleStatsClick = () => navigate('/stats');
    const handleDashboardClick = () => navigate('/dashboard');

    return (
        <div className="dense-container py-2">
            <Header 
                onHomeClick={handleHomeClick}
                onStatsClick={handleStatsClick}
                onDashboardClick={handleDashboardClick}
            />

            <main className="mt-2">
                <Routes>
                    <Route path="/" element={<Home tagsMap={tagsMap} />} />
                    <Route path="/book/:id" element={<BookDetailsPage tagsMap={tagsMap} />} />
                    <Route path="/stats" element={<StatsPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                </Routes>
            </main>

            <div className="mt-8 pt-4 border-t border-gray-400 text-center text-tiny text-gray-600">
                [ Generated: {new Date().toLocaleString()} ] &bull; [ &copy; 2026 Sudip's Library ]
            </div>
        </div>
    );
}

export default App;