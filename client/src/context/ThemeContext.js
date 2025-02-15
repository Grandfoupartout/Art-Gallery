import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const theme = {
    isDarkMode,
    colors: isDarkMode ? {
      // Dark theme colors
      background: '#1a1a1a',
      surface: '#2d2d2d',
      primary: '#3498db',
      text: '#ffffff',
      textSecondary: '#b3b3b3',
      border: '#404040',
      hover: '#3d3d3d',
      success: '#2ecc71',
      danger: '#e74c3c',
      warning: '#f1c40f',
      input: '#333333',
      tableHeader: '#252525',
      tableRow: '#2d2d2d',
      tableRowAlt: '#333333',
      tableRowHover: '#3d3d3d'
    } : {
      // Light theme colors
      background: '#f5f5f5',
      surface: '#ffffff',
      primary: '#3498db',
      text: '#333333',
      textSecondary: '#666666',
      border: '#dddddd',
      hover: '#f8f9fa',
      success: '#4CAF50',
      danger: '#f44336',
      warning: '#ff9800',
      input: '#ffffff',
      tableHeader: '#f8f9fa',
      tableRow: '#ffffff',
      tableRowAlt: '#f8f9fa',
      tableRowHover: '#f5f5f5'
    }
  };

  // Apply theme to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const colors = theme.colors;
    
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext); 