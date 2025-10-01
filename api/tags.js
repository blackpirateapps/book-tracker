import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    try {
      const result = await client.execute('SELECT * FROM tags ORDER BY name ASC');
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching tags:', error);
      return res.status(500).json({ error: 'Failed to fetch tags' });
    }
  }
  
  if (req.method === 'POST') {
    const { password, action, data } = req.body;
    
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    try {
      switch (action) {
        case 'create':
          const { name, color } = data;
          const id = `tag_${Date.now()}`;
          await client.execute({
            sql: 'INSERT INTO tags (id, name, color, createdAt) VALUES (?, ?, ?, ?)',
            args: [id, name, color, new Date().toISOString()]
          });
          return res.status(200).json({ message: 'Tag created', id });
          
        case 'update':
          await client.execute({
            sql: 'UPDATE tags SET name = ?, color = ? WHERE id = ?',
            args: [data.name, data.color, data.id]
          });
          return res.status(200).json({ message: 'Tag updated' });
          
        case 'delete':
          await client.execute({
            sql: 'DELETE FROM tags WHERE id = ?',
            args: [data.id]
          });
          return res.status(200).json({ message: 'Tag deleted' });
          
        case 'bulkAddToBooks':
          const { tagId, bookIds } = data;
          for (const bookId of bookIds) {
            const result = await client.execute({
              sql: 'SELECT tags FROM books WHERE id = ?',
              args: [bookId]
            });
            
            if (result.rows.length > 0) {
              let tags = [];
              try {
                tags = JSON.parse(result.rows[0].tags || '[]');
              } catch (e) {}
              
              if (!tags.includes(tagId)) {
                tags.push(tagId);
                await client.execute({
                  sql: 'UPDATE books SET tags = ? WHERE id = ?',
                  args: [JSON.stringify(tags), bookId]
                });
              }
            }
          }
          return res.status(200).json({ message: 'Tags added to books' });
          
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Operation failed' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}