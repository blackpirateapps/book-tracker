import React, { useState } from 'react';
import { parseHighlights } from '../services/bookService';
import { showGlobalToast } from '../hooks/useToast';

const HighlightsManager = ({ book, onUpdate, password }) => {
  const [markdownText, setMarkdownText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleImport = async () => {
    if (!markdownText.trim()) {
      showGlobalToast('Please paste some markdown text', 'error');
      return;
    }
    
    if (!password) {
      showGlobalToast('Authentication required', 'error');
      return;
    }
    
    setIsProcessing(true);
    try {
      const result = await parseHighlights(markdownText, password);
      
      if (result.highlights && result.highlights.length > 0) {
        const updatedBook = {
          ...book,
          highlights: result.highlights,
          hasHighlights: 1
        };
        
        await onUpdate(updatedBook);
        setMarkdownText('');
        showGlobalToast(`Imported ${result.highlights.length} highlights`, 'success');
      }
    } catch (error) {
      showGlobalToast(error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-100">Import Highlights</h3>
      <p className="text-sm text-gray-400">
        Paste your highlights in Markdown format. Each item in a list (- item) will become a separate highlight.
      </p>
      
      <textarea
        value={markdownText}
        onChange={(e) => setMarkdownText(e.target.value)}
        className="w-full h-48 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500 font-mono text-sm"
        placeholder="- Your first highlight&#10;- Your second highlight&#10;- Your third highlight"
      />
      
      <button
        onClick={handleImport}
        disabled={isProcessing}
        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? 'Processing...' : 'Import Highlights'}
      </button>
      
      {book.highlights && book.highlights.length > 0 && (
        <div className="mt-6">
          <h4 className="text-lg font-semibold text-gray-100 mb-3">
            Current Highlights ({book.highlights.length})
          </h4>
          <div className="space-y-2">
            {book.highlights.map((highlight, index) => (
              <div key={index} className="bg-gray-700 p-3 rounded-lg text-gray-200">
                {highlight}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HighlightsManager;