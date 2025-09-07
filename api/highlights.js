import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: `Method ${req.method} not allowed.` });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Book ID is required.' });
  }

  try {
    // MODIFIED: Fetches all columns for the specified book.
    const result = await client.execute({
      sql: "SELECT * FROM books WHERE id = ?",
      args: [id],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    // Return the full book object.
    return res.status(200).json(result.rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to fetch book details.' });
  }
}