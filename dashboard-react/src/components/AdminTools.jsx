import React, { useState } from 'react';
import { exportData } from '../services/bookService';
import { showGlobalToast } from '../hooks/useToast';

const AdminTools = ({ password }) => {
  const [olidInput, setOlidInput] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExport = async () => {
    if (!password) {
      showGlobalToast('Authentication required', 'error');
      return;
    }
    
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
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-100 mb-4">Export Data</h2>
        <p className="text-gray-400 mb-4">Download all your book data as a JSON file</p>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? 'Exporting...' : 'Export Library Data'}
        </button>
      </div>
      
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-100 mb-4">Bulk Import via OLID</h2>
        <p className="text-gray-400 mb-4">Enter OpenLibrary Work IDs (one per line)</p>
        <textarea
          value={olidInput}
          onChange={(e) => setOlidInput(e.target.value)}
          className="w-full h-32 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500 font-mono text-sm"
          placeholder="OL45804W&#10;OL45883W"
        />
        <button className="btn-primary mt-4">
          Import Books
        </button>
      </div>
    </div>
  );
};

export default AdminTools;