import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { exportData } from '../services/bookService';
import { showGlobalToast } from '../hooks/useToast';
import PasswordModal from '../components/PasswordModal';

const AdminPage = () => {
  const { isAuthenticated, password, authenticate } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(!isAuthenticated);
  const [isExporting, setIsExporting] = useState(false);
  
  const handlePasswordConfirm = (pwd, remember) => {
    authenticate(pwd, remember);
    setShowPasswordModal(false);
  };
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `book-library-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showGlobalToast('Data exported successfully', 'success');
    } catch (error) {
      showGlobalToast(error.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="min-h-screen">
      <nav className="glass-effect sticky top-0 z-50 shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-gray-900">Admin Tools</h1>
            <Link to="/" className="btn-secondary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAuthenticated ? (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Export Data</h2>
              <p className="text-gray-600 mb-4">Download all your book data as a JSON file</p>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? 'Exporting...' : 'Export Library Data'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
            <p className="text-gray-600 mb-4">Please authenticate to access admin tools</p>
            <button onClick={() => setShowPasswordModal(true)} className="btn-primary">
              Authenticate
            </button>
          </div>
        )}
      </main>
      
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handlePasswordConfirm}
      />
    </div>
  );
};

export default AdminPage;