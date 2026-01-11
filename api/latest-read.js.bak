// latest-read.js
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    // Cache for 10 minutes
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');

    const result = await client.execute({
      sql: "SELECT title, authors, imageLinks, highlights FROM books WHERE shelf = 'read' AND hasHighlights = 1 ORDER BY finishedOn DESC LIMIT 1",
      args: [],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No recently read books with highlights were found.' });
    }

    const book = result.rows[0];

    let highlights = [];
    let authors = [];
    let imageLinks = {};
    try { highlights = JSON.parse(book.highlights); } catch (e) {}
    try { authors = JSON.parse(book.authors); } catch (e) {}
    try { imageLinks = JSON.parse(book.imageLinks); } catch (e) {}

    if (!Array.isArray(highlights) || highlights.length === 0) {
      return res.status(404).json({ error: 'Book was found, but it contained no highlights.' });
    }

    const randomHighlight = highlights[Math.floor(Math.random() * highlights.length)];
    const authorString = authors.length > 0 ? authors.join(', ') : 'Unknown Author';
    const coverUrl = imageLinks.thumbnail || null;

    return res.status(200).json({
      title: book.title,
      author: authorString,
      coverUrl,
      highlight: randomHighlight,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'An internal error occurred while fetching the latest read book.' });
  }
}