import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q, limit = 20, offset = 0, action } = req.query;

  try {
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=60');

    if (action === 'stats') {
      const result = await client.execute("SELECT id, title, authors, imageLinks, pageCount, finishedOn, readingMedium FROM books WHERE shelf = 'read'");
      return res.status(200).json(calculateStats(result.rows));
    }

    if (action === 'randomHighlight') {
      const result = await client.execute("SELECT id, title, authors, highlights FROM books WHERE hasHighlights = 1");
      const books = result.rows;
      if (!books.length) return res.status(200).json(null);
      const book = books[Math.floor(Math.random() * books.length)];
      const highlights = JSON.parse(book.highlights || '[]');
      if (!highlights.length) return res.status(200).json(null);
      const text = highlights[Math.floor(Math.random() * highlights.length)];
      return res.status(200).json({ id: book.id, title: book.title, authors: JSON.parse(book.authors || '[]'), highlight: text });
    }

    if (action === 'tags') {
      const result = await client.execute('SELECT * FROM tags ORDER BY name ASC');
      return res.status(200).json(result.rows);
    }

    // Default: List/Search
    let query = "SELECT id, title, authors, imageLinks, shelf, readingMedium, finishedOn, tags, readingProgress FROM books";
    let args = [];
    if (q) {
      query += " WHERE title LIKE ? OR authors LIKE ? OR highlights LIKE ? OR bookDescription LIKE ?";
      const p = `%${q}%`;
      args = [p, p, p, p];
    }
    query += " ORDER BY CASE WHEN shelf = 'currentlyReading' THEN 0 WHEN shelf = 'abandoned' THEN 1 ELSE 2 END, finishedOn DESC, title ASC LIMIT ? OFFSET ?";
    args.push(parseInt(limit), parseInt(offset));

    const result = await client.execute({ sql: query, args });
    return res.status(200).json(result.rows);

  } catch (e) {
    console.error("Public API Error:", e);
    return res.status(500).json({ error: 'Operation failed' });
  }
}

function calculateStats(books) {
  const booksByYear = {};
  const authorCounts = {};
  const mediumCounts = {};
  let totalPages = 0;

  books.forEach(b => {
    const year = b.finishedOn ? new Date(b.finishedOn).getFullYear().toString() : 'Unknown';
    if (!booksByYear[year]) booksByYear[year] = [];

    const authors = JSON.parse(b.authors || '[]');
    booksByYear[year].push({ ...b, authors, imageLinks: JSON.parse(b.imageLinks || '{}') });

    authors.forEach(a => {
      if (!authorCounts[a]) authorCounts[a] = { count: 0, books: [] };
      authorCounts[a].count++;
      authorCounts[a].books.push({ title: b.title, year });
    });

    const m = b.readingMedium || 'Not Specified';
    mediumCounts[m] = (mediumCounts[m] || 0) + 1;
    totalPages += (b.pageCount || 0);
  });

  const authorStats = Object.entries(authorCounts)
    .map(([name, data]) => ({ name, count: data.count, books: data.books }))
    .sort((a, b) => b.count - a.count).slice(0, 10);

  return {
    booksByYear, authorStats, mediumStats: mediumCounts,
    totals: { books: books.length, pages: totalPages, avgPerYear: (books.length / (Object.keys(booksByYear).length || 1)).toFixed(1) }
  };
}