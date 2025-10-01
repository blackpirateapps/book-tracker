import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import BookDetailsPage from './pages/BookDetailsPage';
import TagsManager from './pages/TagsManager';
import AdminPage from './pages/AdminPage';
import AllReadBooks from './pages/AllReadBooks';
import AllWatchlistBooks from './pages/AllWatchlistBooks';
import Toast from './components/Toast';

function App() {
  return (
    <div className="min-h-screen">
      <Toast />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/details/:bookId" element={<BookDetailsPage />} />
        <Route path="/tags" element={<TagsManager />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/all-read" element={<AllReadBooks />} />
        <Route path="/all-watchlist" element={<AllWatchlistBooks />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;