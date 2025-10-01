import React from 'react';

const SkeletonLoader = () => {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map(shelf => (
        <div key={shelf} className="bg-gray-800 rounded-lg p-6">
          <div className="h-8 bg-gray-700 rounded w-48 mb-4 animate-pulse"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(book => (
              <div key={book} className="flex items-center space-x-4">
                <div className="w-20 h-28 bg-gray-700 rounded animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-3/4 animate-pulse"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;