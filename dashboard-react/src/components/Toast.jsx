import React, { useEffect } from 'react';
import { useToast, setGlobalToastHandler } from '../hooks/useToast';

const Toast = () => {
  const { toasts, showToast } = useToast();
  
  useEffect(() => {
    setGlobalToastHandler(showToast);
  }, [showToast]);
  
  return (
    <div className="fixed bottom-5 right-5 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`py-3 px-5 rounded-xl shadow-xl transition-all duration-300 text-white ${
            toast.type === 'success' ? 'bg-gray-900' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};

export default Toast;