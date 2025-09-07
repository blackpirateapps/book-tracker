import { createClient } from '@libsql/client';
import { put } from '@vercel/blob';
import sharp from 'sharp';

const BATCH_SIZE = 5;

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed. Use POST." });
    }

    const { password } = req.body;
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Unauthorized: Invalid password." });
    }

    try {
        // Find a small batch of books that still have external http image links
        const booksToProcessResult = await client.execute({
            sql: "SELECT id, imageLinks FROM books WHERE json_extract(imageLinks, '$.thumbnail') LIKE 'http%' LIMIT ?",
            args: [BATCH_SIZE]
        });
        const booksToProcess = booksToProcessResult.rows;

        if (booksToProcess.length === 0) {
            return res.status(200).json({ message: "All book covers have already been migrated.", processedCount: 0, remainingCount: 0 });
        }
        
        let processedCount = 0;
        let logs = [];

        for (const book of booksToProcess) {
            const imageLinks = JSON.parse(book.imageLinks);
            const thumbnailUrl = imageLinks?.thumbnail;
            
            try {
                console.log(`Processing book ID: ${book.id}`);
                const response = await fetch(thumbnailUrl);
                if (response.ok) {
                    const imageBuffer = await response.arrayBuffer();
                    const webpBuffer = await sharp(Buffer.from(imageBuffer)).webp({ quality: 80 }).toBuffer();
                    
                    const blob = await put(`${book.id}.webp`, webpBuffer, {
                        access: 'public',
                        contentType: 'image/webp',
                    });

                    imageLinks.thumbnail = blob.url;

                    await client.execute({
                        sql: "UPDATE books SET imageLinks = ? WHERE id = ?",
                        args: [JSON.stringify(imageLinks), book.id]
                    });

                    processedCount++;
                    logs.push(`SUCCESS: Migrated cover for book ID: ${book.id}`);
                } else {
                     logs.push(`SKIPPED: Could not fetch image for book ID: ${book.id} (Status: ${response.status})`);
                }
            } catch (imgError) {
                logs.push(`ERROR: Failed to process image for book ID: ${book.id}`);
                console.error(`Failed to process image for book ${book.id}:`, imgError);
            }
        }
        
        // After processing, check how many are left
        const remainingResult = await client.execute("SELECT count(*) as count FROM books WHERE json_extract(imageLinks, '$.thumbnail') LIKE 'http%'");
        const remainingCount = remainingResult.rows[0].count;

        return res.status(200).json({ 
            message: `Processed a batch of ${booksToProcess.length} books.`,
            processedCount,
            remainingCount,
            logs
        });

    } catch (e) {
        console.error("Migration batch failed:", e);
        return res.status(500).json({ error: "An error occurred during the migration batch." });
    }
}

