// dashboard-react/src/services/bookService.js
import Cookies from 'js-cookie';
// Ensure all required endpoints and the cookie name are imported
import { API_ENDPOINT, TAGS_API_ENDPOINT, PARSE_API_ENDPOINT, DETAILS_API_ENDPOINT, PWD_COOKIE } from '../utils/constants';

// Fetches all books from the main books endpoint
export const fetchBooks = async () => {
  const response = await fetch(API_ENDPOINT);
  if (!response.ok) throw new Error('Failed to fetch books');
  return response.json();
};

// Fetches detailed information for a single book
export const fetchBookDetails = async (bookId) => {
  // Use the specific details endpoint which might have different caching
  const response = await fetch(`${DETAILS_API_ENDPOINT}?id=${bookId}`);
  if (!response.ok) throw new Error('Failed to fetch book details');
  return response.json();
};

// Fetches all tags
export const fetchTags = async () => {
  const response = await fetch(TAGS_API_ENDPOINT);
  if (!response.ok) throw new Error('Failed to fetch tags');
  return response.json();
};

// Generic function to perform actions requiring admin password
export const performAuthenticatedAction = async (action, data, password, endpoint = API_ENDPOINT) => {
  if (!password) {
    // Provide a more user-friendly error or handle authentication prompt elsewhere
    throw new Error('Authentication required: Password cannot be empty');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, action, data })
  });

  const result = await response.json();

  if (!response.ok) {
    // Throw an error with the message from the API if available
    throw new Error(result.error || 'An unknown error occurred during the authenticated action');
  }

  return result; // Return the full result which might contain messages or data
};

// --- Tag Specific Actions ---

export const createTag = async (tagData, password) => {
  return performAuthenticatedAction('create', tagData, password, TAGS_API_ENDPOINT);
};

export const updateTag = async (tagData, password) => {
  return performAuthenticatedAction('update', tagData, password, TAGS_API_ENDPOINT);
};

export const deleteTag = async (tagId, password) => {
  return performAuthenticatedAction('delete', { id: tagId }, password, TAGS_API_ENDPOINT);
};

export const bulkAddTagToBooks = async (tagId, bookIds, password) => {
  return performAuthenticatedAction('bulkAddToBooks', { tagId, bookIds }, password, TAGS_API_ENDPOINT);
};

// --- Book Specific Actions ---

export const addBook = async (bookData, password) => {
  // The 'add' action in api/books.js now handles fetching from OpenLibrary based on OLID
  // So, the payload might only need the olid and target shelf initially.
  // Adjust payload based on api/books.js's 'add' case expectation.
  // Assuming 'add' still takes full book data or just olid/shelf:
  return performAuthenticatedAction('add', bookData, password); // Pass bookData which might include olid
};

export const updateBook = async (bookData, password) => {
  return performAuthenticatedAction('update', bookData, password);
};

export const deleteBook = async (bookId, password) => {
  return performAuthenticatedAction('delete', { id: bookId }, password);
};

// --- Data Export ---
// Note: The previous implementation fetched all books again.
// The api/books.js POST handler has an 'export' action. Let's use that.
export const exportData = async (password) => {
    // This requires authentication according to api/books.js
    return performAuthenticatedAction('export', {}, password); // Send 'export' action
};


// --- Highlight Parsing ---

// Function to call the dedicated parsing API endpoint
export const parseHighlightsFromFileContent = async (fileContent, fileName) => {
  // This endpoint doesn't require a password according to api/parse-highlights.js
  const response = await fetch(PARSE_API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileContent, fileName })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to parse highlights file');
  }

  // Expects { title: '...', highlights: [...] }
  return result;
};

// DEPRECATED? The HighlightsManager uses a different method. If this specific function
// for parsing markdown text *only* via API is still needed somewhere, keep it.
// Otherwise, parseHighlightsFromFileContent covers file parsing.
export const parseHighlights = async (markdownText, password) => {
   // Assuming PARSE_API_ENDPOINT can also handle raw text if modified,
   // or potentially call parseHighlightsFromFileContent with a dummy filename.
   // For now, let's assume it expects file content.
   // If you need raw text parsing via API, the API endpoint needs adjustment.
   // Reusing parseHighlightsFromFileContent structure for consistency:
   // return parseHighlightsFromFileContent(markdownText, 'pasted_text.md');

   // OR if the API specifically handles a 'markdownText' payload for 'parse' action:
   console.warn("parseHighlights function might be deprecated or need API adjustment for raw text.");
   // Example assuming PARSE_API_ENDPOINT handles 'parse' action with 'markdownText':
   // return performAuthenticatedAction('parse', { markdownText }, password, PARSE_API_ENDPOINT);
   // Since the parsing API doesn't need auth, this might be simpler:
     const response = await fetch(PARSE_API_ENDPOINT, { // Adjust endpoint if needed
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ fileContent: markdownText, fileName: 'pasted_text.md' }) // Send as file content
     });
     const result = await response.json();
     if (!response.ok) throw new Error(result.error || 'Failed to parse markdown text');
     return result;

};


// --- Open Library Search ---

export const searchOpenLibrary = async (query) => {
  // Fetch specific fields to minimize response size
  const fields = 'key,title,author_name,cover_i,first_publish_year,edition_key';
  const response = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&fields=${fields}`
  );
  if (!response.ok) throw new Error('Open Library search failed');
  return response.json();
};

// --- Authentication Cookie Management ---

export const getPassword = () => Cookies.get(PWD_COOKIE);

export const setPassword = (password, days = 30) => {
  // Ensure secure flag is set for HTTPS deployment
  Cookies.set(PWD_COOKIE, password, { expires: days, path: '/', sameSite: 'Lax', secure: true });
};

export const clearPassword = () => {
  Cookies.remove(PWD_COOKIE, { path: '/' });
};