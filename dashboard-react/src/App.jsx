import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import BookDetailsPage from './pages/BookDetailsPage';
import AdminPage from './pages/AdminPage';
import Toast from './components/Toast';

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Toast />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/details/:bookId" element={<BookDetailsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;