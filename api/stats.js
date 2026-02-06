import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: `Method ${req.method} not allowed.` });
  }

  try {
    // Fetch all read books to calculate stats
    const result = await client.execute({
      sql: "SELECT id, title, authors, imageLinks, pageCount, finishedOn, startedOn, readingMedium FROM books WHERE shelf = 'read'",
      args: [],
    });

    const books = result.rows;

    // --- Aggregation Logic ---
    const booksByYear = {};
    const authorCounts = {};
    const mediumCounts = {};
    let totalPages = 0;

    books.forEach(book => {
      // 1. Process Year
      let year = 'Unknown';
      if (book.finishedOn) {
        year = new Date(book.finishedOn).getFullYear().toString();
      }

      if (!booksByYear[year]) booksByYear[year] = [];

      // Parse JSON fields
      let authors = [];
      try { authors = JSON.parse(book.authors); } catch (e) { }
      let imageLinks = {};
      try { imageLinks = JSON.parse(book.imageLinks); } catch (e) { }

      // Add formatted book to year list
      booksByYear[year].push({
        ...book,
        authors,
        imageLinks
      });

      // 2. Process Authors
      authors.forEach(author => {
        if (!authorCounts[author]) {
          authorCounts[author] = { count: 0, books: [] };
        }
        authorCounts[author].count++;
        authorCounts[author].books.push({ title: book.title, year });
      });

      // 3. Process Medium
      const medium = book.readingMedium || 'Not Specified';
      mediumCounts[medium] = (mediumCounts[medium] || 0) + 1;

      // 4. Totals
      totalPages += (book.pageCount || 0);
    });

    // --- Format Author Stats ---
    // Convert to array and sort by count desc
    const authorStats = Object.entries(authorCounts)
      .map(([name, data]) => ({ name, count: data.count, books: data.books }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10

    // --- Global Averages ---
    const yearsActive = Object.keys(booksByYear).length || 1;
    const averageBooksPerYear = (books.length / yearsActive).toFixed(1);

    const stats = {
      booksByYear, // { "2023": [books...], "2022": [books...] }
      authorStats, // [{name: "Dune", count: 5}, ...]
      mediumStats: mediumCounts, // { "Kindle": 10, "Paper": 5 }
      totals: {
        books: books.length,
        pages: totalPages,
        avgPerYear: averageBooksPerYear
      }
    };

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(stats);

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to fetch stats.' });
  }
}