import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PasswordModal from '../components/PasswordModal';
import AdminTools from '../components/AdminTools';

const AdminPage = () => {
  const { isAuthenticated, password, authenticate } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(!isAuthenticated);
  
  const handlePasswordConfirm = (pwd, remember) => {
    authenticate(pwd, remember);
    setShowPasswordModal(false);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-100">Admin Tools</h1>
          <Link to="/" className="btn-secondary">
            Back to Dashboard
          </Link>
        </div>
        
        {isAuthenticated ? (
          <AdminTools password={password} />
        ) : (
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <p className="text-gray-400 mb-4">Please authenticate to access admin tools</p>
            <button onClick={() => setShowPasswordModal(true)} className="btn-primary">
              Authenticate
            </button>
          </div>
        )}
      </div>
      
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handlePasswordConfirm}
      />
    </div>
  );
};

export default AdminPage;