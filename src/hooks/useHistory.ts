import { useState, useEffect } from 'react';
import { HistoryEntry } from '../types';
import { StorageService } from '../services/storage.service';

export const useHistory = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const data = await StorageService.getHistory();
    setHistory(data);
  };

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
