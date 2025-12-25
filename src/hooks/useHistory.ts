import { useState, useEffect } from 'react';
import { HistoryEntry } from '../types';
import { StorageService } from '../services/storage.service';
import { User } from '@supabase/supabase-js';

export const useHistory = (user: User | null) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const loadHistory = async () => {
    if (!user) {
      console.log('[useHistory] No user, skipping load');
      return;
    }

    try {
      const data = await StorageService.getHistory();
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  useEffect(() => {
    console.log('[useHistory] useEffect triggered, user:', !!user);
    loadHistory();
  }, [user]);

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
