const HighlightsManager = (() => {
    // Private variables to hold helpers from the main script
    let _getLibrary, _requestPassword, _performAuthenticatedAction, _updateLibrary;

    /**
     * Initializes the manager with helper functions from the main admin script.
     */
    const init = (helpers) => {
        _getLibrary = helpers.getLibrary;
        _requestPassword = helpers.requestPassword;
        _performAuthenticatedAction = helpers.performAuthenticatedAction;
        _updateLibrary = helpers.updateLibrary;
    };

    /**
     * Parses text from the textarea into an array of highlights.
     * Recognizes Markdown list items.
     */
    const parseMarkdownHighlights = (text) => {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        const isList = lines.some(l => l.startsWith('- ') || l.startsWith('* ') || /^\d+\.\s/.test(l));
        if (isList) {
            return lines
                .map(line => line.replace(/^(- |\* |\d+\.\s)/, '').trim())
                .filter(line => line);
        } else if (text.trim()) {
            return [text.trim()]; // Treat the whole block as one highlight if not a list
        }
        return [];
    };

    /**
     * Renders the read-only view for highlights.
     */
    const renderView = (bookId, shelf) => {
        const headingContainer = document.getElementById('highlights-heading-container');
        const contentContainer = document.getElementById('highlights-content-container');
        const library = _getLibrary();
        const book = library[shelf]?.find(b => b.id === bookId);

        if (!headingContainer || !contentContainer || !book) return;

        headingContainer.innerHTML = `
            <h2 class="text-lg font-semibold text-gray-900">Highlights</h2>
            <button id="edit-highlights-btn" class="text-sm font-semibold text-blue-600 hover:underline">Edit</button>
        `;
        
        if (book.highlights && book.highlights.length > 0) {
            contentContainer.innerHTML = '<div class="space-y-4">' + book.highlights.map(h => `<p class="highlight-item text-gray-700">${h}</p>`).join('') + '</div>';
        } else {
            contentContainer.innerHTML = '<p class="text-gray-500">No highlights for this book. Click "Edit" to add some.</p>';
        }
    };

    /**
     * Renders the editing interface for highlights.
     */
    const renderEdit = (bookId, shelf) => {
        const headingContainer = document.getElementById('highlights-heading-container');
        const contentContainer = document.getElementById('highlights-content-container');
        const library = _getLibrary();
        const book = library[shelf]?.find(b => b.id === bookId);

        if (!headingContainer || !contentContainer || !book) return;

        headingContainer.innerHTML = `<h2 class="text-lg font-semibold text-gray-900">Edit Highlights</h2>`;
        
        const markdownText = book.highlights.map(h => `- ${h}`).join('\n');
        contentContainer.innerHTML = `
            <div>
                <textarea id="highlights-textarea" class="w-full h-64 p-3 border rounded-lg bg-gray-50 text-sm font-mono" placeholder="- Type or paste a highlight per line...">${markdownText}</textarea>
                <p class="text-xs text-gray-500 mt-1">Each item in a Markdown list (- item) will become a separate highlight.</p>
            </div>
            <div class="flex justify-end gap-2 mt-4">
                <button id="cancel-highlights-edit-btn" class="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button>
                <button id="save-highlights-btn" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">Save Highlights</button>
            </div>
        `;
    };

    /**
     * Event handlers that will be called by the main script.
     */
    const handleEdit = (bookId, shelf) => _requestPassword(() => renderEdit(bookId, shelf));
    const handleCancel = (bookId, shelf) => renderView(bookId, shelf);
    const handleSave = async (bookId, shelf) => {
        const library = _getLibrary();
        const book = { ...library[shelf]?.find(b => b.id === bookId) };
        if (book) {
            const textarea = document.getElementById('highlights-textarea');
            book.highlights = parseMarkdownHighlights(textarea.value);
            _requestPassword(async () => {
                 const { success } = await _performAuthenticatedAction({ action: 'update', data: book });
                 if (success) {
                    await _updateLibrary(true); // Tell main script to refresh the library
                    const newLibrary = _getLibrary();
                    const updatedBook = Object.values(newLibrary).flat().find(b => b.id === bookId);
                    if (updatedBook) renderView(updatedBook.id, updatedBook.shelf);
                 }
            });
        }
    };

    // Expose public methods
    return {
        init,
        renderView,
        handleEdit,
        handleCancel,
        handleSave,
    };
})();
