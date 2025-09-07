import { createClient } from '@libsql/client';
import { put } from '@vercel/blob';
import sharp from 'sharp';

// --- DATABASE CLIENT SETUP ---
const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

// --- API HANDLER ---
export default async function handler(req, res) {
    // Set CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Initialize Database on first call
    await initializeDatabase();

    // --- GET Request Handler (Public Fetch) ---
    if (req.method === 'GET') {
        try {
            const result = await client.execute("SELECT * FROM books");
            return res.status(200).json(result.rows);
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Failed to fetch books." });
        }
    }

    // --- POST Request Handler (Authenticated Actions) ---
    if (req.method === 'POST') {
        const { password, action, data } = req.body;

        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ error: "Unauthorized: Invalid password." });
        }

        try {
            switch (action) {
                case 'add':
                case 'update':
                    const bookData = data;

                    // --- IMAGE PROCESSING LOGIC ---
                    // Check if the image link is an external one that needs processing
                    if (bookData.imageLinks?.thumbnail && bookData.imageLinks.thumbnail.startsWith('http')) {
                        try {
                            const response = await fetch(bookData.imageLinks.thumbnail);
                            if (response.ok) {
                                const imageBuffer = await response.arrayBuffer();
                                // Compress to WebP and upload to Vercel Blob
                                const webpBuffer = await sharp(Buffer.from(imageBuffer)).webp({ quality: 80 }).toBuffer();
                                const blob = await put(`${bookData.id}.webp`, webpBuffer, {
                                    access: 'public',
                                    contentType: 'image/webp',
                                });
                                // Update the book's image link to the permanent blob URL
                                bookData.imageLinks.thumbnail = blob.url;
                            } else {
                                // If fetching fails, clear the image link
                                bookData.imageLinks.thumbnail = null; 
                            }
                        } catch (imgError) {
                            console.error("Image processing failed:", imgError);
                            bookData.imageLinks.thumbnail = null; // Clear on error
                        }
                    }

                    // Serialize complex fields back to JSON strings for DB storage
                    const authorsStr = JSON.stringify(bookData.authors || []);
                    const imageLinksStr = JSON.stringify(bookData.imageLinks || {});
                    const identifiersStr = JSON.stringify(bookData.industryIdentifiers || []);
                    const highlightsStr = JSON.stringify(bookData.highlights || []);

                    await client.execute({
                        sql: `
                            INSERT INTO books (id, title, authors, imageLinks, pageCount, publishedDate, industryIdentifiers, highlights, startedOn, finishedOn, readingMedium, shelf) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(id) DO UPDATE SET
                                title = excluded.title,
                                authors = excluded.authors,
                                imageLinks = excluded.imageLinks,
                                pageCount = excluded.pageCount,
                                publishedDate = excluded.publishedDate,
                                industryIdentifiers = excluded.industryIdentifiers,
                                highlights = excluded.highlights,
                                startedOn = excluded.startedOn,
                                finishedOn = excluded.finishedOn,
                                readingMedium = excluded.readingMedium,
                                shelf = excluded.shelf;
                        `,
                        args: [bookData.id, bookData.title, authorsStr, imageLinksStr, bookData.pageCount, bookData.publishedDate, identifiersStr, highlightsStr, bookData.startedOn, bookData.finishedOn, bookData.readingMedium, bookData.shelf]
                    });
                    return res.status(200).json({ message: action === 'add' ? 'Book added successfully!' : 'Book updated successfully!' });

                case 'delete':
                    await client.execute({ sql: "DELETE FROM books WHERE id = ?", args: [data.id] });
                    return res.status(200).json({ message: "Book removed successfully!" });

                case 'export':
                     const result = await client.execute("SELECT * FROM books");
                     return res.status(200).json(result.rows);

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

// --- DATABASE INITIALIZATION ---
async function initializeDatabase() {
    try {
        await client.batch([
            `CREATE TABLE IF NOT EXISTS books (
                id TEXT PRIMARY KEY,
                title TEXT,
                authors TEXT,
                imageLinks TEXT,
                pageCount INTEGER,
                publishedDate TEXT,
                industryIdentifiers TEXT,
                highlights TEXT,
                startedOn TEXT,
                finishedOn TEXT,
                readingMedium TEXT,
                shelf TEXT
            );`,
            // NEW: Add an index on the 'shelf' column to speed up queries that filter or group by shelf.
            `CREATE INDEX IF NOT EXISTS idx_shelf ON books(shelf);`
        ], 'write');
    } catch (e) {
        console.error("Database initialization failed:", e);
    }
}

