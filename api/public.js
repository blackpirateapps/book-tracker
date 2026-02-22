import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Default to 20 items per chunk
      const { q, limit = 20, offset = 0 } = req.query;
      const limitVal = parseInt(limit);
      const offsetVal = parseInt(offset);

      // Ensure table exists (Keep this for safety)
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

      // OPTIMIZED QUERY: Select only columns needed for the list
      // Added LIMIT and OFFSET for pagination
      let query = `
        SELECT 
          id, 
          title, 
          authors, 
          imageLinks, 
          shelf, 
          readingMedium, 
          finishedOn, 
          tags, 
          readingProgress 
        FROM books
      `;

      let args = [];

      if (q) {
        query += " WHERE title LIKE ? OR authors LIKE ? OR highlights LIKE ? OR bookDescription LIKE ?";
        const searchPattern = `%${q}%`;
        args = [searchPattern, searchPattern, searchPattern, searchPattern];
        // Lower cache for search
        res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=59');
      } else {
        // Reduced cache for browsing (10 seconds)
        res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=60');
      }

      // Consistent ordering is crucial for pagination
      query += " ORDER BY finishedOn DESC, title ASC LIMIT ? OFFSET ?";
      args.push(limitVal, offsetVal);

      const result = await client.execute({ sql: query, args });

      return res.status(200).json(result.rows);
    } catch (e) {
      console.error("Public API Error:", e);
      return res.status(500).json({ error: 'Failed to fetch books from the database.' });
    }
  }

  return res.status(405).json({ error: `Method ${req.method} not allowed.` });
}