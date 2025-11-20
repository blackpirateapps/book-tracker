import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  // Allow GET requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    // This header caches the response on Vercel's Edge Network for speed
    res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=59');

    // Select one random book with highlights
    const result = await client.execute(
      "SELECT highlights, title, authors FROM books WHERE hasHighlights = 1 ORDER BY RANDOM() LIMIT 1"
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No highlights found in the library." });
    }

    const book = result.rows[0];
    let highlights = [];
    let authors = [];

    try { highlights = JSON.parse(book.highlights); } catch (e) {}
    try { authors = JSON.parse(book.authors); } catch (e) {}

    if (highlights.length === 0) {
      return res.status(404).json({ error: "Book found, but it contains no highlights." });
    }

    // Pick a random highlight from the book
    const randomHighlight = highlights[Math.floor(Math.random() * highlights.length)];
    const author = authors.length > 0 ? authors.join(', ') : 'Unknown Author';

    return res.status(200).json({
      highlight: randomHighlight,
      title: book.title,
      author: author,
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "An error occurred while fetching a highlight." });
  }
}
