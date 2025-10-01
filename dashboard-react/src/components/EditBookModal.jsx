import React, { useState, useEffect } from 'react';
import { READING_MEDIUMS } from '../utils/constants';

const EditBookModal = ({ isOpen, onClose, book, tags, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    authors: '',
    imageUrl: '',
    readingProgress: 0,
    readingMedium: 'Not set',
    startedOn: '',
    finishedOn: '',
    shelf: 'watchlist',
    tags: []
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
        finishedOn: book.finishedOn || '',
        shelf: book.shelf || 'watchlist',
        tags: book.tags || []
      });
    }
  }, [book]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleTagToggle = (tagId) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(id => id !== tagId)
        : [...prev.tags, tagId]
    }));
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
      finishedOn: formData.finishedOn,
      shelf: formData.shelf,
      tags: formData.tags
    });
  };
  
  if (!isOpen || !book) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Edit Book</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Authors (comma-separated)
              </label>
              <input
                type="text"
                name="authors"
                value={formData.authors}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shelf</label>
              <select
                name="shelf"
                value={formData.shelf}
                onChange={handleChange}
                className="input-field"
              >
                <option value="watchlist">Watchlist</option>
                <option value="currentlyReading">Currently Reading</option>
                <option value="read">Read</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medium</label>
              <select
                name="readingMedium"
                value={formData.readingMedium}
                onChange={handleChange}
                className="input-field"
              >
                {READING_MEDIUMS.map(medium => (
                  <option key={medium} value={medium}>{medium}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reading Progress: {formData.readingProgress}%
              </label>
              <input
                type="range"
                name="readingProgress"
                value={formData.readingProgress}
                onChange={handleChange}
                min="0"
                max="100"
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Started On</label>
              <input
                type="date"
                name="startedOn"
                value={formData.startedOn}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Finished On</label>
              <input
                type="date"
                name="finishedOn"
                value={formData.finishedOn}
                onChange={handleChange}
                className="input-field"
              />
            </div>
          </div>
          
          {tags && tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      formData.tags.includes(tag.id)
                        ? 'ring-2 ring-offset-2'
                        : 'opacity-60'
                    }`}
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                      ringColor: tag.color
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBookModal;