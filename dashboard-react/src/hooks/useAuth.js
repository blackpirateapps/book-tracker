import { useState, useCallback, useEffect } from 'react';
import { getPassword, setPassword, clearPassword } from '../services/bookService';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPasswordState] = useState(null);
  
  useEffect(() => {
    const pwd = getPassword();
    if (pwd) {
      setPasswordState(pwd);
      setIsAuthenticated(true);
    }
  }, []);
  
  const authenticate = useCallback((pwd, remember = false) => {
    setPasswordState(pwd);
    setIsAuthenticated(true);
    if (remember) {
      setPassword(pwd, 30);
    }
  }, []);
  
  const logout = useCallback(() => {
    clearPassword();
    setPasswordState(null);
    setIsAuthenticated(false);
  }, []);
  
  return { isAuthenticated, password, authenticate, logout };
};