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
        <div style={{ 
            fontFamily: '"Times New Roman", Times, serif', 
            maxWidth: '750px', 
            width: '100%', 
            boxSizing: 'border-box',
            margin: '0 auto', 
            padding: '15px', 
            color: '#000',
            backgroundColor: '#fff',
            minHeight: '100vh'
        }}>
            {/* Header is global */}
            <Header 
                onHomeClick={handleHomeClick}
                onStatsClick={handleStatsClick}
                onDashboardClick={handleDashboardClick}
            />

            <Routes>
                <Route path="/" element={<Home tagsMap={tagsMap} />} />
                <Route path="/book/:id" element={<BookDetailsPage tagsMap={tagsMap} />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
            </Routes>

            <div style={{ borderTop: '1px solid #000', marginTop: '40px', paddingTop: '10px', textAlign: 'center' }}>
                <small style={{ fontSize: '11px', color: '#666' }}>
                    Page generated at {new Date().toLocaleTimeString()} <br/>
                    &copy; 2026 Sudip's Library • <a href="#" style={{ color: '#0000AA' }}>Contact Webmaster</a>
                </small>
            </div>
        </div>
    );
}

export default App;