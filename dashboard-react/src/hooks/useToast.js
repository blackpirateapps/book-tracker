import { useState, useCallback, useEffect } from 'react';

let toastCounter = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState([]);
  
  const showToast = useCallback((message, type = 'success') => {
    const id = toastCounter++;
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);
  
  return { toasts, showToast };
};

// Global toast state
let globalToastHandler = null;

export const setGlobalToastHandler = (handler) => {
  globalToastHandler = handler;
};

export const showGlobalToast = (message, type = 'success') => {
  if (globalToastHandler) {
    globalToastHandler(message, type);
  }
};