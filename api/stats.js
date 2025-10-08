// stats.js
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');

    const result = await client.execute({
      sql: "SELECT id, title, authors, imageLinks, pageCount, finishedOn FROM books WHERE shelf = 'read' AND finishedOn IS NOT NULL",
      args: [],
    });

    if (!result.rows || result.rows.length === 0) {
      return res.status(200).json({
        booksByYear: {},
        authorStats: [],
        averageBooksPerYear: 0,
      });
    }

    const booksByYear = {};
    const authorCounts = {};

    for (const book of result.rows) {
      const year = new Date(book.finishedOn).getFullYear();

      if (!booksByYear[year]) {
        booksByYear[year] = [];
      }

      let authors = [];
      let imageLinks = {};
      try { authors = JSON.parse(book.authors); } catch (e) {}
      try { imageLinks = JSON.parse(book.imageLinks); } catch (e) {}

      const processedBook = {
        id: book.id,
        title: book.title,
        authors,
        imageLinks,
        pageCount: book.pageCount || 0,
      };
      booksByYear[year].push(processedBook);

      (authors || []).forEach((author) => {
        if (!authorCounts[author]) {
          authorCounts[author] = { count: 0, books: [] };
        }
        authorCounts[author].count++;
        authorCounts[author].books.push({ title: book.title, year });
      });
    }

    const yearsWithBooks = Object.keys(booksByYear).length;
    const totalBooksRead = result.rows.length;
    const averageBooksPerYear = yearsWithBooks > 0 ? (totalBooksRead / yearsWithBooks).toFixed(1) : 0;

    const sortedAuthorStats = Object.entries(authorCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({
      booksByYear,
      authorStats: sortedAuthorStats,
      averageBooksPerYear,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
}