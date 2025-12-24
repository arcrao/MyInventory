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
    const newEntry: HistoryEntry = {
      ...entry,
      id: Date.now(),
      timestamp: new Date().toISOString(),
    };
    const newHistory = [newEntry, ...history];
    setHistory(newHistory);
    await StorageService.setHistory(newHistory);
  };

  return {
    history,
    addHistoryEntry,
  };
};
