import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const ChatPreferencesContext = createContext();

// Default preferences structure
const DEFAULT_PREFERENCES = {
  displayFormat: 'table',
  detailLevel: 'medium',
  formatPreferences: {
    numerical: 'table',
    textual: 'list',
    temporal: 'timeline'
  },
  lastUpdated: new Date(),
  improvements: []
};

export const ChatPreferencesProvider = ({ children }) => {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('http://localhost:5000/api/chat/preferences');
      
      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...response.data,
        lastUpdated: new Date(response.data.lastUpdated)
      });
    } catch (error) {
      console.error('Error loading preferences:', error);
      setError('Failed to load preferences. Using defaults.');
      // Keep using default preferences on error
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates) => {
    try {
      setError(null);
      // Only send the fields that are being updated
      const response = await axios.put('http://localhost:5000/api/chat/preferences', updates);
      
      setPreferences({
        ...preferences,
        ...response.data,
        lastUpdated: new Date(response.data.lastUpdated)
      });

      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      setError('Failed to update preferences.');
      return false;
    }
  };

  const resetPreferences = async () => {
    try {
      setError(null);
      const response = await axios.post('http://localhost:5000/api/chat/preferences/reset');
      
      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...response.data,
        lastUpdated: new Date(response.data.lastUpdated)
      });

      return true;
    } catch (error) {
      console.error('Error resetting preferences:', error);
      setError('Failed to reset preferences.');
      return false;
    }
  };

  const updateFormat = async (format) => {
    return updatePreferences({ displayFormat: format });
  };

  const updateDetailLevel = async (level) => {
    return updatePreferences({ detailLevel: level });
  };

  const updateFormatPreference = async (type, format) => {
    return updatePreferences({
      formatPreferences: {
        ...preferences.formatPreferences,
        [type]: format
      }
    });
  };

  return (
    <ChatPreferencesContext.Provider value={{
      preferences,
      loading,
      error,
      updatePreferences,
      resetPreferences,
      updateFormat,
      updateDetailLevel,
      updateFormatPreference
    }}>
      {children}
    </ChatPreferencesContext.Provider>
  );
};

export const useChatPreferences = () => {
  const context = useContext(ChatPreferencesContext);
  if (!context) {
    throw new Error('useChatPreferences must be used within a ChatPreferencesProvider');
  }
  return context;
};

export default ChatPreferencesContext;