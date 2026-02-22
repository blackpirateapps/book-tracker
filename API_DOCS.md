# Book Tracker API Documentation

Base URL: `https://<your-vercel-domain>`

All responses are JSON. All `POST` requests require `Content-Type: application/json`.

---

## Authentication

All write operations (`POST` to `/api/books`) require the `ADMIN_PASSWORD` in the request body:

```json
{
  "password": "<ADMIN_PASSWORD>",
  "action": "...",
  "data": { ... }
}
```

An invalid or missing password returns `401 Unauthorized`.

---

## Endpoints Overview

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/public` | `GET` | No | Browse books, search, stats, highlights, tags |
| `/api/books` | `GET` | No | Get single book details or full list |
| `/api/books` | `POST` | Yes | All write operations (books, tags, highlights) |
| `/api/search` | `GET` | No | Search OpenLibrary for new books to add |

---

## `/api/public` — Public Read API

All actions are `GET` requests. Responses are cached for 10 seconds.

### List / Browse Books

```
GET /api/public?limit=20&offset=0
```

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | int | `20` | Number of books per page |
| `offset` | int | `0` | Pagination offset |

**Response:** Array of book objects (lightweight — only list-relevant fields).

```json
[
  {
    "id": "OL123W",
    "title": "Atomic Habits",
    "authors": "[\"James Clear\"]",
    "imageLinks": "{\"thumbnail\":\"https://...\"}",
    "shelf": "read",
    "readingMedium": "Paperback",
    "finishedOn": "2025-01-15",
    "tags": "[\"tag_123\"]",
    "readingProgress": 100
  }
]
```

> **Sorting:** `currentlyReading` → `abandoned` → all others (by `finishedOn` DESC, then `title` ASC).

### Search Books in Library

```
GET /api/public?q=atomic+habits&limit=20&offset=0
```

| Param | Type | Required | Description |
|---|---|---|---|
| `q` | string | Yes | Search query — matches title, authors, highlights, description |

**Response:** Same format as List/Browse, filtered by search query.

### Get Reading Statistics

```
GET /api/public?action=stats
```

**Response:**

```json
{
  "booksByYear": {
    "2025": [
      {
        "id": "OL123W",
        "title": "Atomic Habits",
        "authors": ["James Clear"],
        "imageLinks": { "thumbnail": "https://..." },
        "pageCount": 320,
        "finishedOn": "2025-01-15",
        "readingMedium": "Paperback"
      }
    ]
  },
  "authorStats": [
    { "name": "James Clear", "count": 1, "books": [{ "title": "Atomic Habits", "year": "2025" }] }
  ],
  "mediumStats": { "Paperback": 5, "Kindle": 3 },
  "totals": {
    "books": 42,
    "pages": 12500,
    "avgPerYear": "8.4"
  }
}
```

### Get a Random Highlight

```
GET /api/public?action=randomHighlight
```

**Response:**

```json
{
  "id": "OL123W",
  "title": "Atomic Habits",
  "authors": ["James Clear"],
  "highlight": "You do not rise to the level of your goals. You fall to the level of your systems."
}
```

Returns `null` if no highlights exist.

### Get All Tags

```
GET /api/public?action=tags
```

**Response:**

```json
[
  {
    "id": "tag_1706000000000",
    "name": "Favorites",
    "color": "purple",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

## `/api/books` — Book Details & Admin API

### GET — Retrieve Book Data

#### Get Single Book (Full Details)

```
GET /api/books?id=OL123W
```

**Response:** Full book row with all fields (see [Book Object Schema](#book-object-schema)).

Returns `404` if not found.

#### Get All Books (Admin List)

```
GET /api/books
```

**Response:** Array of all book rows (all fields, no pagination). Intended for admin/dashboard use.

#### Hugo Export (Full Payload)

```
GET /api/books?action=export-hugo
```

**Response:** A rich payload for static site generation:

```json
{
  "generatedAt": "2025-02-22T15:30:00.000Z",
  "books": [ /* full book objects with parsed JSON fields */ ],
  "tags": [ /* all tag objects */ ],
  "highlights": [
    {
      "bookId": "OL123W",
      "title": "Atomic Habits",
      "author": "James Clear",
      "highlight": "Every action you take is a vote for the person you wish to become.",
      "finishedOn": "2025-01-15"
    }
  ],
  "stats": {
    "totals": { "books": 42 },
    "booksByYear": { "2025": [ /* ... */ ] }
  }
}
```

---

### POST — Write Operations

All `POST` requests share this structure:

```json
{
  "password": "<ADMIN_PASSWORD>",
  "action": "<action_name>",
  "data": { /* action-specific payload */ }
}
```

---

#### `action: "add"` — Add a Book from OpenLibrary

Fetches book metadata from OpenLibrary, downloads and optimizes the cover image, and inserts the book into the database.

```json
{
  "password": "...",
  "action": "add",
  "data": {
    "olid": "OL82563W",
    "shelf": "currentlyReading"
  }
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `olid` | string | Yes | — | OpenLibrary Work ID (e.g. `OL82563W`) |
| `shelf` | string | No | `"watchlist"` | One of: `currentlyReading`, `read`, `watchlist`, `abandoned` |

**Response:**

```json
{
  "message": "Book added",
  "book": { /* full book object */ }
}
```

---

#### `action: "update"` — Update a Book

Update any fields on an existing book. Only the fields you include will be modified.

```json
{
  "password": "...",
  "action": "update",
  "data": {
    "id": "OL82563W",
    "shelf": "read",
    "finishedOn": "2025-02-22",
    "readingProgress": 100,
    "readingMedium": "Kindle"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Book ID to update |
| `originalId` | string | No | If renaming the book ID, provide the old ID here |
| `...fields` | any | — | Any book field(s) to update |

**Updatable fields:** `title`, `authors` (JSON array), `imageLinks` (JSON object), `pageCount`, `publishedDate`, `industryIdentifiers` (JSON array), `highlights` (JSON array of strings), `startedOn`, `finishedOn`, `readingMedium`, `shelf`, `hasHighlights` (0 or 1), `readingProgress` (0–100), `publisher`, `fullPublishDate`, `bookDescription`, `subjects` (JSON array), `tags` (JSON array of tag IDs).

**Response:**

```json
{ "message": "Updated", "rowsAffected": 1 }
```

---

#### `action: "delete"` — Delete a Book

```json
{
  "password": "...",
  "action": "delete",
  "data": { "id": "OL82563W" }
}
```

**Response:**

```json
{ "message": "Deleted" }
```

---

#### `action: "parse-highlights"` — Parse Highlight File Content

Parse raw Markdown or HTML highlight file content into structured data. Does not store anything — returns parsed results for preview.

```json
{
  "password": "...",
  "action": "parse-highlights",
  "data": {
    "fileContent": "---\ntitle: \"My Book\"\n---\n- Highlight one\n- Highlight two",
    "fileName": "highlights.md"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `fileContent` | string | Yes | Raw file content |
| `fileName` | string | Yes | Must end in `.md` or `.html` |

**Response:**

```json
{
  "title": "My Book",
  "highlights": ["Highlight one", "Highlight two"]
}
```

---

#### `action: "tag-create"` — Create a Tag

```json
{
  "password": "...",
  "action": "tag-create",
  "data": {
    "name": "Favorites",
    "color": "purple"
  }
}
```

**Response:**

```json
{ "message": "Tag created", "id": "tag_1706000000000" }
```

---

#### `action: "tag-update"` — Update a Tag

```json
{
  "password": "...",
  "action": "tag-update",
  "data": {
    "id": "tag_1706000000000",
    "name": "Top Picks",
    "color": "blue"
  }
}
```

**Response:**

```json
{ "message": "Tag updated" }
```

---

#### `action: "tag-delete"` — Delete a Tag

```json
{
  "password": "...",
  "action": "tag-delete",
  "data": { "id": "tag_1706000000000" }
}
```

**Response:**

```json
{ "message": "Tag deleted" }
```

---

#### `action: "tag-bulk-add"` — Add a Tag to Multiple Books

```json
{
  "password": "...",
  "action": "tag-bulk-add",
  "data": {
    "tagId": "tag_1706000000000",
    "bookIds": ["OL82563W", "OL12345W", "OL67890W"]
  }
}
```

**Response:**

```json
{ "message": "Tags added" }
```

> Idempotent: if a book already has the tag, it won't be duplicated.

---

## `/api/search` — OpenLibrary Search

Search for books on OpenLibrary to find their Work ID (`olid`) before adding them.

```
GET /api/search?q=atomic+habits
```

| Param | Type | Required | Description |
|---|---|---|---|
| `q` | string | Yes | Search query |

**Response:** Top 20 results.

```json
[
  {
    "key": "OL82563W",
    "title": "Atomic Habits",
    "author_name": ["James Clear"],
    "first_publish_year": 2018,
    "cover_i": 10431804
  }
]
```

> **Tip:** Use the `key` value as the `olid` when calling `action: "add"`.
> **Cover URL:** `https://covers.openlibrary.org/b/id/${cover_i}-M.jpg`

---

## Book Object Schema

| Field | Type | Description |
|---|---|---|
| `id` | string | OpenLibrary Work ID (primary key) |
| `title` | string | Book title |
| `authors` | JSON string | Array of author names, e.g. `["Author One"]` |
| `imageLinks` | JSON string | Object with `thumbnail` URL, e.g. `{"thumbnail":"https://..."}` |
| `pageCount` | int \| null | Number of pages |
| `publishedDate` | string \| null | First publish date |
| `fullPublishDate` | string \| null | Full publish date |
| `publisher` | string \| null | Publisher name |
| `industryIdentifiers` | JSON string | Array of identifiers (usually `[]`) |
| `highlights` | JSON string | Array of highlight strings |
| `startedOn` | string \| null | Date started reading (ISO format) |
| `finishedOn` | string \| null | Date finished reading (ISO format) |
| `readingMedium` | string | e.g. `"Kindle"`, `"Paperback"`, `"Not set"` |
| `shelf` | string | One of: `currentlyReading`, `read`, `watchlist`, `abandoned` |
| `hasHighlights` | int | `0` or `1` — whether the book has highlights |
| `readingProgress` | int | `0`–`100` — percentage read |
| `bookDescription` | string \| null | Book description/summary |
| `subjects` | JSON string | Array of subject strings |
| `tags` | JSON string | Array of tag IDs, e.g. `["tag_123"]` |

---

## Tag Object Schema

| Field | Type | Description |
|---|---|---|
| `id` | string | Auto-generated (`tag_<timestamp>`) |
| `name` | string | Tag display name |
| `color` | string | Color name (e.g. `blue`, `purple`, `green`, `red`) |
| `createdAt` | string | ISO timestamp |

---

## Error Responses

All errors follow this format:

```json
{ "error": "Description of the error" }
```

| Status | Meaning |
|---|---|
| `400` | Bad request (missing or invalid parameters) |
| `401` | Unauthorized (invalid admin password) |
| `404` | Resource not found |
| `405` | Method not allowed |
| `500` | Internal server error |

---

## Common Workflows

### Add a Book to "Currently Reading"

```bash
# 1. Search for the book
curl "https://your-domain/api/search?q=atomic+habits"

# 2. Add it using the olid from the search result
curl -X POST "https://your-domain/api/books" \
  -H "Content-Type: application/json" \
  -d '{"password":"your_pw","action":"add","data":{"olid":"OL82563W","shelf":"currentlyReading"}}'
```

### Mark a Book as Finished

```bash
curl -X POST "https://your-domain/api/books" \
  -H "Content-Type: application/json" \
  -d '{"password":"your_pw","action":"update","data":{"id":"OL82563W","shelf":"read","finishedOn":"2025-02-22","readingProgress":100}}'
```

### Upload Highlights to a Book

```bash
# 1. Parse the raw highlight content
curl -X POST "https://your-domain/api/books" \
  -H "Content-Type: application/json" \
  -d '{"password":"your_pw","action":"parse-highlights","data":{"fileContent":"- highlight 1\n- highlight 2","fileName":"h.md"}}'

# 2. Update the book with the parsed highlights array
curl -X POST "https://your-domain/api/books" \
  -H "Content-Type: application/json" \
  -d '{"password":"your_pw","action":"update","data":{"id":"OL82563W","highlights":["highlight 1","highlight 2"],"hasHighlights":1}}'
```

### Create and Assign a Tag

```bash
# 1. Create
curl -X POST "https://your-domain/api/books" \
  -H "Content-Type: application/json" \
  -d '{"password":"your_pw","action":"tag-create","data":{"name":"Favorites","color":"purple"}}'

# 2. Bulk assign to books
curl -X POST "https://your-domain/api/books" \
  -H "Content-Type: application/json" \
  -d '{"password":"your_pw","action":"tag-bulk-add","data":{"tagId":"tag_123","bookIds":["OL82563W","OL12345W"]}}'
```

### Paginated Browsing

```bash
# Page 1
curl "https://your-domain/api/public?limit=20&offset=0"

# Page 2
curl "https://your-domain/api/public?limit=20&offset=20"
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `TURSO_DATABASE_URL` | Turso/LibSQL database URL |
| `TURSO_AUTH_TOKEN` | Turso authentication token |
| `ADMIN_PASSWORD` | Password for all write operations |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token (for cover images) |
