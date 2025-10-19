// api/public.js
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');

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

      // MODIFIED: Select the 'readingProgress' column
      const result = await client.execute(
        "SELECT id, title, authors, imageLinks, shelf, readingMedium, finishedOn, hasHighlights, tags, readingProgress FROM books" // Added 'readingProgress'
      ); //

      return res.status(200).json(result.rows);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Failed to fetch books from the database.' }); //
    }
  }

  // Reject any other method
  return res.status(405).json({ error: `Method ${req.method} not allowed.` }); //
}