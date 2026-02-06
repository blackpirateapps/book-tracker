import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BookListItem from '../components/BookListItem';
import RandomHighlight from '../components/RandomHighlight';
import HomeStats from '../components/HomeStats';
import { Search, BookOpen, Clock, Bookmark, Rss, ExternalLink } from 'lucide-react';

const LIMIT = 50;

const Home = ({ tagsMap }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    // Books State
    const [allBooks, setAllBooks] = useState([]);

    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingList, setLoadingList] = useState(false);
    const [backgroundLoading, setBackgroundLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- Fetch Logic ---
    const fetchBookList = async (currentOffset, isReset = false) => {
        if (loadingList) return;
        setLoadingList(true);

        try {
            const endpoint = searchQuery
                ? `/api/public?q=${encodeURIComponent(searchQuery)}&limit=${LIMIT}&offset=${currentOffset}`
                : `/api/list-books?limit=${LIMIT}&offset=${currentOffset}`;

            const res = await fetch(endpoint);

            if (res.ok) {
                const newBooks = await res.json();
                const parsedBooks = newBooks.map(book => {
                    let imageLinks = {};
                    if (typeof book.imageLinks === 'string') try { imageLinks = JSON.parse(book.imageLinks); } catch (e) { }
                    return { ...book, imageLinks, _isPartial: !searchQuery };
                });

                if (newBooks.length < LIMIT) setHasMore(false);
                else setHasMore(true);

                setAllBooks(prev => {
                    const combined = isReset ? parsedBooks : [...prev, ...parsedBooks];
                    return combined.filter((v, i, a) => a.findIndex(v2 => (v2.id === v.id)) === i);
                });
                setOffset(currentOffset + LIMIT);

                if (!searchQuery && parsedBooks.length > 0) {
                    fetchDetailsInBackground(parsedBooks.map(b => b.id));
                }

            } else {
                if (isReset && allBooks.length === 0) { }
            }
        } catch (e) {
            console.error(e);
            setError("Failed to load list.");
        } finally {
            setLoadingList(false);
        }
    };

    const fetchDetailsInBackground = async (ids) => {
        if (ids.length === 0) return;
        setBackgroundLoading(true);
        try {
            const res = await fetch(`/api/public?limit=${ids.length}&offset=${Math.max(0, offset - LIMIT)}`);
            if (res.ok) {
                const details = await res.json();
                setAllBooks(prevBooks => {
                    const updateMap = new Map(details.map(d => [d.id, d]));
                    return prevBooks.map(book => {
                        if (updateMap.has(book.id)) {
                            const fullData = updateMap.get(book.id);
                            try { fullData.authors = JSON.parse(fullData.authors); } catch (e) { fullData.authors = []; }
                            try { fullData.tags = JSON.parse(fullData.tags); } catch (e) { fullData.tags = []; }
                            try { fullData.imageLinks = JSON.parse(fullData.imageLinks); } catch (e) { fullData.imageLinks = {}; }
                            return { ...fullData, _isPartial: false };
                        }
                        return book;
                    });
                });
            }
        } catch (e) {
            console.warn("Background enrichment failed", e);
        } finally {
            setBackgroundLoading(false);
        }
    };

    useEffect(() => {
        const delay = setTimeout(() => {
            setOffset(0);
            setHasMore(true);
            setAllBooks([]);
            fetchBookList(0, true);
        }, 300);
        return () => clearTimeout(delay);
    }, [searchQuery]);

    const handleBookClick = (book) => navigate(`/book/${book.id}`, { state: { book } });

    // --- Categorization ---
    const shelves = { currentlyReading: [], read: [], watchlist: [] };
    allBooks.forEach(b => {
        if (shelves[b.shelf]) shelves[b.shelf].push(b);
        else shelves.watchlist.push(b);
    });

    const ShelfSection = ({ title, icon: Icon, books, accentClass }) => {
        if (books.length === 0) return null;
        return (
            <div className="glass-panel overflow-hidden mb-6">
                <div className={`section-header ${accentClass}`}>
                    <Icon className="w-4 h-4" />
                    {title}
                    <span className="ml-auto text-xs font-normal opacity-60">{books.length} books</span>
                </div>
                <div className="p-4 grid gap-3">
                    {books.map(book => (
                        <BookListItem
                            key={book.id}
                            book={book}
                            tagsMap={tagsMap}
                            onClick={() => handleBookClick(book)}
                            isPartial={book._isPartial}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6">

            {/* --- LEFT COLUMN: NAVIGATION / SEARCH --- */}
            <div className="w-full lg:w-1/4 flex flex-col gap-6">
                {/* Search */}
                <div className="glass-panel p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Search className="w-4 h-4 text-muted" />
                        <span className="font-medium text-sm">Search</span>
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full"
                        placeholder="Search books..."
                    />
                </div>

                {/* Shelves Quick Nav */}
                <div className="glass-panel p-4">
                    <div className="font-medium text-sm mb-3">Quick Navigation</div>
                    <ul className="space-y-2 text-sm">
                        <li>
                            <a href="#reading" className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                <BookOpen className="w-4 h-4 text-emerald-400" />
                                Reading Now
                                <span className="ml-auto text-muted">{shelves.currentlyReading.length}</span>
                            </a>
                        </li>
                        <li>
                            <a href="#finished" className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                <Clock className="w-4 h-4 text-blue-400" />
                                Finished
                                <span className="ml-auto text-muted">{shelves.read.length}</span>
                            </a>
                        </li>
                        <li>
                            <a href="#watchlist" className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                <Bookmark className="w-4 h-4 text-amber-400" />
                                To Read
                                <span className="ml-auto text-muted">{shelves.watchlist.length}</span>
                            </a>
                        </li>
                    </ul>
                </div>

                {/* Tag Cloud */}
                <div className="glass-panel p-4">
                    <div className="font-medium text-sm mb-3">Tags</div>
                    <div className="flex flex-wrap gap-2">
                        {Array.from(tagsMap.values()).slice(0, 15).map(tag => (
                            <span key={tag.id} className="tag-badge">
                                {tag.name}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- CENTER COLUMN: FEED --- */}
            <div className="w-full lg:w-1/2">
                {error && (
                    <div className="glass-panel bg-red-500/20 border-red-500/30 p-4 mb-6 text-sm">
                        {error}
                    </div>
                )}

                <div id="reading">
                    <ShelfSection
                        title="Reading Now"
                        icon={BookOpen}
                        books={shelves.currentlyReading}
                        accentClass="bg-gradient-to-r from-emerald-500/20 to-transparent"
                    />
                </div>

                <div id="finished">
                    <ShelfSection
                        title="Recently Finished"
                        icon={Clock}
                        books={shelves.read}
                        accentClass="bg-gradient-to-r from-blue-500/20 to-transparent"
                    />
                </div>

                <div id="watchlist">
                    <ShelfSection
                        title="To Read"
                        icon={Bookmark}
                        books={shelves.watchlist}
                        accentClass="bg-gradient-to-r from-amber-500/20 to-transparent"
                    />
                </div>

                {hasMore && (
                    <button
                        onClick={() => fetchBookList(offset)}
                        disabled={loadingList}
                        className="btn-glass-primary w-full py-3 font-medium"
                    >
                        {loadingList ? 'Loading...' : 'Load More Books'}
                    </button>
                )}
            </div>

            {/* --- RIGHT COLUMN: EXTRAS --- */}
            <div className="w-full lg:w-1/4 flex flex-col gap-6">
                <RandomHighlight />

                <HomeStats />

                {/* Site News */}
                <div className="glass-panel p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Rss className="w-4 h-4 text-amber-400" />
                        <span className="font-medium text-sm">Updates</span>
                    </div>
                    <div className="text-xs space-y-3 max-h-48 overflow-y-auto text-muted">
                        <p><strong className="text-white">2026-01-30</strong> — Advanced search & dashboard fixes</p>
                        <p><strong className="text-white">2026-01-30</strong> — Font size increase & stats graph</p>
                        <p><strong className="text-white">2026-01-30</strong> — Complete redesign to dense layout</p>
                    </div>
                </div>

                {/* Links */}
                <div className="glass-panel p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <ExternalLink className="w-4 h-4 text-muted" />
                        <span className="font-medium text-sm">Resources</span>
                    </div>
                    <ul className="text-sm space-y-2">
                        <li><a href="https://openlibrary.org" className="hover:text-white transition-colors">OpenLibrary</a></li>
                        <li><a href="https://gutenberg.org" className="hover:text-white transition-colors">Project Gutenberg</a></li>
                        <li><a href="https://standardebooks.org" className="hover:text-white transition-colors">Standard Ebooks</a></li>
                    </ul>
                </div>
            </div>

        </div>
    );
};

export default Home;