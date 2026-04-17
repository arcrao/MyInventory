import { useState, useEffect, useRef } from 'react';
import { HistoryEntry, HistoryFilters } from '../types';
import { StorageService } from '../services/storage.service';
import { User } from '@supabase/supabase-js';

export const useHistory = (user: User | null) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<HistoryFilters>({
    searchTerm: '',
    action: 'all',
    dateRange: 'all'
  });
  const [loading, setLoading] = useState(true);
  const pageSize = 50;
  const isApplyingFilters = useRef(false);

  const loadHistory = async (
    page?: number,
    newFilters?: Partial<HistoryFilters>
  ) => {
    if (!user) {
      console.log('[useHistory] No user, skipping load');
      return;
    }

    try {
      setLoading(true);
      const pageToLoad = page !== undefined ? page : currentPage;
      const filtersToUse = newFilters ? { ...filters, ...newFilters } : filters;

      const [data, count] = await Promise.all([
        StorageService.getHistory(
          pageToLoad,
          pageSize,
          filtersToUse.searchTerm || undefined,
          filtersToUse.action,
          filtersToUse.dateRange
        ),
        StorageService.getHistoryCount(
          filtersToUse.searchTerm || undefined,
          filtersToUse.action,
          filtersToUse.dateRange
        )
      ]);

      setHistory(data);
      setTotalCount(count);
      if (page !== undefined) {
        setCurrentPage(page);
      }
      if (newFilters) {
        setFilters({ ...filters, ...newFilters });
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (newFilters: Partial<HistoryFilters>) => {
    isApplyingFilters.current = true;
    setCurrentPage(0); // Reset to first page
    loadHistory(0, newFilters).finally(() => {
      isApplyingFilters.current = false;
    });
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  useEffect(() => {
    // Skip if we're applying filters (to avoid double load)
    if (isApplyingFilters.current) {
      console.log('[useHistory] Skipping useEffect - filters being applied');
      return;
    }
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
    filters,
    applyFilters,
    goToPage,
    pageSize,
    loading,
  };
};
