import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

/**
 * This API endpoint is highly optimized to fetch only the single most recently read book
 * that contains highlights. It's designed to be fast and is heavily cached.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    // This header tells Vercel's Edge Network to cache the response for 10 minutes.
    // This makes subsequent requests extremely fast as they are served from a CDN close to the user.
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');

    // The SQL query is optimized to find the most recently finished book on the 'read' shelf
    // that is guaranteed to have highlights, and it only fetches one row.
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

    // Ensure the book actually contains highlights after parsing.
    if (highlights.length === 0) {
        return res.status(404).json({ error: "Book was found, but it contained no highlights." });
    }
    
    // Pick one random highlight from the book's array.
    const randomHighlight = highlights[Math.floor(Math.random() * highlights.length)];
    const authorString = authors.length > 0 ? authors.join(', ') : 'Unknown Author';
    const coverUrl = imageLinks.thumbnail || null;

    // Return the clean, structured data.
    return res.status(200).json({
      title: book.title,
      author: authorString,
      coverUrl: coverUrl,
      highlight: randomHighlight,
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "An internal error occurred while fetching the latest read book." });
  }
}

