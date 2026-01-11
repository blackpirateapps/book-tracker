export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const searchTerm = q.trim();
    // Check if the query looks like an OpenLibrary ID (e.g., OL123W)
    const isOLID = /^OL\d+[A-Z]$/i.test(searchTerm);
    
    const url = isOLID 
      ? `https://openlibrary.org/works/${searchTerm}.json`
      : `https://openlibrary.org/search.json?q=${encodeURIComponent(searchTerm)}&limit=10`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OpenLibrary API error: ${response.status}`);
    }

    const data = await response.json();
    let results = [];

    if (isOLID) {
      // Direct lookup returns a single object
      // We normalize it to look like a search result list
      if (data.key) { // Check if valid object returned
          results = [{
            key: data.key.replace('/works/', ''),
            title: data.title,
            author_name: ['Unknown'], // Direct lookup often links to author IDs, simpler to default here or do a 2nd fetch if critical
            first_publish_year: data.first_publish_date,
            cover_i: data.covers ? data.covers[0] : null
          }];
      }
    } else {
      // Search API returns a 'docs' array
      if (data.docs && Array.isArray(data.docs)) {
        results = data.docs.map(doc => ({
          key: doc.key.replace('/works/', ''),
          title: doc.title,
          author_name: doc.author_name || ['Unknown'],
          first_publish_year: doc.first_publish_year,
          cover_i: doc.cover_i
        }));
      }
    }

    // Cache search results briefly (e.g., 1 hour) to save external hits
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    
    return res.status(200).json(results);

  } catch (error) {
    console.error('Search proxy error:', error);
    return res.status(500).json({ error: 'Failed to fetch from OpenLibrary' });
  }
}