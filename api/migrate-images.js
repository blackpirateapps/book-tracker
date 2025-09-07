import { createClient } from '@libsql/client';
import { put } from '@vercel/blob';
import sharp from 'sharp';

// --- DATABASE CLIENT SETUP ---
const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

// --- API HANDLER FOR MIGRATION ---
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed. Use POST." });
    }

    const { password } = req.body;
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Unauthorized: Invalid password." });
    }

    try {
        // 1. Fetch all books from the database
        const result = await client.execute("SELECT id, imageLinks FROM books");
        const books = result.rows;
        let processedCount = 0;

        // 2. Loop through each book to check its image link
        for (const book of books) {
            let imageLinks;
            try {
                imageLinks = JSON.parse(book.imageLinks);
            } catch {
                continue; // Skip if imageLinks is not valid JSON
            }
            
            const thumbnailUrl = imageLinks?.thumbnail;

            // 3. Process only if the thumbnail is an external HTTP URL
            if (thumbnailUrl && thumbnailUrl.startsWith('http')) {
                console.log(`Processing book ID: ${book.id}`);
                try {
                    const response = await fetch(thumbnailUrl);
                    if (response.ok) {
                        const imageBuffer = await response.arrayBuffer();
                        const webpBuffer = await sharp(Buffer.from(imageBuffer)).webp({ quality: 80 }).toBuffer();
                        
                        const blob = await put(`${book.id}.webp`, webpBuffer, {
                            access: 'public',
                            contentType: 'image/webp',
                        });

                        // Update imageLinks with the new Vercel Blob URL
                        imageLinks.thumbnail = blob.url;

                        // 4. Update the book record in the database
                        await client.execute({
                            sql: "UPDATE books SET imageLinks = ? WHERE id = ?",
                            args: [JSON.stringify(imageLinks), book.id]
                        });

                        processedCount++;
                        console.log(`Successfully migrated cover for book ID: ${book.id}`);
                    }
                } catch (imgError) {
                    console.error(`Failed to process image for book ${book.id}:`, imgError);
                }
            }
        }

        return res.status(200).json({ message: `Migration complete. Processed ${processedCount} book covers.` });

    } catch (e) {
        console.error("Migration failed:", e);
        return res.status(500).json({ error: "An error occurred during the migration process." });
    }
}
```

### 🚀 Actions Required for Deployment and Migration

1.  **Link Your Blob Store:** In your project's dashboard on Vercel, go to the "Storage" tab and create a new Blob Store. Follow the instructions to link it to your project. Vercel will automatically set the required environment variables.

2.  **Redeploy:** Push the updated `package.json` and the two API files (`api/books.js` and `api/migrate-images.js`) to your Git repository to trigger a new deployment on Vercel.

3.  **(One-Time) Run the Migration:** After the deployment is successful, you need to run the migration script once. You can do this using a simple command line tool like `curl` or a GUI tool like Postman.

    **Using Curl in your terminal:**
    ```bash
    curl -X POST https://your-vercel-project-url.vercel.app/api/migrate-images \
    -H "Content-Type: application/json" \
    -d '{"password": "YOUR_ADMIN_PASSWORD"}'
    
