import { useState } from 'react';

/**
 * Session Storage Hook
 * TODO: sessionStorage wrapper (NOT localStorage)
 */
export const useSessionStorage = <T,>(
  key: string,
  initialValue: T
): [T, (value: T) => void] => {
  // Get initial value from sessionStorage or use provided initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from sessionStorage:', error);
      return initialValue;
    }
  });

  // Update sessionStorage when value changes
  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to sessionStorage:', error);
    }
  };

  return [storedValue, setValue];
};
