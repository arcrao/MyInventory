import { useState, useEffect } from 'react';
import { Category } from '../types';
import { StorageService } from '../services/storage.service';
import { User } from '@supabase/supabase-js';

export const useCategories = (user: User | null) => {
  const [categories, setCategories] = useState<Category[]>([]);

  const loadCategories = async () => {
    console.log('[useCategories] loadCategories called, user:', user ? { id: user.id, email: user.email } : null);

    if (!user) {
      console.log('[useCategories] No user, skipping load');
      return;
    }

    try {
      console.log('[useCategories] Calling StorageService.getCategories...');
      const data = await StorageService.getCategories();
      console.log('[useCategories] Loaded categories:', data.length);
      setCategories(data);
    } catch (error) {
      console.error('[useCategories] Error loading categories:', error);
    }
  };

  useEffect(() => {
    console.log('[useCategories] useEffect triggered', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email
    });
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
