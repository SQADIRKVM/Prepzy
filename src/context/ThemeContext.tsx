import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightTheme, DarkTheme, Theme, createCustomTheme } from '../constants/modernTheme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  customPrimaryColor: string | null;
  customSecondaryColor: string | null;
  toggleTheme: () => void;
  setCustomColors: (primary: string | null, secondary: string | null) => Promise<void>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@exam_countdown_theme';
const CUSTOM_PRIMARY_COLOR_KEY = '@exam_countdown_custom_primary_color';
const CUSTOM_SECONDARY_COLOR_KEY = '@exam_countdown_custom_secondary_color';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [customPrimaryColor, setCustomPrimaryColorState] = useState<string | null>(null);
  const [customSecondaryColor, setCustomSecondaryColorState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const [savedTheme, savedPrimaryColor, savedSecondaryColor] = await Promise.all([
        AsyncStorage.getItem(THEME_STORAGE_KEY),
        AsyncStorage.getItem(CUSTOM_PRIMARY_COLOR_KEY),
        AsyncStorage.getItem(CUSTOM_SECONDARY_COLOR_KEY),
      ]);
      
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setThemeMode(savedTheme);
      }
      
      if (savedPrimaryColor) {
        setCustomPrimaryColorState(savedPrimaryColor);
      }
      
      if (savedSecondaryColor) {
        setCustomSecondaryColorState(savedSecondaryColor);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newTheme: ThemeMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newTheme);

    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const setCustomColors = async (primary: string | null, secondary: string | null) => {
    setCustomPrimaryColorState(primary);
    setCustomSecondaryColorState(secondary);
    try {
      if (primary) {
        await AsyncStorage.setItem(CUSTOM_PRIMARY_COLOR_KEY, primary);
      } else {
        await AsyncStorage.removeItem(CUSTOM_PRIMARY_COLOR_KEY);
      }
      
      if (secondary) {
        await AsyncStorage.setItem(CUSTOM_SECONDARY_COLOR_KEY, secondary);
      } else {
        await AsyncStorage.removeItem(CUSTOM_SECONDARY_COLOR_KEY);
      }
    } catch (error) {
      console.error('Failed to save custom colors:', error);
    }
  };

  // Generate theme based on mode and custom colors
  const getTheme = (): Theme => {
    const baseTheme = themeMode === 'dark' ? DarkTheme : LightTheme;
    
    if (customPrimaryColor) {
      return createCustomTheme(baseTheme, customPrimaryColor, customSecondaryColor, themeMode === 'dark');
    }
    
    return baseTheme;
  };

  const theme = getTheme();

  if (isLoading) {
    return null; // or a loading screen
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        customPrimaryColor,
        customSecondaryColor,
        toggleTheme,
        setCustomColors,
        isDark: themeMode === 'dark',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
