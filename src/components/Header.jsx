import React from 'react';
import { Library, LayoutDashboard, TrendingUp, Github, ExternalLink } from 'lucide-react';

const Header = ({ onStatsClick, onHomeClick, onDashboardClick }) => {
    const linkStyle = {
        textDecoration: 'none',
        color: '#0000AA',
        fontSize: '13px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        whiteSpace: 'nowrap',
        marginRight: '10px',
        cursor: 'pointer'
    };

    return (
        <div style={{ marginBottom: '20px' }}>
            <h1 style={{ marginBottom: '5px', fontSize: '28px', wordWrap: 'break-word', cursor: 'pointer' }} onClick={onHomeClick}>
                <Library size={24} style={{ display: 'inline', verticalAlign: 'baseline', marginRight: '8px' }} />
                Sudip's book tracker
            </h1>
            <div style={{ fontSize: '14px', color: '#555', fontStyle: 'italic', marginBottom: '10px' }}>
                "A digital catalog of my literary journey."
            </div>

            {/* Navbar */}
            <div style={{ 
                borderTop: '1px solid #ccc', 
                borderBottom: '1px solid #ccc', 
                padding: '8px 0',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '5px 10px'
            }}>
                <a href="#" onClick={(e) => { e.preventDefault(); onDashboardClick(); }} style={linkStyle}>
                    <LayoutDashboard size={14} /> Dashboard
                </a>
                <span style={{color: '#ccc'}}>|</span>
                <a href="#" onClick={(e) => { e.preventDefault(); onStatsClick(); }} style={linkStyle}>
                    <TrendingUp size={14} /> Stats
                </a>
                <span style={{color: '#ccc'}}>|</span>
                <a href="#" onClick={e => e.preventDefault()} style={linkStyle}>
                    <Github size={14} /> Source Code
                </a>
                <span style={{color: '#ccc'}}>|</span>
                <a href="#" onClick={e => e.preventDefault()} style={linkStyle}>
                    <ExternalLink size={14} /> Website
                </a>
            </div>
        </div>
    );
};

export default Header;