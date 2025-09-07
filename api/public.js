import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// This API only handles GET requests. It is safe for public access.
export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Ensure the table exists before trying to read from it.
      await client.execute(`
        CREATE TABLE IF NOT EXISTS books (
          id TEXT PRIMARY KEY, title TEXT, authors TEXT, imageLinks TEXT, 
          pageCount INTEGER, publishedDate TEXT, industryIdentifiers TEXT, 
          highlights TEXT, startedOn TEXT, finishedOn TEXT, readingMedium TEXT, shelf TEXT
        );
      `);
      const result = await client.execute("SELECT * FROM books");
      return res.status(200).json(result.rows);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Failed to fetch books from the database.' });
    }
  }

  // Reject any other method
  return res.status(405).json({ error: `Method ${req.method} not allowed.` });
}

