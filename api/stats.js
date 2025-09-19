import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    // This response is cached for 10 minutes on Vercel's Edge Network
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');

    // Query for all books on the 'read' shelf that have a finished date.
    const result = await client.execute({
      sql: "SELECT id, title, authors, imageLinks, pageCount, finishedOn FROM books WHERE shelf = 'read' AND finishedOn IS NOT NULL",
      args: [],
    });

    if (result.rows.length === 0) {
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
      
      // Group books by the year they were finished
      if (!booksByYear[year]) {
        booksByYear[year] = [];
      }
      // Safely parse JSON fields for each book
      let authors = [];
      let imageLinks = {};
      try { authors = JSON.parse(book.authors); } catch (e) {}
      try { imageLinks = JSON.parse(book.imageLinks); } catch (e) {}
      
      const processedBook = {
          id: book.id,
          title: book.title,
          authors: authors,
          imageLinks: imageLinks,
          pageCount: book.pageCount
      };

      booksByYear[year].push(processedBook);

      // Tally books for each author
      authors.forEach(author => {
        if (!authorCounts[author]) {
          authorCounts[author] = { count: 0, books: [] };
        }
        authorCounts[author].count++;
        authorCounts[author].books.push({ title: book.title, year });
      });
    }
    
    // Calculate the overall average books read per year
    const yearsWithBooks = Object.keys(booksByYear).length;
    const totalBooksRead = result.rows.length;
    const averageBooksPerYear = yearsWithBooks > 0 ? (totalBooksRead / yearsWithBooks).toFixed(1) : 0;
    
    // Sort authors by the number of books read, descending
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
    return res.status(500).json({ error: "An internal server error occurred." });
  }
}

