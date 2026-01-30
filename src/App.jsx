import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import BookDetailsPage from './pages/BookDetailsPage';
import StatsPage from './pages/StatsPage';
import DashboardPage from './pages/DashboardPage';

function App() {
    const [tagsMap, setTagsMap] = useState(new Map());
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    const navigate = useNavigate();

    // Theme Effect
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(!isDarkMode);

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
        <div className="min-h-screen w-full flex flex-col items-center py-6 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
            <div className="w-full max-w-4xl min-h-[85vh] flex flex-col">
                <Header 
                    onHomeClick={handleHomeClick}
                    onStatsClick={handleStatsClick}
                    onDashboardClick={handleDashboardClick}
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                />

                <main className="flex-grow mt-6">
                    <Routes>
                        <Route path="/" element={<Home tagsMap={tagsMap} />} />
                        <Route path="/book/:id" element={<BookDetailsPage tagsMap={tagsMap} />} />
                        <Route path="/stats" element={<StatsPage />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                    </Routes>
                </main>

                <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-center">
                    <small className="text-xs text-slate-400 font-medium">
                        &copy; 2026 Sudip's Library
                    </small>
                </div>
            </div>
        </div>
    );
}

export default App;