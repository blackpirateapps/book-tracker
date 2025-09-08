import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

/**
 * This API endpoint is highly optimized to fetch the single most recently read book
 * that contains highlights. It now handles the randomization server-side.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    // The response is cached for 10 minutes to keep database calls to a minimum.
    // The random highlight will be consistent for the duration of the cache.
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');

    // The SQL query fetches the most recently finished book on the 'read' shelf
    // that is guaranteed to have highlights.
    const result = await client.execute({
      sql: "SELECT title, authors, imageLinks, highlights FROM books WHERE shelf = 'read' AND hasHighlights = 1 ORDER BY finishedOn DESC LIMIT 1",
      args: [],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No recently read books with highlights were found." });
    }

    const book = result.rows[0];
    let highlights = [];
    let authors = [];
    let imageLinks = {};

    // Safely parse the JSON data from the database.
    try { highlights = JSON.parse(book.highlights); } catch (e) {}
    try { authors = JSON.parse(book.authors); } catch (e) {}
    try { imageLinks = JSON.parse(book.imageLinks); } catch (e) {}

    if (highlights.length === 0) {
        return res.status(404).json({ error: "Book was found, but it contained no highlights." });
    }
    
    // MODIFIED: Randomization is now done on the server.
    const randomHighlight = highlights[Math.floor(Math.random() * highlights.length)];
    
    const authorString = authors.length > 0 ? authors.join(', ') : 'Unknown Author';
    const coverUrl = imageLinks.thumbnail || null;

    // Return the clean, structured data with only one pre-selected highlight.
    return res.status(200).json({
      title: book.title,
      author: authorString,
      coverUrl: coverUrl,
      // MODIFIED: Return only the single random highlight.
      highlight: randomHighlight, 
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "An internal error occurred while fetching the latest read book." });
  }
}

