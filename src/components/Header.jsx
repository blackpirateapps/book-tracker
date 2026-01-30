import React from 'react';
import { Library, LayoutDashboard, TrendingUp, Github, Globe } from 'lucide-react';

const Header = ({ onStatsClick, onHomeClick, onDashboardClick }) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <div 
                className="flex items-center gap-3 cursor-pointer group" 
                onClick={onHomeClick}
            >
                <div className="p-2 bg-indigo-500/10 rounded-xl group-hover:bg-indigo-500/20 transition-colors duration-300">
                    <Library size={28} className="text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                        Book Tracker
                    </h1>
                    <p className="text-xs text-slate-500 font-medium tracking-wide">
                        DIGITAL LIBRARY
                    </p>
                </div>
            </div>

            <nav className="flex items-center gap-1 md:gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                <NavButton onClick={onDashboardClick} icon={LayoutDashboard} label="Dashboard" />
                <NavButton onClick={onStatsClick} icon={TrendingUp} label="Stats" />
                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                <SocialLink href="https://github.com/yourusername/repo" icon={Github} />
                <SocialLink href="https://yourwebsite.com" icon={Globe} />
            </nav>
        </div>
    );
};

const NavButton = ({ onClick, icon: Icon, label }) => (
    <button 
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-white/50 hover:text-indigo-600 transition-all duration-200 text-sm font-medium whitespace-nowrap"
    >
        <Icon size={16} />
        {label}
    </button>
);

const SocialLink = ({ href, icon: Icon }) => (
    <a 
        href={href} 
        target="_blank" 
        rel="noreferrer"
        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white/50 rounded-lg transition-all duration-200"
    >
        <Icon size={18} />
    </a>
);

export default Header;