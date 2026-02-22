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
    const { id, action } = req.query;

    try {
      if (id) {
        const result = await client.execute({
          sql: "SELECT * FROM books WHERE id = ?",
          args: [id],
        });
        if (result.rows.length === 0) return res.status(404).json({ error: 'Book not found' });
        res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=60');
        return res.status(200).json(result.rows[0]);
      }

      if (action === 'export-hugo') {
        const bookResult = await client.execute("SELECT * FROM books WHERE shelf = 'read' ORDER BY finishedOn DESC, title ASC");
        const tagResult = await client.execute("SELECT * FROM tags ORDER BY name ASC");

        const books = bookResult.rows.map(row => ({
          ...row,
          authors: parseJson(row.authors, []),
          imageLinks: parseJson(row.imageLinks, {}),
          industryIdentifiers: parseJson(row.industryIdentifiers, []),
          highlights: parseJson(row.highlights, []),
          subjects: parseJson(row.subjects, []),
          tags: parseJson(row.tags, []),
        }));

        const highlights = [];
        books.forEach(book => {
          const authorsStr = Array.isArray(book.authors) ? book.authors.join(', ') : '';
          book.highlights.forEach(text => {
            highlights.push({
              bookId: book.id, title: book.title, author: authorsStr || 'Unknown Author',
              highlight: text, finishedOn: book.finishedOn || null
            });
          });
        });

        // Simplified buildStats for the export
        const stats = buildExportStats(books);

        res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=60');
        return res.status(200).json({ generatedAt: new Date().toISOString(), books, tags: tagResult.rows, highlights, stats });
      }

      const result = await client.execute('SELECT * FROM books ORDER BY title ASC');
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error('API Error:', error);
      return res.status(500).json({ error: 'Operation failed' });
    }
  }

  if (req.method === 'POST') {
    const { password, action, data } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    try {
      switch (action) {
        case 'add': return await handleAdd(data, res);
        case 'update': return await handleUpdate(data, res);
        case 'delete': return await handleDelete(data, res);
        case 'parse-highlights': return await handleParseHighlights(data, res);
        case 'tag-create': return await handleTagCreate(data, res);
        case 'tag-update': return await handleTagUpdate(data, res);
        case 'tag-delete': return await handleTagDelete(data, res);
        case 'tag-bulk-add': return await handleTagBulkAdd(data, res);
        default: return res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error(`Error during ${action}:`, error);
      return res.status(500).json({ error: `Failed to ${action}` });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function parseJson(val, fallback) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch (e) { return fallback; }
}

function buildExportStats(books) {
  const booksByYear = {};
  books.forEach(b => {
    const year = b.finishedOn ? new Date(b.finishedOn).getFullYear().toString() : 'Unknown';
    if (!booksByYear[year]) booksByYear[year] = [];
    booksByYear[year].push(b);
  });
  return { totals: { books: books.length }, booksByYear };
}

async function handleParseHighlights(data, res) {
  const { fileContent, fileName } = data;
  if (!fileContent || !fileName) return res.status(400).json({ error: "Missing content" });
  if (fileName.endsWith('.md')) return res.status(200).json(parseMDHighlights(fileContent));
  if (fileName.endsWith('.html')) return res.status(200).json(parseHTMLHighlights(fileContent));
  return res.status(400).json({ error: "Unsupported file type" });
}

function parseMDHighlights(md) {
  const highlights = [];
  let title = md.match(/---\s*title:\s*"(.*?)"\s*---/)?.[1] || 'Unknown Title';
  md.split('\n').forEach(line => {
    const m = line.match(/^\s*[-*+]\s+(.*)$/);
    if (m) {
      const t = m[1].replace(/\s*\(location.*?\)\s*$/i, '').trim();
      if (t) highlights.push(t);
    }
  });
  return { title, highlights };
}

function parseHTMLHighlights(html) {
  const title = html.match(/<div class="bookTitle">([^<]+)<\/div>/)?.[1]?.trim() || 'Unknown Title';
  const highlights = [];
  const regex = /<div class="noteText">([^<]+)<\/div>/g;
  let m;
  while ((m = regex.exec(html)) !== null) highlights.push(m[1].trim());
  return { title, highlights };
}

async function handleAdd(data, res) {
  const { olid, shelf = 'watchlist' } = data;
  if (!olid) return res.status(400).json({ error: 'OLID is required' });

  const bookData = await (await fetch(`https://openlibrary.org/works/${olid}.json`)).json();

  let coverUrl = null;
  if (bookData.covers?.length > 0) {
    const ab = await (await fetch(`https://covers.openlibrary.org/b/id/${bookData.covers[0]}-L.jpg`)).arrayBuffer();
    const webp = await sharp(Buffer.from(ab)).resize(400, 600, { fit: 'inside' }).webp({ quality: 85 }).toBuffer();
    const blob = await put(`book-covers/${olid}.webp`, webp, { access: 'public', contentType: 'image/webp' });
    coverUrl = blob.url;
  }

  const authors = bookData.authors ? await Promise.all(bookData.authors.map(async (a) => {
    const key = a.author?.key || a.key;
    const res = await fetch(`https://openlibrary.org${key}.json`);
    return res.ok ? (await res.json()).name : 'Unknown Author';
  })) : ['Unknown Author'];

  const book = {
    id: olid, title: bookData.title || 'Untitled', authors: JSON.stringify(authors),
    imageLinks: JSON.stringify({ thumbnail: coverUrl }), pageCount: bookData.number_of_pages || null,
    publishedDate: bookData.first_publish_date || null, fullPublishDate: bookData.first_publish_date || null,
    publisher: bookData.publishers ? bookData.publishers[0] : null,
    industryIdentifiers: '[]', highlights: '[]', startedOn: null, finishedOn: null,
    readingMedium: 'Not set', shelf, hasHighlights: 0, readingProgress: 0,
    bookDescription: bookData.description?.value || bookData.description || null,
    subjects: JSON.stringify(bookData.subjects || []), tags: '[]'
  };

  await client.execute({
    sql: `INSERT OR REPLACE INTO books VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: Object.values(book)
  });
  return res.status(200).json({ message: 'Book added', book });
}

async function handleUpdate(data, res) {
  const { id, originalId, ...updates } = data;
  const targetId = originalId || id;
  if (!targetId) return res.status(400).json({ error: 'ID required' });

  if (id && id !== targetId) updates.id = id;
  const fields = Object.keys(updates).map(k => `${k} = ?`);
  const values = Object.values(updates).map(v => (typeof v === 'object' && v !== null ? JSON.stringify(v) : v));

  if (fields.length === 0) return res.status(400).json({ error: 'No updates' });

  const result = await client.execute({
    sql: `UPDATE books SET ${fields.join(', ')} WHERE id = ?`,
    args: [...values, targetId]
  });
  return res.status(200).json({ message: 'Updated', rowsAffected: result.rowsAffected });
}

async function handleDelete(data, res) {
  if (!data.id) return res.status(400).json({ error: 'ID required' });
  await client.execute({ sql: 'DELETE FROM books WHERE id = ?', args: [data.id] });
  return res.status(200).json({ message: 'Deleted' });
}

async function handleTagCreate(data, res) {
  const { name, color } = data;
  const id = `tag_${Date.now()}`;
  await client.execute({
    sql: 'INSERT INTO tags (id, name, color, createdAt) VALUES (?, ?, ?, ?)',
    args: [id, name, color, new Date().toISOString()]
  });
  return res.status(200).json({ message: 'Tag created', id });
}

async function handleTagUpdate(data, res) {
  await client.execute({
    sql: 'UPDATE tags SET name = ?, color = ? WHERE id = ?',
    args: [data.name, data.color, data.id]
  });
  return res.status(200).json({ message: 'Tag updated' });
}

async function handleTagDelete(data, res) {
  await client.execute({ sql: 'DELETE FROM tags WHERE id = ?', args: [data.id] });
  return res.status(200).json({ message: 'Tag deleted' });
}

async function handleTagBulkAdd(data, res) {
  const { tagId, bookIds } = data;
  for (const bookId of bookIds) {
    const result = await client.execute({ sql: 'SELECT tags FROM books WHERE id = ?', args: [bookId] });
    if (result.rows.length > 0) {
      const tags = parseJson(result.rows[0].tags, []);
      if (!tags.includes(tagId)) {
        tags.push(tagId);
        await client.execute({ sql: 'UPDATE books SET tags = ? WHERE id = ?', args: [JSON.stringify(tags), bookId] });
      }
    }
  }
  return res.status(200).json({ message: 'Tags added' });
}
