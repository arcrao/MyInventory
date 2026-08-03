import { useState, useEffect } from 'react';
import {
  FireExtinguisher,
  FireExtinguisherFilters,
  FireExtinguisherFormData,
  FireExtinguisherSort,
  FireExtinguisherSummary,
} from '../types';
import { StorageService } from '../services/storage.service';
import { getDueBounds } from '../utils/extinguisherStatus';
import { User } from '@supabase/supabase-js';

const DEFAULT_FILTERS: FireExtinguisherFilters = {
  searchTerm: '',
  area: '',
  type: '',
  status: 'all',
};

// Soonest expiry first is the useful default for a refill register.
const DEFAULT_SORT: FireExtinguisherSort = {
  field: 'refilling_due_date',
  ascending: true,
};

export const useFireExtinguishers = (user: User | null) => {
  const [extinguishers, setExtinguishers] = useState<FireExtinguisher[]>([]);
  const [summary, setSummary] = useState<FireExtinguisherSummary>({
    total: 0,
    overdue: 0,
    dueSoon: 0,
    ok: 0,
    noDate: 0,
  });
  const [areas, setAreas] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FireExtinguisherFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<FireExtinguisherSort>(DEFAULT_SORT);
  const pageSize = 50;

  const loadExtinguishers = async (
    page?: number,
    newFilters?: FireExtinguisherFilters,
    newSort?: FireExtinguisherSort
  ) => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);
      const pageToLoad = page !== undefined ? page : currentPage;
      const filtersToUse = newFilters || filters;
      const sortToUse = newSort || sort;

      // One set of bounds for all three queries, so rows, badges and card
      // counts can never disagree.
      const { today, dueSoonDate } = getDueBounds();

      const [data, count, summaryData, areaList] = await Promise.all([
        StorageService.getFireExtinguishers(
          pageToLoad,
          pageSize,
          filtersToUse,
          sortToUse,
          today,
          dueSoonDate
        ),
        StorageService.getFireExtinguishersCount(filtersToUse, today, dueSoonDate),
        StorageService.getFireExtinguisherSummary(filtersToUse, today, dueSoonDate),
        StorageService.getFireExtinguisherAreas(),
      ]);

      setExtinguishers(data);
      setTotalCount(count);
      setSummary(summaryData);
      setAreas(areaList);

      if (page !== undefined) {
        setCurrentPage(page);
      }
      if (newFilters) {
        setFilters(newFilters);
      }
      if (newSort) {
        setSort(newSort);
      }
    } catch (error) {
      console.error('Error loading fire extinguishers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExtinguishers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Changing a filter or the sort returns to page 0 - staying on page 4 of a
  // now-shorter result set would show an empty table.
  const applyFilters = (newFilters: FireExtinguisherFilters) => {
    loadExtinguishers(0, newFilters);
  };

  const applySort = (field: FireExtinguisherSort['field']) => {
    const ascending = sort.field === field ? !sort.ascending : true;
    loadExtinguishers(0, undefined, { field, ascending });
  };

  const addExtinguisher = async (formData: FireExtinguisherFormData): Promise<void> => {
    await StorageService.addFireExtinguisher(formData);
    await loadExtinguishers();
  };

  const updateExtinguisher = async (
    id: number,
    formData: FireExtinguisherFormData
  ): Promise<void> => {
    await StorageService.updateFireExtinguisher(id, formData);
    await loadExtinguishers();
  };

  const deleteExtinguisher = async (id: number): Promise<void> => {
    await StorageService.deleteFireExtinguisher(id);
    await loadExtinguishers();
  };

  const goToPage = (page: number) => {
    loadExtinguishers(page);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    extinguishers,
    summary,
    areas,
    addExtinguisher,
    updateExtinguisher,
    deleteExtinguisher,
    currentPage,
    totalPages,
    totalCount,
    goToPage,
    pageSize,
    loading,
    filters,
    applyFilters,
    sort,
    applySort,
    reloadExtinguishers: loadExtinguishers,
  };
};
