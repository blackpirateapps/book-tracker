import { createClient } from '@libsql/client';

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });

    try {
        const resOL = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}`);
        const data = await resOL.json();
        const results = data.docs.slice(0, 20).map(doc => ({
            key: doc.key.replace('/works/', ''),
            title: doc.title,
            author_name: doc.author_name,
            first_publish_year: doc.first_publish_year,
            cover_i: doc.cover_i
        }));

        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
        return res.status(200).json(results);
    } catch (e) {
        console.error("Search Error:", e);
        return res.status(500).json({ error: 'Search failed' });
    }
}
