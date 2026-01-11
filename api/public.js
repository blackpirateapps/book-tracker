import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { q } = req.query;

      // Ensure table exists (Keep this for safety, or move to a separate init script)
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

      // OPTIMIZED QUERY: Only select columns needed for the list view
      // Removed: bookDescription, highlights, subjects, publisher, fullPublishDate, industryIdentifiers, pageCount, startedOn
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
        // Search logic remains the same
        query += " WHERE title LIKE ? OR authors LIKE ?";
        const searchPattern = `%${q}%`;
        args = [searchPattern, searchPattern];
        
        // Lower cache for search results
        res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=59');
      } else {
        // High cache for main library view
        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
      }

      // Add simple sorting (optional but recommended)
      // query += " ORDER BY finishedOn DESC"; 

      const result = await client.execute({ sql: query, args });

      return res.status(200).json(result.rows);
    } catch (e) {
      console.error("Public API Error:", e);
      return res.status(500).json({ error: 'Failed to fetch books from the database.' });
    }
  }

  return res.status(405).json({ error: `Method ${req.method} not allowed.` });
}