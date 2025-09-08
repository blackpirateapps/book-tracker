import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    // This header is key for speed. It caches the response on Vercel's Edge Network.
    res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=59');

    // Efficiently select one random book that is guaranteed to have highlights.
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
    
    // Pick a random highlight from the selected book's array
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