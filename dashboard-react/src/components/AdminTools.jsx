import React, { useState } from 'react';
import { exportData } from '../services/bookService';
import { showGlobalToast } from '../hooks/useToast';

const AdminTools = ({ password }) => {
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportData(password);
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
    <div className="space-y-6">
      <div className="shelf-section">
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
  );
};

export default AdminTools;