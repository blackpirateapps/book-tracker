import { createClient } from '@libsql/client';
import { put } from '@vercel/blob';
import sharp from 'sharp';

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
    // --- GET Request: Fetch all books that need migration ---
    if (req.method === 'GET') {
        try {
            const result = await client.execute("SELECT id, title, authors, imageLinks FROM books WHERE json_extract(imageLinks, '$.thumbnail') LIKE 'http%'");
            const booksToMigrate = result.rows.map(book => {
                let authors = [];
                let imageLinks = {};
                try { authors = JSON.parse(book.authors); } catch (e) {}
                try { imageLinks = JSON.parse(book.imageLinks); } catch (e) {}
                return {
                    id: book.id,
                    title: book.title,
                    authors: authors,
                    thumbnailUrl: imageLinks.thumbnail
                };
            });
            return res.status(200).json(booksToMigrate);
        } catch (e) {
            console.error("Failed to fetch books for migration:", e);
            return res.status(500).json({ error: "Could not fetch book list." });
        }
    }

    // --- POST Request: Migrate a single book by its ID ---
    if (req.method === 'POST') {
        const { password, bookId } = req.body;
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ error: "Unauthorized: Invalid password." });
        }
        if (!bookId) {
            return res.status(400).json({ error: "Book ID is required." });
        }

        try {
            const bookResult = await client.execute({ sql: "SELECT imageLinks FROM books WHERE id = ?", args: [bookId] });
            if (bookResult.rows.length === 0) {
                return res.status(404).json({ error: "Book not found." });
            }
            
            const imageLinks = JSON.parse(bookResult.rows[0].imageLinks);
            const thumbnailUrl = imageLinks?.thumbnail;

            if (!thumbnailUrl || !thumbnailUrl.startsWith('http')) {
                return res.status(400).json({ message: "Book does not have an external image to migrate." });
            }

            const response = await fetch(thumbnailUrl);
            if (!response.ok) {
                return res.status(502).json({ error: `Could not fetch image from source (Status: ${response.status})`});
            }

            const imageBuffer = await response.arrayBuffer();
            const webpBuffer = await sharp(Buffer.from(imageBuffer)).webp({ quality: 80 }).toBuffer();
            
            const blob = await put(`${bookId}.webp`, webpBuffer, {
                access: 'public',
                contentType: 'image/webp',
            });

            imageLinks.thumbnail = blob.url;

            await client.execute({
                sql: "UPDATE books SET imageLinks = ? WHERE id = ?",
                args: [JSON.stringify(imageLinks), bookId]
            });

            return res.status(200).json({ message: `Successfully migrated cover for book ID: ${bookId}`, newUrl: blob.url });

        } catch (e) {
            console.error(`Migration failed for book ${bookId}:`, e);
            return res.status(500).json({ error: "An error occurred during migration." });
        }
    }

    return res.status(405).json({ error: "Method Not Allowed." });
}