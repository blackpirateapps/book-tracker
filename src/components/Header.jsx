import React from 'react';
import { Library, LayoutDashboard, TrendingUp, Github, Globe } from 'lucide-react';

const Header = ({ onStatsClick, onHomeClick, onDashboardClick }) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-1">
            <div 
                className="flex items-center gap-3 cursor-pointer group" 
                onClick={onHomeClick}
            >
                <div className="p-1.5 rounded-lg bg-slate-900 text-white shadow-sm group-hover:bg-slate-800 transition-colors">
                    <Library size={20} />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-slate-900 leading-none">
                        Book Tracker
                    </h1>
                    <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase mt-0.5">
                        Library
                    </p>
                </div>
            </div>

            <nav className="flex items-center gap-1 md:gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                <NavButton onClick={onDashboardClick} icon={LayoutDashboard} label="Dashboard" />
                <NavButton onClick={onStatsClick} icon={TrendingUp} label="Stats" />
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <SocialLink href="https://github.com/yourusername/repo" icon={Github} />
                <SocialLink href="https://yourwebsite.com" icon={Globe} />
            </nav>
        </div>
    );
};

const NavButton = ({ onClick, icon: Icon, label }) => (
    <button 
        onClick={onClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 text-xs font-semibold whitespace-nowrap"
    >
        <Icon size={14} />
        {label}
    </button>
);

const SocialLink = ({ href, icon: Icon }) => (
    <a 
        href={href} 
        target="_blank" 
        rel="noreferrer"
        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all duration-200"
    >
        <Icon size={16} />
    </a>
);

export default Header;