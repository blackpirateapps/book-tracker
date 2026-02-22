import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { limit = 50, offset = 0 } = req.query;

    // MICRO-QUERY: Only fetch what's needed to paint the grid layout
    // No authors, no tags, no dates yet. Just visual identifiers.
    const query = `
      SELECT id, title, imageLinks, shelf 
      FROM books 
      ORDER BY finishedOn DESC, title ASC 
      LIMIT ? OFFSET ?
    `;

    const result = await client.execute({
      sql: query,
      args: [limit, offset]
    });

    // Reduced cache for better responsiveness (10 seconds)
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=60');

    return res.status(200).json(result.rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to fetch book list' });
  }
}