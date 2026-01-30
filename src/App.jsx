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
                
                if (tags.length === 0) tags = MOCK_DATA.tags;

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
        <div className="min-h-screen w-full flex flex-col items-center py-6 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-3xl min-h-[85vh] flex flex-col">
                {/* Header is global */}
                <Header 
                    onHomeClick={handleHomeClick}
                    onStatsClick={handleStatsClick}
                    onDashboardClick={handleDashboardClick}
                />

                <main className="flex-grow mt-6">
                    <Routes>
                        <Route path="/" element={<Home tagsMap={tagsMap} />} />
                        <Route path="/book/:id" element={<BookDetailsPage tagsMap={tagsMap} />} />
                        <Route path="/stats" element={<StatsPage />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                    </Routes>
                </main>

                <div className="mt-12 pt-8 border-t border-slate-200 text-center">
                    <small className="text-xs text-slate-400 font-medium">
                        &copy; 2026 Sudip's Library
                    </small>
                </div>
            </div>
        </div>
    );
}

export default App;