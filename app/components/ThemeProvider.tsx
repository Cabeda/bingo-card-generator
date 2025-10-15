'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CardTheme } from '../utils/bingo.interface';
import { createCustomTheme, isValidTheme, PRESET_THEMES } from '../utils/themes';

interface ThemeContextType {
  currentTheme: CardTheme;
  selectedThemeKey: string;
  customThemes: Record<string, CardTheme>;
  setTheme: (key: string) => void;
  setCustomTheme: (theme: CardTheme) => void;
  deleteCustomTheme: (key: string) => void;
  exportTheme: (theme: CardTheme) => string;
  importTheme: (jsonString: string) => boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'bingoCardThemes';
const SELECTED_THEME_KEY = 'selectedBingoTheme';

/**
 * ThemeProvider component for managing bingo card themes.
 * 
 * Provides theme state management including:
 * - Current theme selection
 * - Custom theme storage
 * - Theme persistence via localStorage
 * - Theme import/export
 * 
 * @param children - Child components that will have access to theme context
 */
export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [selectedThemeKey, setSelectedThemeKey] = useState<string>('classic');
  const [customThemes, setCustomThemes] = useState<Record<string, CardTheme>>({});
  const [currentTheme, setCurrentTheme] = useState<CardTheme>(PRESET_THEMES.classic);

  // Load saved themes and selection from localStorage on mount
  useEffect(() => {
    try {
      const savedThemes = localStorage.getItem(STORAGE_KEY);
      if (savedThemes) {
        const parsed = JSON.parse(savedThemes);
        if (typeof parsed === 'object') {
          // Validate each theme
          const validThemes: Record<string, CardTheme> = {};
          Object.entries(parsed).forEach(([key, theme]) => {
            if (isValidTheme(theme)) {
              validThemes[key] = theme as CardTheme;
            }
          });
          setCustomThemes(validThemes);
        }
      }

      const savedSelection = localStorage.getItem(SELECTED_THEME_KEY);
      if (savedSelection) {
        setSelectedThemeKey(savedSelection);
      }
    } catch (error) {
      console.error('Failed to load themes from localStorage:', error);
    }
  }, []);

  // Update current theme when selection or custom themes change
  useEffect(() => {
    let theme: CardTheme;
    
    if (PRESET_THEMES[selectedThemeKey]) {
      theme = PRESET_THEMES[selectedThemeKey];
    } else if (customThemes[selectedThemeKey]) {
      theme = customThemes[selectedThemeKey];
    } else {
      theme = PRESET_THEMES.classic;
    }
    
    setCurrentTheme(theme);
  }, [selectedThemeKey, customThemes]);

  // Save custom themes to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customThemes));
    } catch (error) {
      console.error('Failed to save themes to localStorage:', error);
    }
  }, [customThemes]);

  const setTheme = useCallback((key: string) => {
    setSelectedThemeKey(key);
    try {
      localStorage.setItem(SELECTED_THEME_KEY, key);
    } catch (error) {
      console.error('Failed to save theme selection:', error);
    }
  }, []);

  const setCustomTheme = useCallback((theme: CardTheme) => {
    const key = `custom_${Date.now()}`;
    setCustomThemes(prev => ({
      ...prev,
      [key]: theme,
    }));
    setTheme(key);
  }, [setTheme]);

  const deleteCustomTheme = useCallback((key: string) => {
    setCustomThemes(prev => {
      const newThemes = { ...prev };
      delete newThemes[key];
      return newThemes;
    });
    
    // If the deleted theme was selected, switch to classic
    if (selectedThemeKey === key) {
      setTheme('classic');
    }
  }, [selectedThemeKey, setTheme]);

  const exportTheme = useCallback((theme: CardTheme): string => {
    return JSON.stringify(theme, null, 2);
  }, []);

  const importTheme = useCallback((jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (isValidTheme(parsed)) {
        const theme = createCustomTheme(parsed);
        setCustomTheme(theme);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import theme:', error);
      return false;
    }
  }, [setCustomTheme]);

  const value: ThemeContextType = {
    currentTheme,
    selectedThemeKey,
    customThemes,
    setTheme,
    setCustomTheme,
    deleteCustomTheme,
    exportTheme,
    importTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access the theme context.
 * 
 * @throws Error if used outside of ThemeProvider
 * @returns ThemeContextType with current theme and management functions
 */
export function useCardTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useCardTheme must be used within a ThemeProvider');
  }
  return context;
}
