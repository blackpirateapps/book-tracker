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
                publisher TEXT, fullPublishDate TEXT, bookDescription TEXT, subjects TEXT
            );`,
            `CREATE INDEX IF NOT EXISTS idx_shelf ON books(shelf);`
        ], 'write');
        
        const tableInfo = await client.execute(`PRAGMA table_info(books)`);
        const columns = tableInfo.rows.map(row => row.name);
        const newColumns = {
            publisher: 'TEXT',
            fullPublishDate: 'TEXT',
            bookDescription: 'TEXT',
            subjects: 'TEXT'
        };
        for (const col in newColumns) {
            if (!columns.includes(col)) {
                await client.execute(`ALTER TABLE books ADD COLUMN ${col} ${newColumns[col]}`);
            }
        }
    } catch (e) {
        console.error("Database initialization failed:", e);
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    await initializeDatabase();

    if (req.method === 'POST') {
        const { password, action, data } = req.body;
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ error: "Unauthorized: Invalid password." });
        }

        try {
            switch (action) {
                case 'add': {
                    let bookData = data;

                    // --- Open Library Detailed Fetch for Rich Metadata ---
                    if (bookData.olid) {
                        const olid = bookData.olid;
                        const detailsUrl = `https://openlibrary.org/api/books?bibkeys=OLID:${olid}&format=json&jscmd=data`;
                        const olResponse = await fetch(detailsUrl);
                        if (olResponse.ok) {
                            const olData = await olResponse.json();
                            const details = olData[`OLID:${olid}`];
                            if (details) {
                                bookData.pageCount = details.number_of_pages || bookData.pageCount;
                                bookData.publisher = details.publishers?.[0]?.name || null;
                                bookData.fullPublishDate = details.publish_date || bookData.publishedDate;
                                bookData.subjects = JSON.stringify(details.subjects?.map(s => s.name) || []);
                                bookData.industryIdentifiers = details.identifiers || bookData.industryIdentifiers;
                            }
                        }
                    }

                    if (bookData.imageLinks?.thumbnail && bookData.imageLinks.thumbnail.startsWith('http')) {
                        try {
                            const response = await fetch(bookData.imageLinks.thumbnail);
                            if (response.ok) {
                                const imageBuffer = await response.arrayBuffer();
                                const webpBuffer = await sharp(Buffer.from(imageBuffer)).webp({ quality: 80 }).toBuffer();
                                const blob = await put(`${bookData.id}.webp`, webpBuffer, { access: 'public', contentType: 'image/webp' });
                                bookData.imageLinks.thumbnail = blob.url;
                            }
                        } catch (imgError) {
                            console.error("Image processing failed:", imgError);
                            bookData.imageLinks.thumbnail = null;
                        }
                    }
                    
                    const args = [
                        bookData.id, bookData.title, JSON.stringify(bookData.authors || []), JSON.stringify(bookData.imageLinks || {}),
                        bookData.pageCount, bookData.publishedDate, JSON.stringify(bookData.industryIdentifiers || []),
                        JSON.stringify(bookData.highlights || []), bookData.startedOn, bookData.finishedOn,
                        bookData.readingMedium, bookData.shelf, (bookData.highlights && bookData.highlights.length > 0) ? 1 : 0,
                        bookData.readingProgress || 0, bookData.publisher, bookData.fullPublishDate,
                        bookData.bookDescription, bookData.subjects
                    ];

                    const sql = `
                        INSERT INTO books (id, title, authors, imageLinks, pageCount, publishedDate, industryIdentifiers, highlights, startedOn, finishedOn, readingMedium, shelf, hasHighlights, readingProgress, publisher, fullPublishDate, bookDescription, subjects)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET
                            title=excluded.title, authors=excluded.authors, imageLinks=excluded.imageLinks, pageCount=excluded.pageCount,
                            publishedDate=excluded.publishedDate, industryIdentifiers=excluded.industryIdentifiers, highlights=excluded.highlights,
                            startedOn=excluded.startedOn, finishedOn=excluded.finishedOn, readingMedium=excluded.readingMedium, shelf=excluded.shelf,
                            hasHighlights=excluded.hasHighlights, readingProgress=excluded.readingProgress, publisher=excluded.publisher,
                            fullPublishDate=excluded.fullPublishDate, bookDescription=excluded.bookDescription, subjects=excluded.subjects;
                    `;

                    await client.execute({ sql, args });
                    const result = await client.execute({ sql: "SELECT * FROM books WHERE id = ?", args: [bookData.id] });
                    return res.status(200).json({ message: 'Book added successfully!', book: result.rows[0] });
                }
                case 'update': {
                    const bookData = data;
                    const highlightsStr = JSON.stringify(bookData.highlights || []);
                    const hasHighlights = (bookData.highlights && bookData.highlights.length > 0) ? 1 : 0;
                    
                    const sql = `
                        UPDATE books SET 
                            title = ?, authors = ?, highlights = ?, hasHighlights = ?, readingProgress = ?,
                            startedOn = ?, finishedOn = ?, readingMedium = ?, shelf = ?,
                            publisher = ?, fullPublishDate = ?, bookDescription = ?, pageCount = ?
                        WHERE id = ?`;
                    
                    const args = [
                        bookData.title, JSON.stringify(bookData.authors || []), highlightsStr, hasHighlights,
                        bookData.readingProgress, bookData.startedOn, bookData.finishedOn, bookData.readingMedium,
                        bookData.shelf, bookData.publisher, bookData.fullPublishDate, bookData.bookDescription,
                        bookData.pageCount, bookData.id
                    ];

                    await client.execute({ sql, args });
                    const result = await client.execute({ sql: "SELECT * FROM books WHERE id = ?", args: [bookData.id] });
                    return res.status(200).json({ message: 'Book updated successfully!', book: result.rows[0] });
                }
                case 'delete':
                    await client.execute({ sql: "DELETE FROM books WHERE id = ?", args: [data.id] });
                    return res.status(200).json({ message: "Book removed successfully!" });
                
                default:
                    return res.status(400).json({ error: "Invalid action." });
            }
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: `An error occurred during the '${action}' action.` });
        }
    }
    return res.status(405).json({ error: "Method not allowed." });
}

