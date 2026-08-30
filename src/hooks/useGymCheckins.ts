import { useState, useEffect } from 'react';
import { GymCheckin } from '../types';
import { StorageService } from '../services/storage.service';
import { User } from '@supabase/supabase-js';

export const useGymCheckins = (user: User | null) => {
  const [checkins, setCheckins] = useState<GymCheckin[]>([]);
  const [activeCheckins, setActiveCheckins] = useState<GymCheckin[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 50;

  const loadCheckins = async (page?: number, newSearchTerm?: string) => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);
      const pageToLoad = page !== undefined ? page : currentPage;
      const termToUse = newSearchTerm !== undefined ? newSearchTerm : searchTerm;

      const [data, count, active] = await Promise.all([
        StorageService.getGymCheckins(pageToLoad, pageSize, termToUse || undefined),
        StorageService.getGymCheckinsCount(termToUse || undefined),
        StorageService.getActiveGymCheckins(),
      ]);

      setCheckins(data);
      setTotalCount(count);
      setActiveCheckins(active);

      if (page !== undefined) {
        setCurrentPage(page);
      }
      if (newSearchTerm !== undefined) {
        setSearchTerm(newSearchTerm);
      }
    } catch (error) {
      console.error('Error loading gym checkins:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCheckins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const goToPage = (page: number) => {
    loadCheckins(page);
  };

  const applySearch = (term: string) => {
    loadCheckins(0, term);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    checkins,
    activeCheckins,
    currentPage,
    totalPages,
    totalCount,
    loading,
    searchTerm,
    goToPage,
    applySearch,
    reloadCheckins: loadCheckins,
  };
};
