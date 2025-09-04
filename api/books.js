import { createClient } from '@libsql/client';

// --- DATABASE CLIENT SETUP ---
// Connect to the Turso database using environment variables
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// --- API HANDLER ---
// This function will run for every request to /api/books
export default async function handler(req, res) {
  // Allow requests from any origin (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle pre-flight CORS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // --- PUBLIC: GET all books ---
  if (req.method === 'GET') {
    try {
      // Ensure the books table exists before querying
      await ensureTableExists();
      const result = await client.execute("SELECT * FROM books");
      return res.status(200).json(result.rows);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Failed to fetch books from the database.' });
    }
  }

  // --- PROTECTED: POST for all data modifications ---
  if (req.method === 'POST') {
    const { password, action, data } = req.body;

    // --- Authentication ---
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized: Invalid password.' });
    }
    
    // Ensure table exists before modifying
    await ensureTableExists();

    try {
      // --- Action Router ---
      switch (action) {
        case 'add':
        case 'update':
          // Use INSERT OR REPLACE to either create a new book or update an existing one
          await client.execute({
            sql: `INSERT OR REPLACE INTO books (id, title, authors, imageLinks, pageCount, publishedDate, industryIdentifiers, highlights, startedOn, finishedOn, readingMedium, shelf) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              data.id,
              data.title,
              JSON.stringify(data.authors || []),
              JSON.stringify(data.imageLinks || {}),
              data.pageCount,
              data.publishedDate,
              JSON.stringify(data.industryIdentifiers || []),
              JSON.stringify(data.highlights || []),
              data.startedOn,
              data.finishedOn,
              data.readingMedium,
              data.shelf
            ]
          });
          return res.status(200).json({ success: true, message: `Book ${action === 'add' ? 'added' : 'updated'}.` });

        case 'delete':
          await client.execute({ sql: "DELETE FROM books WHERE id = ?", args: [data.id] });
          return res.status(200).json({ success: true, message: 'Book deleted.' });
        
        case 'export':
           const exportResult = await client.execute("SELECT * FROM books");
           return res.status(200).json(exportResult.rows);

        default:
          return res.status(400).json({ error: 'Invalid action.' });
      }
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: `An error occurred during the '${action}' action.` });
    }
  }

  // If method is not GET or POST, return an error
  return res.status(405).json({ error: `Method ${req.method} not allowed.` });
}


// --- DATABASE SCHEMA HELPER ---
async function ensureTableExists() {
  // This ensures the table is created on the first API call if it doesn't exist
  await client.execute(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT,
      authors TEXT,
      imageLinks TEXT,
      pageCount INTEGER,
      publishedDate TEXT,
      industryIdentifiers TEXT,
      highlights TEXT,
      startedOn TEXT,
      finishedOn TEXT,
      readingMedium TEXT,
      shelf TEXT
    );
  `);
}
