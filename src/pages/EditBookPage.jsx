import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

const arrayToString = (data, joiner = ', ') => {
  if (data === null || data === undefined) return '';
  if (Array.isArray(data)) return data.join(joiner);
  return String(data);
};

const stringToArray = (str, separator = ',') => (
  str ? str.split(separator).map(s => s.trim()).filter(Boolean) : []
);

const parseJsonMaybe = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch (e) { return value; }
  }
  return value;
};

const normalizeBook = (book) => {
  const authors = parseJsonMaybe(book.authors);
  const imageLinks = parseJsonMaybe(book.imageLinks) || {};
  const industryIdentifiers = parseJsonMaybe(book.industryIdentifiers) || [];
  const highlights = parseJsonMaybe(book.highlights) || [];
  const subjects = parseJsonMaybe(book.subjects) || [];
  const tags = parseJsonMaybe(book.tags) || [];

  return {
    originalId: book.id || '',
    id: book.id || '',
    title: book.title || '',
    authorsInput: arrayToString(Array.isArray(authors) ? authors : [authors].filter(Boolean)),
    imageLinksInput: JSON.stringify(imageLinks, null, 2),
    pageCount: book.pageCount ?? '',
    publishedDate: book.publishedDate || '',
    industryIdentifiersInput: JSON.stringify(industryIdentifiers, null, 2),
    highlightsInput: arrayToString(Array.isArray(highlights) ? highlights : [], '\n'),
    startedOn: book.startedOn || '',
    finishedOn: book.finishedOn || '',
    readingMedium: book.readingMedium || '',
    shelf: book.shelf || 'watchlist',
    hasHighlights: String(book.hasHighlights ?? 0),
    readingProgress: book.readingProgress ?? 0,
    publisher: book.publisher || '',
    fullPublishDate: book.fullPublishDate || '',
    bookDescription: book.bookDescription || '',
    subjectsInput: arrayToString(Array.isArray(subjects) ? subjects : [], ', '),
    tagsInput: arrayToString(Array.isArray(tags) ? tags : [], ', ')
  };
};

const EditBookPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialBook = location.state?.book || null;
  const initialPassword = location.state?.password || '';

  const [password, setPassword] = useState(initialPassword);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialBook ? normalizeBook(initialBook) : null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/highlights?id=${id}`);
        if (!res.ok) throw new Error('Book not found.');
        const data = await res.json();
        setForm(normalizeBook(data));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const canSave = useMemo(() => !!password && !!form?.id, [password, form]);

  const handleJsonField = (value, fieldName, fallback) => {
    try {
      if (!value) return fallback;
      return JSON.parse(value);
    } catch (e) {
      throw new Error(`Invalid JSON in ${fieldName}.`);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const imageLinks = handleJsonField(form.imageLinksInput, 'Image Links', {});
      const industryIdentifiers = handleJsonField(form.industryIdentifiersInput, 'Industry Identifiers', []);

      const updated = {
        originalId: form.originalId,
        id: form.id,
        title: form.title || null,
        authors: stringToArray(form.authorsInput),
        imageLinks,
        pageCount: form.pageCount === '' ? null : Number(form.pageCount),
        publishedDate: form.publishedDate || null,
        industryIdentifiers,
        highlights: stringToArray(form.highlightsInput, '\n'),
        startedOn: form.startedOn || null,
        finishedOn: form.finishedOn || null,
        readingMedium: form.readingMedium || null,
        shelf: form.shelf || 'watchlist',
        hasHighlights: Number(form.hasHighlights) || 0,
        readingProgress: form.readingProgress === '' ? 0 : Number(form.readingProgress),
        publisher: form.publisher || null,
        fullPublishDate: form.fullPublishDate || null,
        bookDescription: form.bookDescription || null,
        subjects: stringToArray(form.subjectsInput),
        tags: stringToArray(form.tagsInput)
      };

      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'update', data: updated })
      });

      const payload = await res.json().catch(() => ({}));
      console.log('[DEBUG] handleSave response:', payload);

      if (!res.ok) {
        throw new Error(payload.error || 'Failed to save changes.');
      }

      setSuccessMsg(`Saved changes. (Rows affected: ${payload.rowsAffected ?? '?'})`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !form) return <div className="p-4 italic">Loading edit form...</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-gray-200 border-b border-gray-400 p-2 flex justify-between items-center">
        <h2 className="font-bold text-lg">EDIT BOOK</h2>
        <button onClick={() => navigate(-1)} className="underline text-blue-800 text-sm">Back</button>
      </div>

      <div className="border border-black p-3 bg-gray-50 text-xs">
        <div className="font-bold mb-2">ADMIN PASSWORD</div>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border border-gray-400 p-1"
          placeholder="Required to save"
        />
      </div>

      {error && <div className="text-red-700 text-sm font-bold">{error}</div>}
      {successMsg && <div className="text-green-700 text-sm font-bold">{successMsg}</div>}

      {form && (
        <form onSubmit={handleSave} className="border border-black p-4 bg-white text-xs space-y-3">
          <div>
            <div className="font-bold mb-1">ID</div>
            <input type="text" value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} className="w-full border border-gray-400 p-1" />
          </div>

          <div>
            <div className="font-bold mb-1">Title</div>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-400 p-1" />
          </div>

          <div>
            <div className="font-bold mb-1">Authors (comma separated)</div>
            <input type="text" value={form.authorsInput} onChange={e => setForm({ ...form, authorsInput: e.target.value })} className="w-full border border-gray-400 p-1" />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="font-bold mb-1">Shelf</div>
              <select value={form.shelf} onChange={e => setForm({ ...form, shelf: e.target.value })} className="w-full border border-gray-400 p-1">
                <option value="watchlist">Watchlist</option>
                <option value="currentlyReading">Reading</option>
                <option value="read">Finished</option>
                <option value="abandoned">Abandoned</option>
              </select>
            </div>
            <div>
              <div className="font-bold mb-1">Reading Medium</div>
              <input type="text" value={form.readingMedium} onChange={e => setForm({ ...form, readingMedium: e.target.value })} className="w-full border border-gray-400 p-1" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="font-bold mb-1">Reading Progress (%)</div>
              <input type="number" value={form.readingProgress} onChange={e => setForm({ ...form, readingProgress: e.target.value })} className="w-full border border-gray-400 p-1" />
            </div>
            <div>
              <div className="font-bold mb-1">Has Highlights (0/1)</div>
              <input type="number" value={form.hasHighlights} onChange={e => setForm({ ...form, hasHighlights: e.target.value })} className="w-full border border-gray-400 p-1" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="font-bold mb-1">Started On</div>
              <input type="date" value={form.startedOn} onChange={e => setForm({ ...form, startedOn: e.target.value })} className="w-full border border-gray-400 p-1" />
            </div>
            <div>
              <div className="font-bold mb-1">Finished On</div>
              <input type="date" value={form.finishedOn} onChange={e => setForm({ ...form, finishedOn: e.target.value })} className="w-full border border-gray-400 p-1" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="font-bold mb-1">Published Date</div>
              <input type="text" value={form.publishedDate} onChange={e => setForm({ ...form, publishedDate: e.target.value })} className="w-full border border-gray-400 p-1" />
            </div>
            <div>
              <div className="font-bold mb-1">Full Publish Date</div>
              <input type="text" value={form.fullPublishDate} onChange={e => setForm({ ...form, fullPublishDate: e.target.value })} className="w-full border border-gray-400 p-1" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="font-bold mb-1">Publisher</div>
              <input type="text" value={form.publisher} onChange={e => setForm({ ...form, publisher: e.target.value })} className="w-full border border-gray-400 p-1" />
            </div>
            <div>
              <div className="font-bold mb-1">Page Count</div>
              <input type="number" value={form.pageCount} onChange={e => setForm({ ...form, pageCount: e.target.value })} className="w-full border border-gray-400 p-1" />
            </div>
          </div>

          <div>
            <div className="font-bold mb-1">Book Description</div>
            <textarea value={form.bookDescription} onChange={e => setForm({ ...form, bookDescription: e.target.value })} className="w-full border border-gray-400 p-2 h-32" />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="font-bold mb-1">Subjects (comma separated)</div>
              <input type="text" value={form.subjectsInput} onChange={e => setForm({ ...form, subjectsInput: e.target.value })} className="w-full border border-gray-400 p-1" />
            </div>
            <div>
              <div className="font-bold mb-1">Tags (comma separated IDs)</div>
              <input type="text" value={form.tagsInput} onChange={e => setForm({ ...form, tagsInput: e.target.value })} className="w-full border border-gray-400 p-1" />
            </div>
          </div>

          <div>
            <div className="font-bold mb-1">Highlights (one per line)</div>
            <textarea value={form.highlightsInput} onChange={e => setForm({ ...form, highlightsInput: e.target.value })} className="w-full border border-gray-400 p-2 h-32" />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="font-bold mb-1">Image Links (JSON)</div>
              <textarea value={form.imageLinksInput} onChange={e => setForm({ ...form, imageLinksInput: e.target.value })} className="w-full border border-gray-400 p-2 h-32 font-mono text-[11px]" />
            </div>
            <div>
              <div className="font-bold mb-1">Industry Identifiers (JSON)</div>
              <textarea value={form.industryIdentifiersInput} onChange={e => setForm({ ...form, industryIdentifiersInput: e.target.value })} className="w-full border border-gray-400 p-2 h-32 font-mono text-[11px]" />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={() => navigate(-1)} className="border border-black px-3 py-1 bg-gray-200">Cancel</button>
            <button type="submit" disabled={!canSave || saving} className="border border-black px-3 py-1 bg-black text-white">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default EditBookPage;
