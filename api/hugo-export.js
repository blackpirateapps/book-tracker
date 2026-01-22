import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 60;
const rateLimitState = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const existing = rateLimitState.get(ip);
  const windowStart = existing?.startMs ?? now;
  const withinWindow =
    existing && now - windowStart <= RATE_LIMIT_WINDOW_MS;
  const count = withinWindow ? existing.count : 0;

  const nextCount = count + 1;
  rateLimitState.set(ip, {
    startMs: withinWindow ? windowStart : now,
    count: nextCount,
  });

  if (rateLimitState.size > 1000) {
    for (const [key, value] of rateLimitState.entries()) {
      if (now - value.startMs > RATE_LIMIT_WINDOW_MS) {
        rateLimitState.delete(key);
      }
    }
  }

  if (nextCount > RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.ceil(
      (RATE_LIMIT_WINDOW_MS - (now - windowStart)) / 1000
    );
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function formatBooks(rows) {
  return rows.map((row) => ({
    ...row,
    authors: parseJson(row.authors, []),
    imageLinks: parseJson(row.imageLinks, {}),
    industryIdentifiers: parseJson(row.industryIdentifiers, []),
    highlights: parseJson(row.highlights, []),
    subjects: parseJson(row.subjects, []),
    tags: parseJson(row.tags, []),
  }));
}

function buildHighlightList(books) {
  const highlights = [];
  books.forEach((book) => {
    const authors = Array.isArray(book.authors) ? book.authors.join(', ') : '';
    book.highlights.forEach((text) => {
      highlights.push({
        bookId: book.id,
        title: book.title,
        author: authors || 'Unknown Author',
        highlight: text,
        finishedOn: book.finishedOn || null,
      });
    });
  });
  return highlights;
}

function buildStats(books) {
  const booksByYear = {};
  const authorCounts = {};
  const mediumCounts = {};
  let totalPages = 0;

  books.forEach((book) => {
    const year = book.finishedOn
      ? new Date(book.finishedOn).getFullYear().toString()
      : 'Unknown';

    if (!booksByYear[year]) booksByYear[year] = [];

    booksByYear[year].push({
      id: book.id,
      title: book.title,
      authors: book.authors,
      imageLinks: book.imageLinks,
      pageCount: book.pageCount,
      finishedOn: book.finishedOn,
      readingMedium: book.readingMedium,
    });

    const authors = Array.isArray(book.authors) ? book.authors : [];
    authors.forEach((author) => {
      if (!authorCounts[author]) {
        authorCounts[author] = { count: 0, books: [] };
      }
      authorCounts[author].count += 1;
      authorCounts[author].books.push({ title: book.title, year });
    });

    const medium = book.readingMedium || 'Not Specified';
    mediumCounts[medium] = (mediumCounts[medium] || 0) + 1;
    totalPages += book.pageCount || 0;
  });

  const authorStats = Object.entries(authorCounts)
    .map(([name, data]) => ({ name, count: data.count, books: data.books }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const yearsActive = Object.keys(booksByYear).length || 1;
  const averageBooksPerYear = (books.length / yearsActive).toFixed(1);

  return {
    booksByYear,
    authorStats,
    mediumStats: mediumCounts,
    totals: {
      books: books.length,
      pages: totalPages,
      avgPerYear: averageBooksPerYear,
    },
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: `Method ${req.method} not allowed.` });
  }

  const rateLimit = checkRateLimit(getClientIp(req));
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', rateLimit.retryAfterSeconds);
    return res.status(429).json({ error: 'Rate limit exceeded.' });
  }

  try {
    const bookResult = await client.execute({
      sql: "SELECT * FROM books WHERE shelf = 'read' ORDER BY finishedOn DESC, title ASC",
      args: [],
    });

    const tagResult = await client.execute({
      sql: 'SELECT * FROM tags ORDER BY name ASC',
      args: [],
    });

    const books = formatBooks(bookResult.rows);
    const tags = tagResult.rows;
    const highlights = buildHighlightList(books);
    const stats = buildStats(books);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      books,
      tags,
      highlights,
      stats,
    });
  } catch (error) {
    console.error('Hugo export error:', error);
    return res.status(500).json({ error: 'Failed to build export payload.' });
  }
}
