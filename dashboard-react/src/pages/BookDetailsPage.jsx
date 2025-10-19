// dashboard-react/src/pages/BookDetailsPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchBooks, fetchTags, updateBook, parseHighlightsFromFileContent } from '../services/bookService'; // Added parseHighlightsFromFileContent
import { showGlobalToast } from '../hooks/useToast';
import PasswordModal from '../components/PasswordModal';
import { READING_MEDIUMS } from '../utils/constants';

// Helper function to parse markdown list from string
const parseMarkdownHighlightsFromString = (text) => {
    if (!text || !text.trim()) return [];
    return text.split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('- '))
        .map(line => line.substring(2).trim()) // Remove '- '
        .filter(Boolean); // Remove empty lines
};

// Helper function to format highlights array to markdown string
const formatHighlightsToMarkdownString = (highlightsArray) => {
    if (!highlightsArray || highlightsArray.length === 0) return '';
    return highlightsArray.map(h => `- ${h}`).join('\n');
};

const BookDetailsPage = () => {
    const { bookId } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, password, authenticate } = useAuth();
    const [book, setBook] = useState(null);
    const [tags, setTags] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedBook, setEditedBook] = useState(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const fileInputRef = useRef(null); // Ref for file input

    useEffect(() => {
        loadData();
    }, [bookId]);

    const loadData = async () => {
        setIsLoading(true); // Ensure loading state is set at the beginning
        try {
            // Fetch books and tags simultaneously
            const [booksData, tagsData] = await Promise.all([
                 fetchBooks().catch(err => { console.error("Failed fetching books:", err); return []; }), // Add error handling for robustness
                 fetchTags().catch(err => { console.error("Failed fetching tags:", err); return []; })    // Add error handling for robustness
             ]);

            // Ensure booksData is an array before finding
            const foundBook = Array.isArray(booksData) ? booksData.find(b => b.id === bookId) : null;

            if (!foundBook) {
                showGlobalToast('Book not found', 'error');
                navigate('/');
                return;
            }
            setBook(foundBook);
            setTags(tagsData || []); // Ensure tags is always an array
        } catch (error) {
            console.error("Error loading data:", error); // Log the specific error
            showGlobalToast('Failed to load book details', 'error');
             // Optionally navigate away on critical error
             // navigate('/');
        } finally {
            setIsLoading(false);
        }
    };


    const requireAuth = (action) => {
        if (password) {
            action(password);
        } else {
            // Use functional update to ensure the latest state is captured
            setPendingAction(() => (pwd) => action(pwd));
            setShowPasswordModal(true);
        }
    };

    const handlePasswordConfirm = (pwd, remember) => {
        authenticate(pwd, remember);
        if (pendingAction) {
             // Execute the pending action with the confirmed password
            pendingAction(pwd);
            setPendingAction(null); // Clear the pending action
        }
        setShowPasswordModal(false);
    };


    const startEdit = () => {
        if (!book) return; // Don't start edit if book isn't loaded
        setIsEditMode(true);
        // Ensure authors and highlights are formatted correctly for inputs
        const authorsArray = Array.isArray(book.authors) ? book.authors : [book.authors || ''];
        const highlightsArray = Array.isArray(book.highlights) ? book.highlights : [];
        setEditedBook({
            ...book,
            authors: authorsArray.join(', '), // Comma-separated string for input
            highlights: formatHighlightsToMarkdownString(highlightsArray) // Markdown list string for textarea
        });
    };

    const cancelEdit = () => {
        setIsEditMode(false);
        setEditedBook(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; // Reset file input on cancel
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditedBook(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleTagToggle = (tagId) => {
        setEditedBook(prev => {
            const currentTags = prev.tags || [];
            const newTags = currentTags.includes(tagId)
                ? currentTags.filter(id => id !== tagId)
                : [...currentTags, tagId];
            return { ...prev, tags: newTags };
        });
    };

    // --- New Highlight File Import Handler ---
    const handleHighlightFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsParsing(true);
        showGlobalToast('Parsing highlights...', 'success');

        const reader = new FileReader();
        reader.onload = async (e) => {
            const fileContent = e.target.result;
            const fileName = file.name;

            try {
                // No password needed for parsing API endpoint itself
                const parsedResult = await parseHighlightsFromFileContent(fileContent, fileName);

                if (!parsedResult || !parsedResult.highlights || parsedResult.highlights.length === 0) {
                    throw new Error("No highlights found in the file.");
                }

                const newHighlights = parsedResult.highlights;

                // Merge with existing highlights in the textarea
                const existingHighlightsArray = parseMarkdownHighlightsFromString(editedBook.highlights || '');

                // Simple merge: append new highlights, optionally filter duplicates later if needed
                const combinedHighlights = [...existingHighlightsArray, ...newHighlights];

                // Optional: Remove duplicates
                const uniqueHighlights = Array.from(new Set(combinedHighlights));

                setEditedBook(prev => ({
                    ...prev,
                    highlights: formatHighlightsToMarkdownString(uniqueHighlights)
                }));

                showGlobalToast(`Imported ${newHighlights.length} highlights! Review and save.`, 'success');

            } catch (error) {
                console.error("Highlight parsing error:", error);
                showGlobalToast(`Failed to parse highlights: ${error.message}`, 'error');
            } finally {
                setIsParsing(false);
                // Reset file input value so the same file can be selected again if needed
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        };
        reader.onerror = () => {
             showGlobalToast('Failed to read the file.', 'error');
             setIsParsing(false);
             if (fileInputRef.current) {
                 fileInputRef.current.value = "";
             }
        };
        reader.readAsText(file);
    };
    // --- End Highlight File Import Handler ---


    const saveEdit = () => {
        requireAuth(async (pwd) => {
            setIsSaving(true);
            try {
                // Ensure authors is always an array
                const authorsArray = editedBook.authors
                    ? editedBook.authors.split(',').map(a => a.trim()).filter(Boolean)
                    : [];

                // Parse highlights from textarea string back into an array
                const highlightsArray = parseMarkdownHighlightsFromString(editedBook.highlights || '');

                const updatedBookPayload = {
                    ...editedBook, // Includes id and other potentially edited fields
                    authors: authorsArray, // Use the parsed array
                    highlights: highlightsArray, // Use the parsed array
                    // Ensure readingProgress is a number
                    readingProgress: parseInt(editedBook.readingProgress || 0, 10),
                    // Ensure pageCount is a number or null
                    pageCount: editedBook.pageCount ? parseInt(editedBook.pageCount, 10) : null,
                    // Determine hasHighlights flag based on the final array
                    hasHighlights: highlightsArray.length > 0 ? 1 : 0,
                };

                // Remove the 'highlights' string field if it was just for the textarea
                // The payload should match the expected API structure
                // delete updatedBookPayload.highlights; // Keep if API expects array

                await updateBook(updatedBookPayload, pwd);
                await loadData(); // Reload data to reflect changes
                showGlobalToast('Book updated successfully', 'success');
                setIsEditMode(false); // Exit edit mode
                setEditedBook(null); // Clear edited state

            } catch (error) {
                console.error("Save error:", error);
                showGlobalToast(`Failed to save changes: ${error.message}`, 'error');
            } finally {
                setIsSaving(false);
            }
        });
    };


    // --- Render Logic ---

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!book && !isLoading) { // Ensure book is null AND not loading
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">Book not found or could not be loaded.</p>
                    <Link to="/" className="btn-primary">Go to Dashboard</Link>
                </div>
            </div>
        );
    }

    // Use editedBook if in edit mode, otherwise use the fetched book
    const displayBook = isEditMode ? editedBook : book;
    const coverUrl = displayBook?.imageLinks?.thumbnail || 'https://placehold.co/400x600/e2e8f0/475569?text=No+Cover';

    // Ensure authors is displayable (string in edit, array in view)
    const authorsDisplay = isEditMode
        ? displayBook.authors // Already a string in edit mode
        : (Array.isArray(book?.authors) ? book.authors.join(', ') : book?.authors || 'Unknown Author'); // Join array for view

    // Get tag objects for display
     const bookTags = tags.filter(tag => (displayBook?.tags || []).includes(tag.id));
     // Get highlights array for display
     const highlightsToDisplay = isEditMode
        ? parseMarkdownHighlightsFromString(displayBook.highlights || '')
        : (Array.isArray(book?.highlights) ? book.highlights : []); // Use array directly for view


    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            {/* Navigation */}
            <nav className="glass-effect sticky top-0 z-50 shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate pr-4">
                            {book?.title || 'Book Details'} {/* Show title in nav */}
                        </h1>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                            {!isEditMode ? (
                                <>
                                    <button onClick={startEdit} className="btn-primary text-sm flex items-center space-x-2" disabled={!isAuthenticated}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                        </svg>
                                        <span>Edit</span>
                                    </button>
                                    <Link to="/" className="btn-secondary text-sm">
                                        Back
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <button onClick={saveEdit} className="btn-primary text-sm" disabled={isSaving || isParsing}>
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button onClick={cancelEdit} className="btn-secondary text-sm" disabled={isSaving || isParsing}>
                                        Cancel
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

             {!isAuthenticated && !isEditMode && (
                 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
                    <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-xl">
                        <p className="text-sm">You are in view-only mode. <button onClick={() => requireAuth(startEdit)} className="font-semibold underline hover:text-yellow-900">Authenticate to edit</button>.</p>
                    </div>
                 </div>
             )}

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Cover Image & Quick Status */}
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
                            {isEditMode ? (
                                <>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
                                    <input
                                        type="url"
                                        name="imageUrl" // Make sure name matches state key if using generic handleChange
                                        value={editedBook?.imageLinks?.thumbnail || ''}
                                        onChange={(e) => setEditedBook(prev => ({ ...prev, imageLinks: { thumbnail: e.target.value } }))}
                                        className="input-field mb-4"
                                    />
                                    <img
                                        src={editedBook?.imageLinks?.thumbnail || 'https://placehold.co/400x600/e2e8f0/475569?text=Preview'}
                                        alt="Cover Preview"
                                        className="w-full rounded-lg shadow-lg mb-4 opacity-75"
                                    />
                                </>
                            ) : (
                                <img
                                    src={coverUrl}
                                    alt={book?.title}
                                    className="w-full rounded-lg shadow-lg mb-4"
                                />
                            )}


                            {/* Quick Stats (only in view mode) */}
                            {!isEditMode && book?.shelf === 'currentlyReading' && (
                                <div className="mb-4">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-gray-600 font-medium">Progress</span>
                                        <span className="text-blue-600 font-bold">{book.readingProgress || 0}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{ width: `${book.readingProgress || 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                            {!isEditMode && book?.shelf === 'read' && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                                    <svg className="w-8 h-8 text-green-600 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                                    </svg>
                                    <p className="text-sm font-medium text-green-800">Completed</p>
                                </div>
                            )}
                            {!isEditMode && book?.shelf === 'watchlist' && (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                                    <svg className="w-8 h-8 text-orange-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                                    </svg>
                                    <p className="text-sm font-medium text-orange-800">On Watchlist</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Book Details */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Title */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h2 className="text-sm font-medium text-gray-500 uppercase mb-2">Title</h2>
                            {isEditMode ? (
                                <input
                                    type="text"
                                    name="title"
                                    value={displayBook.title || ''}
                                    onChange={handleChange}
                                    className="input-field"
                                />
                            ) : (
                                <h1 className="text-2xl font-bold text-gray-900">{book?.title || 'N/A'}</h1>
                            )}
                        </div>

                        {/* Authors */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h2 className="text-sm font-medium text-gray-500 uppercase mb-2">Authors</h2>
                            {isEditMode ? (
                                <input
                                    type="text"
                                    name="authors"
                                    value={authorsDisplay} // Use the pre-formatted string
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="Comma-separated authors"
                                />
                            ) : (
                                <p className="text-lg text-gray-700">{authorsDisplay || 'N/A'}</p>
                            )}
                        </div>

                        {/* Meta Information Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Publisher */}
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Publisher</h3>
                                {isEditMode ? (
                                    <input
                                        type="text"
                                        name="publisher"
                                        value={displayBook.publisher || ''}
                                        onChange={handleChange}
                                        className="input-field text-sm"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-700">{book?.publisher || 'N/A'}</p>
                                )}
                            </div>
                            {/* Published Date (Full) */}
                             <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Published</h3>
                                {isEditMode ? (
                                    <input
                                        type="text" // Keep as text for flexibility (e.g., "Spring 1999")
                                        name="fullPublishDate"
                                        value={displayBook.fullPublishDate || ''}
                                        onChange={handleChange}
                                        className="input-field text-sm"
                                        placeholder="e.g., YYYY-MM-DD or Month YYYY"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-700">{book?.fullPublishDate || book?.publishedDate || 'N/A'}</p>
                                )}
                            </div>
                            {/* Page Count */}
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Pages</h3>
                                {isEditMode ? (
                                    <input
                                        type="number"
                                        name="pageCount"
                                        value={displayBook.pageCount || ''}
                                        onChange={handleChange}
                                        className="input-field text-sm"
                                        placeholder="e.g., 350"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-700">{book?.pageCount || 'N/A'}</p>
                                )}
                            </div>
                            {/* Reading Medium */}
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Reading Medium</h3>
                                {isEditMode ? (
                                    <select
                                        name="readingMedium"
                                        value={displayBook.readingMedium || 'Not set'}
                                        onChange={handleChange}
                                        className="input-field text-sm"
                                    >
                                        {READING_MEDIUMS.map(medium => (
                                            <option key={medium} value={medium}>{medium}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-sm text-gray-700">{book?.readingMedium || 'N/A'}</p>
                                )}
                            </div>
                            {/* Started On */}
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Started On</h3>
                                {isEditMode ? (
                                    <input
                                        type="date"
                                        name="startedOn"
                                        value={displayBook.startedOn || ''}
                                        onChange={handleChange}
                                        className="input-field text-sm"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-700">
                                        {book?.startedOn ? new Date(book.startedOn + 'T00:00:00').toLocaleDateString() : 'N/A'} {/* Add Timezone offset fix */}
                                    </p>
                                )}
                            </div>
                            {/* Finished On */}
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Finished On</h3>
                                {isEditMode ? (
                                    <input
                                        type="date"
                                        name="finishedOn"
                                        value={displayBook.finishedOn || ''}
                                        onChange={handleChange}
                                        className="input-field text-sm"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-700">
                                        {book?.finishedOn ? new Date(book.finishedOn + 'T00:00:00').toLocaleDateString() : 'N/A'} {/* Add Timezone offset fix */}
                                    </p>
                                )}
                            </div>
                        </div>

                         {/* Reading Progress Slider (only if currently reading or editing) */}
                         {(book?.shelf === 'currentlyReading' || isEditMode) && (
                             <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <h2 className="text-sm font-medium text-gray-500 uppercase mb-2">Reading Progress</h2>
                                {isEditMode ? (
                                    <div className="flex items-center space-x-4">
                                        <input
                                            type="range"
                                            name="readingProgress"
                                            min="0"
                                            max="100"
                                            value={displayBook.readingProgress || 0}
                                            onChange={handleChange}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" // Styled range input
                                        />
                                        <span className="text-lg font-bold text-blue-600 min-w-[50px] text-right">
                                            {displayBook.readingProgress || 0}%
                                        </span>
                                    </div>
                                ) : (
                                     book?.shelf === 'currentlyReading' && ( // Only show progress bar when viewing if currently reading
                                         <div className="flex items-center space-x-4">
                                            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden"> {/* Added overflow-hidden */}
                                                <div
                                                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                                                    style={{ width: `${book.readingProgress || 0}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-lg font-bold text-blue-600">{book.readingProgress || 0}%</span>
                                        </div>
                                     )
                                )}
                            </div>
                         )}


                        {/* Tags */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h2 className="text-sm font-medium text-gray-500 uppercase mb-3">Tags</h2>
                            {isEditMode ? (
                                <div className="flex flex-wrap gap-2">
                                    {(tags || []).map(tag => { // Ensure tags is an array
                                        const isSelected = (displayBook.tags || []).includes(tag.id);
                                        return (
                                            <button
                                                key={tag.id}
                                                type="button" // Important for buttons inside forms
                                                onClick={() => handleTagToggle(tag.id)}
                                                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                                                    isSelected
                                                        ? 'ring-2 ring-offset-2'
                                                        : 'opacity-60 hover:opacity-100'
                                                }`}
                                                style={{
                                                    backgroundColor: `${tag.color}20`,
                                                    color: tag.color,
                                                    ringColor: isSelected ? tag.color : 'transparent'
                                                }}
                                            >
                                                {tag.name}
                                            </button>
                                        );
                                    })}
                                    {tags.length === 0 && <p className="text-sm text-gray-500">No tags available. <Link to="/tags" className="text-blue-600 hover:underline">Manage Tags</Link></p>}
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {bookTags.length > 0 ? (
                                        bookTags.map(tag => (
                                            <span
                                                key={tag.id}
                                                className="px-3 py-1.5 text-sm font-medium rounded-lg" // Increased padding
                                                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                                            >
                                                {tag.name}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500">No tags assigned</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Highlights */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-medium text-gray-500 uppercase">Highlights</h2>
                                {isEditMode && (
                                     <label htmlFor="highlight-file-input" className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer flex items-center gap-1">
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                           <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                         </svg>
                                         Import File (.md, .html)
                                         <input
                                             id="highlight-file-input"
                                             ref={fileInputRef}
                                             type="file"
                                             accept=".md,.html"
                                             onChange={handleHighlightFileChange}
                                             className="hidden" // Hide the default input appearance
                                             disabled={isParsing}
                                         />
                                     </label>
                                )}
                            </div>
                            {isEditMode ? (
                                <>
                                    <textarea
                                        name="highlights" // Ensure name matches state key if using generic handleChange
                                        value={displayBook.highlights || ''}
                                        onChange={handleChange}
                                        className="input-field font-mono text-sm w-full" // Added w-full
                                        rows="10"
                                        placeholder="- Highlight 1&#10;- Highlight 2"
                                        disabled={isParsing}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Enter highlights as a Markdown list (each starting with '- ').</p>
                                </>
                            ) : (
                                <div className="space-y-3">
                                    {highlightsToDisplay.length > 0 ? (
                                        highlightsToDisplay.map((highlight, index) => (
                                            <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                                </svg>
                                                <p className="text-sm text-gray-700 flex-1">{highlight}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500">No highlights yet</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Description */}
                         <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                             <h2 className="text-sm font-medium text-gray-500 uppercase mb-2">Description</h2>
                             {isEditMode ? (
                                <textarea
                                     name="bookDescription"
                                     value={displayBook.bookDescription || ''}
                                     onChange={handleChange}
                                     className="input-field w-full text-sm" // Added w-full
                                     rows="6"
                                     placeholder="Enter book description..."
                                 />
                             ) : (
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {book?.bookDescription || 'No description available.'}
                                </p>
                             )}
                         </div>

                    </div>
                </div>
            </main>

            <PasswordModal
                isOpen={showPasswordModal}
                onClose={() => {setShowPasswordModal(false); setPendingAction(null);}} // Clear pending action on close
                onConfirm={handlePasswordConfirm}
            />
        </div>
    );
};

export default BookDetailsPage;