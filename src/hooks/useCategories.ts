import { useState, useEffect } from 'react';
import { Category } from '../types';
import { StorageService } from '../services/storage.service';
import { User } from '@supabase/supabase-js';

export const useCategories = (user: User | null) => {
  const [categories, setCategories] = useState<Category[]>([]);

  const loadCategories = async () => {
    if (!user) {
      return;
    }

    try {
      const data = await StorageService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addCategory = async (name: string): Promise<void> => {
    if (!name.trim()) return;

    const newCategory = await StorageService.addCategory(name.trim());
    if (newCategory) {
      await loadCategories();
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    await StorageService.deleteCategory(id);
    await loadCategories();
    return true;
  };

  return {
    categories,
    addCategory,
    deleteCategory,
  };
};
