import React, { useState, useEffect } from 'react';
import { READING_MEDIUMS } from '../utils/constants';

const EditBookModal = ({ isOpen, onClose, book, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    authors: '',
    imageUrl: '',
    readingProgress: 0,
    readingMedium: 'Not set',
    startedOn: '',
    finishedOn: ''
  });
  
  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title || '',
        authors: book.authors ? book.authors.join(', ') : '',
        imageUrl: book.imageLinks?.thumbnail || '',
        readingProgress: book.readingProgress || 0,
        readingMedium: book.readingMedium || 'Not set',
        startedOn: book.startedOn || '',
        finishedOn: book.finishedOn || ''
      });
    }
  }, [book]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...book,
      title: formData.title,
      authors: formData.authors.split(',').map(a => a.trim()).filter(Boolean),
      imageLinks: { thumbnail: formData.imageUrl },
      readingProgress: parseInt(formData.readingProgress),
      readingMedium: formData.readingMedium,
      startedOn: formData.startedOn,
      finishedOn: formData.finishedOn
    });
    onClose();
  };
  
  if (!isOpen || !book) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-gray-100">Edit Book</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Authors (comma-separated)
            </label>
            <input
              type="text"
              name="authors"
              value={formData.authors}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Cover Image URL</label>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Reading Progress: {formData.readingProgress}%
            </label>
            <input
              type="range"
              name="readingProgress"
              value={formData.readingProgress}
              onChange={handleChange}
              min="0"
              max="100"
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Medium</label>
            <select
              name="readingMedium"
              value={formData.readingMedium}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
            >
              {READING_MEDIUMS.map(medium => (
                <option key={medium} value={medium}>{medium}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Started On</label>
            <input
              type="date"
              name="startedOn"
              value={formData.startedOn}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Finished On</label>
            <input
              type="date"
              name="finishedOn"
              value={formData.finishedOn}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBookModal;