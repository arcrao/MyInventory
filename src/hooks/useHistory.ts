import { useState, useEffect } from 'react';
import { HistoryEntry } from '../types';
import { StorageService } from '../services/storage.service';

export const useHistory = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const loadHistory = async () => {
    try {
      const data = await StorageService.getHistory();
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const addHistoryEntry = async (entry: Omit<HistoryEntry, 'id' | 'timestamp'>): Promise<void> => {
    await StorageService.addHistoryEntry(entry);
    // Reload history to get the new entry with server-generated ID and timestamp
    await loadHistory();
  };

  return {
    history,
    addHistoryEntry,
  };
};
