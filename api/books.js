import { createClient } from '@libsql/client';
import { put } from '@vercel/blob';
import sharp from 'sharp';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initializeDatabase() {
  try {
    await client.batch([
      `CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY, title TEXT, authors TEXT, imageLinks TEXT,
        pageCount INTEGER, publishedDate TEXT, industryIdentifiers TEXT,
        highlights TEXT, startedOn TEXT, finishedOn TEXT, readingMedium TEXT, shelf TEXT,
        hasHighlights INTEGER DEFAULT 0, readingProgress INTEGER DEFAULT 0,
        publisher TEXT, fullPublishDate TEXT, bookDescription TEXT, subjects TEXT,
        tags TEXT
      );`,
      `CREATE INDEX IF NOT EXISTS idx_shelf ON books(shelf);`,
      `CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );`
    ], 'write');

    const tableInfo = await client.execute(`PRAGMA table_info(books)`);
    const columns = tableInfo.rows.map(row => row.name);

    const newColumns = {
      publisher: 'TEXT',
      fullPublishDate: 'TEXT',
      bookDescription: 'TEXT',
      subjects: 'TEXT',
      tags: 'TEXT'
    };

    for (const [col, type] of Object.entries(newColumns)) {
      if (!columns.includes(col)) {
        await client.execute(`ALTER TABLE books ADD COLUMN ${col} ${type}`);
      }
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

export default async function handler(req, res) {
  await initializeDatabase();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const result = await client.execute('SELECT * FROM books');
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching books:', error);
      return res.status(500).json({ error: 'Failed to fetch books' });
    }
  }

  if (req.method === 'POST') {
    const { password, action, data } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    try {
      switch (action) {
        case 'add':
          return await handleAdd(data, res);
        case 'update':
          return await handleUpdate(data, res);
        case 'delete':
          return await handleDelete(data, res);
        case 'export':
          return await handleExport(res);
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error(`Error during ${action}:`, error);
      return res.status(500).json({ error: `Failed to ${action}` });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleAdd(data, res) {
  const { olid, shelf = 'watchlist' } = data;

  if (!olid) {
    return res.status(400).json({ error: 'OLID is required' });
  }

  const openLibraryUrl = `https://openlibrary.org/works/${olid}.json`;
  const response = await fetch(openLibraryUrl);

  if (!response.ok) {
    return res.status(404).json({ error: 'Book not found on OpenLibrary' });
  }

  const bookData = await response.json();

  let coverUrl = null;
  if (bookData.covers && bookData.covers.length > 0) {
    const originalCoverUrl = `https://covers.openlibrary.org/b/id/${bookData.covers[0]}-L.jpg`;
    const coverResponse = await fetch(originalCoverUrl);

    if (coverResponse.ok) {
      const arrayBuffer = await coverResponse.arrayBuffer();
      const webpBuffer = await sharp(Buffer.from(arrayBuffer))
        .resize(400, 600, { fit: 'inside' })
        .webp({ quality: 85 })
        .toBuffer();

      const blob = await put(`book-covers/${olid}.webp`, webpBuffer, {
        access: 'public',
        contentType: 'image/webp',
      });

      coverUrl = blob.url;
    }
  }

  const authors = bookData.authors ? await Promise.all(
    bookData.authors.map(async (author) => {
      const authorKey = author.author?.key || author.key;
      if (!authorKey) return 'Unknown Author';
      const authorUrl = `https://openlibrary.org${authorKey}.json`;
      const authorResponse = await fetch(authorUrl);
      if (authorResponse.ok) {
        const authorData = await authorResponse.json();
        return authorData.name || 'Unknown Author';
      }
      return 'Unknown Author';
    })
  ) : ['Unknown Author'];

  const book = {
    id: olid,
    title: bookData.title || 'Untitled',
    authors: JSON.stringify(authors),
    imageLinks: JSON.stringify({ thumbnail: coverUrl }),
    pageCount: bookData.number_of_pages || null,
    publishedDate: bookData.first_publish_date || null,
    fullPublishDate: bookData.first_publish_date || null,
    publisher: bookData.publishers ? bookData.publishers[0] : null,
    industryIdentifiers: JSON.stringify([]),
    highlights: JSON.stringify([]),
    startedOn: null,
    finishedOn: null,
    readingMedium: 'Not set',
    shelf: shelf,
    hasHighlights: 0,
    readingProgress: 0,
    bookDescription: bookData.description?.value || bookData.description || null,
    subjects: JSON.stringify(bookData.subjects || []),
    tags: JSON.stringify([])
  };

  await client.execute({
    sql: `INSERT OR REPLACE INTO books VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      book.id, book.title, book.authors, book.imageLinks, book.pageCount,
      book.publishedDate, book.industryIdentifiers, book.highlights,
      book.startedOn, book.finishedOn, book.readingMedium, book.shelf,
      book.hasHighlights, book.readingProgress, book.publisher,
      book.fullPublishDate, book.bookDescription, book.subjects, book.tags
    ]
  });

  return res.status(200).json({ message: 'Book added successfully', book });
}

async function handleUpdate(data, res) {
  const { id, originalId, ...updates } = data;

  if (!id) {
    return res.status(400).json({ error: 'Book ID is required' });
  }

  const targetId = originalId || id;
  if (id !== targetId) {
    updates.id = id;
  }

  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);

    if (typeof value === 'object' && value !== null) {
      values.push(JSON.stringify(value));
    } else {
      values.push(value);
    }
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(targetId);

  console.log(`[BACKEND DEBUG] handleUpdate: updating book ${targetId}`, updates);

  const result = await client.execute({
    sql: `UPDATE books SET ${fields.join(', ')} WHERE id = ?`,
    args: values
  });

  console.log(`[BACKEND DEBUG] handleUpdate: update completed for ${targetId}. Rows affected: ${result.rowsAffected}`);

  return res.status(200).json({
    message: 'Book updated successfully',
    rowsAffected: result.rowsAffected
  });
}

async function handleDelete(data, res) {
  const { id } = data;

  if (!id) {
    return res.status(400).json({ error: 'Book ID is required' });
  }

  await client.execute({
    sql: 'DELETE FROM books WHERE id = ?',
    args: [id]
  });

  return res.status(200).json({ message: 'Book deleted successfully' });
}

async function handleExport(res) {
  const result = await client.execute('SELECT * FROM books');
  return res.status(200).json(result.rows);
}
