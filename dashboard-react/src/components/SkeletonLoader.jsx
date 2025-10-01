import React from 'react';

const SkeletonLoader = () => {
  return (
    <div className="space-y-8">
      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3 skeleton-loader"></div>
            <div className="h-8 bg-gray-200 rounded w-16 skeleton-loader"></div>
          </div>
        ))}
      </div>
      
      {/* Books Skeleton */}
      {[1, 2].map(shelf => (
        <div key={shelf}>
          <div className="h-8 bg-gray-200 rounded w-48 mb-6 skeleton-loader"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(book => (
              <div key={book} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex space-x-4 mb-4">
                  <div className="w-24 h-32 bg-gray-200 rounded-lg skeleton-loader"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded skeleton-loader"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4 skeleton-loader"></div>
                  </div>
                </div>
                <div className="h-8 bg-gray-200 rounded skeleton-loader"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;