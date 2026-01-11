// api/public.js
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { q } = req.query;

      // Ensure table exists (also includes the tags column needed by other endpoints)
      await client.execute(`
        CREATE TABLE IF NOT EXISTS books (
          id TEXT PRIMARY KEY, title TEXT, authors TEXT, imageLinks TEXT,
          pageCount INTEGER, publishedDate TEXT, industryIdentifiers TEXT,
          highlights TEXT, startedOn TEXT, finishedOn TEXT, readingMedium TEXT, shelf TEXT,
          hasHighlights INTEGER DEFAULT 0, readingProgress INTEGER DEFAULT 0,
          publisher TEXT, fullPublishDate TEXT, bookDescription TEXT, subjects TEXT,
          tags TEXT
        );
      `);

      let query = "SELECT id, title, authors, imageLinks, shelf, readingMedium, finishedOn, hasHighlights, tags, readingProgress FROM books";
      let args = [];

      if (q) {
        // If a search query is provided, filter by title, authors, or highlights
        // We use % wildcard for partial matches
        query += " WHERE title LIKE ? OR authors LIKE ? OR highlights LIKE ?";
        const searchPattern = `%${q}%`;
        args = [searchPattern, searchPattern, searchPattern];
        
        // Cache search results for a shorter duration (10 seconds)
        res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=59');
      } else {
        // Standard cache for full library (10 minutes)
        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
      }

      const result = await client.execute({ sql: query, args });

      return res.status(200).json(result.rows);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Failed to fetch books from the database.' });
    }
  }

  // Reject any other method
  return res.status(405).json({ error: `Method ${req.method} not allowed.` });
}