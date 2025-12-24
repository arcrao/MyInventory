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

  const addHistoryEntry = async (
    productId: number,
    action: HistoryEntry['action'],
    quantity: number,
    notes: string = ''
  ): Promise<void> => {
    const entry: HistoryEntry = {
      id: Date.now(),
      productId,
      action,
      quantity,
      notes,
      timestamp: new Date().toISOString(),
    };
    const newHistory = [entry, ...history];
    setHistory(newHistory);
    await StorageService.setHistory(newHistory);
  };

  return {
    history,
    addHistoryEntry,
  };
};
