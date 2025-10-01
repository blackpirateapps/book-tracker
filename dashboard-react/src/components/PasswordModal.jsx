import React, { useState, useEffect } from 'react';

const PasswordModal = ({ isOpen, onClose, onConfirm, message = 'This action requires authentication.' }) => {
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setRemember(false);
    }
  }, [isOpen]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (password) {
      onConfirm(password, remember);
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Enter Admin Password</h2>
        <p className="text-gray-600 mb-4">{message}</p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field mb-4"
            placeholder="Enter password"
            autoFocus
          />
          
          <label className="flex items-center space-x-2 mb-4 text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded text-purple-600"
            />
            <span>Remember for 30 days</span>
          </label>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordModal;