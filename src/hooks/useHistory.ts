import { useState, useEffect } from 'react';
import { HistoryEntry } from '../types';
import { StorageService } from '../services/storage.service';
import { User } from '@supabase/supabase-js';

export const useHistory = (user: User | null) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const pageSize = 50;

  const loadHistory = async (page?: number, search?: string) => {
    if (!user) {
      console.log('[useHistory] No user, skipping load');
      return;
    }

    try {
      setLoading(true);
      const pageToLoad = page !== undefined ? page : currentPage;
      const searchToUse = search !== undefined ? search : searchTerm;

      const [data, count] = await Promise.all([
        StorageService.getHistory(pageToLoad, pageSize, searchToUse || undefined),
        StorageService.getHistoryCount(searchToUse || undefined)
      ]);

      setHistory(data);
      setTotalCount(count);
      if (page !== undefined) {
        setCurrentPage(page);
      }
      if (search !== undefined) {
        setSearchTerm(search);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const applySearch = (search: string) => {
    setCurrentPage(0); // Reset to first page
    loadHistory(0, search);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  useEffect(() => {
    console.log('[useHistory] useEffect triggered, user:', !!user, 'currentPage:', currentPage);
    loadHistory();
  }, [user, currentPage]);

  const addHistoryEntry = async (entry: Omit<HistoryEntry, 'id' | 'timestamp'>): Promise<void> => {
    await StorageService.addHistoryEntry(entry);
    // Reload history to get the new entry with server-generated ID and timestamp
    await loadHistory();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    history,
    addHistoryEntry,
    currentPage,
    totalPages,
    totalCount,
    searchTerm,
    applySearch,
    goToPage,
    pageSize,
    loading,
  };
};
