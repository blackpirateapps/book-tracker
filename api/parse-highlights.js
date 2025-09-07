// This API endpoint is dedicated to parsing uploaded highlight files.
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed. Use POST." });
    }

    // Note: We are not checking for the admin password here because this endpoint
    // only processes data and does not interact with the database. It's a safe, stateless utility.
    const { fileContent, fileName } = req.body;

    if (!fileContent || !fileName) {
        return res.status(400).json({ error: "Missing file content or name." });
    }

    try {
        let parsedData;
        if (fileName.endsWith('.md')) {
            parsedData = parseMDHighlights(fileContent);
        } else if (fileName.endsWith('.html')) {
            // We need a way to parse HTML on the server. A simple regex approach is sufficient here
            // without needing a full DOM parser library like jsdom.
            parsedData = parseHTMLHighlights(fileContent);
        } else {
            return res.status(400).json({ error: "Unsupported file type." });
        }
        
        return res.status(200).json(parsedData);

    } catch (e) {
        console.error("Parsing failed:", e);
        return res.status(500).json({ error: "An error occurred while parsing the file." });
    }
}

// --- Parsing Functions (moved from admin.js) ---

function parseMDHighlights(mdContent) {
    const highlights = [];
    let title = 'Unknown Title';
    const frontmatterMatch = mdContent.match(/---\s*title:\s*"(.*?)"\s*---/);
    if (frontmatterMatch && frontmatterMatch[1]) {
        title = frontmatterMatch[1];
    }
    const lines = mdContent.split('\n');
    for (const line of lines) {
        if (line.trim().startsWith('- ')) {
            const highlightText = line.trim().substring(2).replace(/\s*\(location.*?\)\s*$/, '').trim();
            if (highlightText) {
                highlights.push(highlightText);
            }
        }
    }
    return { title, highlights };
}

function parseHTMLHighlights(htmlContent) {
    // A simple server-side regex approach to avoid heavy DOM libraries
    const titleMatch = htmlContent.match(/<div class="bookTitle">([^<]+)<\/div>/);
    const title = titleMatch ? titleMatch[1].trim() : 'Unknown Title';
    
    const highlights = [];
    const highlightRegex = /<div class="noteText">([^<]+)<\/div>/g;
    let match;
    while ((match = highlightRegex.exec(htmlContent)) !== null) {
        highlights.push(match[1].trim());
    }
    
    return { title, highlights };
}
