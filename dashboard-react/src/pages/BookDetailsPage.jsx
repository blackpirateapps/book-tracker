// dashboard-react/src/pages/BookDetailsPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchBooks, fetchTags, updateBook, parseHighlightsFromFileContent } from '../services/bookService';
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
    const [book, setBook] = useState(null); // Holds the fetched book data (potentially with stringified fields)
    const [tags, setTags] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedBook, setEditedBook] = useState(null); // Holds data formatted for editing
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadData();
    }, [bookId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [booksData, tagsData] = await Promise.all([
                 fetchBooks().catch(err => { console.error("Failed fetching books:", err); return []; }),
                 fetchTags().catch(err => { console.error("Failed fetching tags:", err); return []; })
             ]);

            const foundBook = Array.isArray(booksData) ? booksData.find(b => b.id === bookId) : null;

            if (!foundBook) {
                showGlobalToast('Book not found', 'error');
                navigate('/');
                return;
            }
            // Set the raw book data here. Parsing happens during display/edit preparation.
            setBook(foundBook);
            setTags(tagsData || []);
        } catch (error) {
            console.error("Error loading data:", error);
            showGlobalToast('Failed to load book details', 'error');
        } finally {
            setIsLoading(false);
        }
    };

     const requireAuth = (action) => {
        if (password) {
            action(password);
        } else {
            setPendingAction(() => (pwd) => action(pwd));
            setShowPasswordModal(true);
        }
    };

    const handlePasswordConfirm = (pwd, remember) => {
        authenticate(pwd, remember);
        if (pendingAction) {
            pendingAction(pwd);
            setPendingAction(null);
        }
        setShowPasswordModal(false);
    };


    const startEdit = () => {
        if (!book) return;
        setIsEditMode(true);

        // Parse authors string/array *from fetched book state* for editing
        let authorsForEdit = 'Unknown Author';
        if (typeof book.authors === 'string') {
            try {
                const parsed = JSON.parse(book.authors);
                if (Array.isArray(parsed)) {
                    authorsForEdit = parsed.join(', ');
                } else {
                     authorsForEdit = book.authors; // Keep as string if not array
                }
            } catch (e) {
                authorsForEdit = book.authors; // Keep original string if parse fails
            }
        } else if (Array.isArray(book.authors)) {
            authorsForEdit = book.authors.join(', ');
        }

        // Parse highlights string/array *from fetched book state* for editing
        let highlightsForEdit = '';
         if (typeof book.highlights === 'string') {
            try {
                const parsed = JSON.parse(book.highlights);
                if (Array.isArray(parsed)) {
                     highlightsForEdit = formatHighlightsToMarkdownString(parsed);
                }
             } catch(e) { /* ignore parse error for edit */ }
         } else if (Array.isArray(book.highlights)) {
             highlightsForEdit = formatHighlightsToMarkdownString(book.highlights);
         }


        setEditedBook({
            ...book,
            authors: authorsForEdit,
            highlights: highlightsForEdit
        });
    };

    const cancelEdit = () => {
        setIsEditMode(false);
        setEditedBook(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
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
            // Ensure prev.tags is always an array before operating
            const currentTags = Array.isArray(prev.tags) ? prev.tags : [];
             try {
                 // If it's a string, try parsing it first
                 const parsedIfString = typeof prev.tags === 'string' ? JSON.parse(prev.tags) : currentTags;
                 const tagsArray = Array.isArray(parsedIfString) ? parsedIfString : [];

                 const newTags = tagsArray.includes(tagId)
                    ? tagsArray.filter(id => id !== tagId)
                    : [...tagsArray, tagId];
                 return { ...prev, tags: newTags }; // Store as array in edit state

             } catch(e) {
                console.error("Error parsing tags during toggle:", e);
                // Handle error case, maybe keep original or reset
                return { ...prev, tags: currentTags.includes(tagId) ? currentTags.filter(id => id !== tagId) : [...currentTags, tagId] };
             }
        });
    };


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
                const parsedResult = await parseHighlightsFromFileContent(fileContent, fileName); //

                if (!parsedResult || !parsedResult.highlights || parsedResult.highlights.length === 0) {
                    throw new Error("No highlights found in the file.");
                }

                const newHighlights = parsedResult.highlights;
                const existingHighlightsArray = parseMarkdownHighlightsFromString(editedBook.highlights || '');
                const combinedHighlights = [...existingHighlightsArray, ...newHighlights];
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


    const saveEdit = () => {
        requireAuth(async (pwd) => {
            setIsSaving(true);
            try {
                // Ensure authors is always an array for the payload
                const authorsArray = editedBook.authors
                    ? editedBook.authors.split(',').map(a => a.trim()).filter(Boolean)
                    : [];

                const highlightsArray = parseMarkdownHighlightsFromString(editedBook.highlights || '');

                // Ensure tags is an array
                 let tagsArray = [];
                 if (Array.isArray(editedBook.tags)) {
                    tagsArray = editedBook.tags;
                 } else if (typeof editedBook.tags === 'string') {
                     try {
                        const parsedTags = JSON.parse(editedBook.tags);
                        tagsArray = Array.isArray(parsedTags) ? parsedTags : [];
                     } catch (e) {
                         console.error("Could not parse tags string on save:", editedBook.tags);
                         tagsArray = []; // Default to empty on parse error
                     }
                 }


                const updatedBookPayload = {
                    ...editedBook, // Includes id and other edited fields
                    authors: authorsArray, // Use the parsed array
                    highlights: highlightsArray, // Use the parsed array
                    tags: tagsArray, // Use the parsed array
                    readingProgress: parseInt(editedBook.readingProgress || 0, 10),
                    pageCount: editedBook.pageCount ? parseInt(editedBook.pageCount, 10) : null,
                    hasHighlights: highlightsArray.length > 0 ? 1 : 0,
                };

                // Remove the string version of highlights if it exists from payload
                // delete updatedBookPayload.highlights; // NO! API expects 'highlights' field

                await updateBook(updatedBookPayload, pwd); //
                await loadData();
                showGlobalToast('Book updated successfully', 'success');
                setIsEditMode(false);
                setEditedBook(null);

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

    if (!book && !isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">Book not found or could not be loaded.</p>
                    <Link to="/" className="btn-primary">Go to Dashboard</Link>
                </div>
            </div>
        );
    }

    const displayBook = isEditMode ? editedBook : book;
    const coverUrl = displayBook?.imageLinks?.thumbnail || 'https://placehold.co/400x600/e2e8f0/475569?text=No+Cover';

    // --- **REVISED** Author Display Logic ---
    let authorsDisplay = 'Unknown Author';
    if (!isEditMode) {
        // In VIEW mode, parse the potentially stringified data from the 'book' state
        if (typeof book?.authors === 'string') {
            try {
                const parsed = JSON.parse(book.authors);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    authorsDisplay = parsed.join(', ');
                } else if (book.authors.trim()) { // Handle non-JSON strings
                    authorsDisplay = book.authors;
                }
            } catch (e) {
                 // If parsing fails but string is not empty, display the raw string
                 if(book.authors.trim()) {
                     authorsDisplay = book.authors;
                     console.warn("Failed to parse authors JSON, displaying raw string:", book.authors);
                 }
            }
        } else if (Array.isArray(book?.authors) && book.authors.length > 0) {
            authorsDisplay = book.authors.join(', ');
        }
    } else {
        // In EDIT mode, use the value directly from editedBook state (which is a string)
        authorsDisplay = editedBook?.authors || '';
    }
    // --- **END REVISED** Author Display Logic ---


     // Get tag objects for display
     // Ensure displayBook.tags is parsed if it's a string
     let displayTagsArray = [];
     if (displayBook?.tags) {
         if (Array.isArray(displayBook.tags)) {
             displayTagsArray = displayBook.tags;
         } else if (typeof displayBook.tags === 'string') {
             try {
                 const parsed = JSON.parse(displayBook.tags);
                 displayTagsArray = Array.isArray(parsed) ? parsed : [];
             } catch (e) { /* ignore parse error for display */ }
         }
     }
     const bookTags = tags.filter(tag => displayTagsArray.includes(tag.id));


     // Get highlights array for display
     const highlightsToDisplay = isEditMode
        ? parseMarkdownHighlightsFromString(displayBook.highlights || '')
        : (()=>{ // Use IIFE for cleaner parsing logic in view mode
            if (!book?.highlights) return [];
            if (Array.isArray(book.highlights)) return book.highlights;
            if (typeof book.highlights === 'string') {
                try {
                    const parsed = JSON.parse(book.highlights);
                    return Array.isArray(parsed) ? parsed : [];
                } catch(e) { return []; /* Handle parse error */ }
            }
            return [];
          })();


    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            {/* Navigation */}
            <nav className="glass-effect sticky top-0 z-50 shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate pr-4">
                            {/* Use displayBook title which updates in edit mode */}
                            {displayBook?.title || 'Book Details'}
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
                                        name="imageUrl"
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
                                    value={authorsDisplay} // Use the string directly from edit state
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="Comma-separated authors"
                                />
                            ) : (
                                // Use the corrected authorsDisplay variable here
                                <p className="text-lg text-gray-700">{authorsDisplay}</p>
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

                        {/* Reading Progress Slider */}
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
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />
                                        <span className="text-lg font-bold text-blue-600 min-w-[50px] text-right">
                                            {displayBook.readingProgress || 0}%
                                        </span>
                                    </div>
                                ) : (
                                     book?.shelf === 'currentlyReading' && (
                                         <div className="flex items-center space-x-4">
                                            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
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
                                    {(tags || []).map(tag => {
                                        const isSelected = (editedBook.tags || []).includes(tag.id); // Check against editedBook's tags array
                                        return (
                                            <button
                                                key={tag.id}
                                                type="button"
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
                                                className="px-3 py-1.5 text-sm font-medium rounded-lg"
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
                                     <label htmlFor="highlight-file-input" className={`text-sm font-medium cursor-pointer flex items-center gap-1 ${isParsing ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-700'}`}>
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                           <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                         </svg>
                                         {isParsing ? 'Parsing...' : 'Import File (.md, .html)'}
                                         <input
                                             id="highlight-file-input"
                                             ref={fileInputRef}
                                             type="file"
                                             accept=".md,.html"
                                             onChange={handleHighlightFileChange}
                                             className="hidden"
                                             disabled={isParsing}
                                         />
                                     </label>
                                )}
                            </div>
                            {isEditMode ? (
                                <>
                                    <textarea
                                        name="highlights"
                                        value={displayBook.highlights || ''} // Use the markdown string from edit state
                                        onChange={handleChange}
                                        className="input-field font-mono text-sm w-full"
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
                                     className="input-field w-full text-sm"
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
                onClose={() => {setShowPasswordModal(false); setPendingAction(null);}}
                onConfirm={handlePasswordConfirm}
            />
        </div>
    );
}; //

export default BookDetailsPage;