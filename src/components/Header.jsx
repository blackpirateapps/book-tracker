import React from 'react';
import { BookOpen, BarChart3, LayoutDashboard, Github, Globe } from 'lucide-react';

const Header = ({ onStatsClick, onHomeClick, onDashboardClick }) => {
    return (
        <header className="glass-header sticky top-0 z-50">
            <div className="app-container py-4">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    {/* Logo / Title */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold tracking-tight">
                                <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); onHomeClick(); }}
                                    className="text-white hover:text-white no-underline"
                                >
                                    Sudip's Book Tracker
                                </a>
                            </h1>
                            <p className="text-xs text-muted">
                                Personal reading catalog
                            </p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={onHomeClick}
                            className="btn-glass flex items-center gap-2 text-sm"
                        >
                            <BookOpen className="w-4 h-4" />
                            Library
                        </button>

                        <button
                            onClick={onDashboardClick}
                            className="btn-glass flex items-center gap-2 text-sm"
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                        </button>

                        <button
                            onClick={onStatsClick}
                            className="btn-glass flex items-center gap-2 text-sm"
                        >
                            <BarChart3 className="w-4 h-4" />
                            Statistics
                        </button>

                        <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-white/10">
                            <a
                                href="https://github.com/yourusername/repo"
                                target="_blank"
                                rel="noreferrer"
                                className="btn-glass p-2"
                                title="Source Code"
                            >
                                <Github className="w-4 h-4" />
                            </a>
                            <a
                                href="https://yourwebsite.com"
                                target="_blank"
                                rel="noreferrer"
                                className="btn-glass p-2"
                                title="Website"
                            >
                                <Globe className="w-4 h-4" />
                            </a>
                        </div>
                    </nav>
                </div>
            </div>
        </header>
    );
};

export default Header;