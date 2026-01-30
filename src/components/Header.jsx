import React from 'react';

const Header = ({ onStatsClick, onHomeClick, onDashboardClick }) => {
    return (
        <div className="border-b-2 border-black pb-2 mb-2">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end">
                <div>
                    <h1 className="text-xl font-bold font-serif leading-none">
                        <a href="#" onClick={(e) => { e.preventDefault(); onHomeClick(); }} className="no-underline text-black hover:text-black">
                            SUDIP'S BOOK TRACKER
                        </a>
                    </h1>
                    <div className="text-xs text-gray-600 mt-1">
                        Index of digital & physical library assets.
                    </div>
                </div>
                
                <div className="mt-2 md:mt-0 text-sm">
                    <nav className="flex gap-1 flex-wrap">
                        <span>[</span>
                        <a href="#" onClick={(e) => { e.preventDefault(); onHomeClick(); }}>Home</a>
                        <span>]</span>
                        
                        <span>[</span>
                        <a href="#" onClick={(e) => { e.preventDefault(); onDashboardClick(); }}>Dashboard</a>
                        <span>]</span>
                        
                        <span>[</span>
                        <a href="#" onClick={(e) => { e.preventDefault(); onStatsClick(); }}>Statistics</a>
                        <span>]</span>
                        
                        <span className="ml-2 text-gray-400">|</span>
                        
                        <span className="ml-2">External: </span>
                        <a href="https://github.com/yourusername/repo" target="_blank" rel="noreferrer">Source</a>
                        <span>, </span>
                        <a href="https://yourwebsite.com" target="_blank" rel="noreferrer">Website</a>
                    </nav>
                </div>
            </div>
        </div>
    );
};

export default Header;