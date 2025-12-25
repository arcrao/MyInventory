import { useState, useEffect } from 'react';
import { Category } from '../types';
import { StorageService } from '../services/storage.service';

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);

  const loadCategories = async () => {
    try {
      const data = await StorageService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const addCategory = async (name: string): Promise<void> => {
    if (!name.trim()) return;

    const newCategory = await StorageService.addCategory(name.trim());
    if (newCategory) {
      setCategories([...categories, newCategory]);
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    await StorageService.deleteCategory(id);
    setCategories(categories.filter(c => c.id !== id));
    return true;
  };

  return {
    categories,
    addCategory,
    deleteCategory,
  };
};
