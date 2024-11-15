// src/context/ThemeContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

const themes = {
    light: {
      '@primary-color': '#1890ff',
      '@background-color': '#ffffff',
      '@text-color': '#333333'
    },
    dark: {
      '@primary-color': '#177ddc',
      '@background-color': '#141414',
      '@text-color': '#ffffff'
    }
  };
export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');

  const switchTheme = async (newTheme) => {
    console.log(newTheme,"newTheme")
   
      try {
        document.documentElement.setAttribute('data-theme', newTheme);

        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
      } catch (error) {
        console.error('Failed to change theme:', error);
      }
    
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    switchTheme(savedTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, switchTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};