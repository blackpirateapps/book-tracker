import React from 'react';

const StatCard = ({ title, value, subtitle, icon, iconBg, index }) => {
  return (
    <div className={`stat-card animate-slide-in stagger-${index}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-gray-600 font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 ${iconBg} rounded-xl`}>
          {icon}
        </div>
      </div>
      {subtitle && (
        <p className="text-sm text-gray-600 font-medium">{subtitle}</p>
      )}
    </div>
  );
};

export default StatCard;