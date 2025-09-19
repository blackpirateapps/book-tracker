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
    // Cache the response for 10 minutes to reduce database load
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');

    // Fetch only the necessary data: pageCount and finishedOn for books on the 'read' shelf
    const result = await client.execute({
      sql: "SELECT pageCount, finishedOn FROM books WHERE shelf = 'read' AND finishedOn IS NOT NULL AND pageCount IS NOT NULL",
      args: [],
    });

    if (result.rows.length === 0) {
      return res.status(200).json({});
    }

    const yearlyStats = result.rows.reduce((acc, book) => {
      try {
        const year = new Date(book.finishedOn).getFullYear();
        const pages = parseInt(book.pageCount, 10);

        if (!isNaN(year) && !isNaN(pages)) {
          acc[year] = (acc[year] || 0) + pages;
        }
      } catch (e) {
        // Ignore rows with invalid dates
      }
      return acc;
    }, {});
    
    // Sort the years in descending order
    const sortedStats = Object.entries(yearlyStats)
        .sort(([yearA], [yearB]) => yearB - yearA)
        .reduce((obj, [year, pages]) => {
            obj[year] = pages;
            return obj;
        }, {});


    return res.status(200).json(sortedStats);

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "An internal error occurred while calculating statistics." });
  }
}