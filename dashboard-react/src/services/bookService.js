import Cookies from 'js-cookie';
import { API_ENDPOINT, PARSE_API_ENDPOINT, DETAILS_API_ENDPOINT, PWD_COOKIE } from '../utils/constants';

export const fetchBooks = async () => {
  const response = await fetch(API_ENDPOINT);
  if (!response.ok) throw new Error('Failed to fetch books');
  return response.json();
};

export const fetchBookDetails = async (bookId) => {
  const response = await fetch(`${DETAILS_API_ENDPOINT}?id=${bookId}`);
  if (!response.ok) throw new Error('Failed to fetch book details');
  return response.json();
};

export const performAuthenticatedAction = async (payload, password, endpoint = API_ENDPOINT) => {
  if (!password) {
    throw new Error('Password cannot be empty');
  }
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, password })
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || 'An unknown error occurred');
  }
  
  return result;
};

export const addBook = async (bookData, password) => {
  return performAuthenticatedAction({ action: 'add', ...bookData }, password);
};

export const updateBook = async (bookData, password) => {
  return performAuthenticatedAction({ action: 'update', ...bookData }, password);
};

export const deleteBook = async (bookId, password) => {
  return performAuthenticatedAction({ action: 'delete', id: bookId }, password);
};

export const exportData = async (password) => {
  return performAuthenticatedAction({ action: 'export' }, password);
};

export const parseHighlights = async (markdownText, password) => {
  return performAuthenticatedAction({ markdownText }, password, PARSE_API_ENDPOINT);
};

export const searchOpenLibrary = async (query) => {
  const response = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5&fields=key,title,author_name,cover_i,edition_key,first_publish_year`
  );
  if (!response.ok) throw new Error('Search failed');
  return response.json();
};

export const getPassword = () => Cookies.get(PWD_COOKIE);

export const setPassword = (password, days = 30) => {
  Cookies.set(PWD_COOKIE, password, { expires: days, path: '/dashboard', sameSite: 'Lax', secure: true });
};

export const clearPassword = () => {
  Cookies.remove(PWD_COOKIE, { path: '/dashboard' });
};