import { useState, useEffect } from 'react';
import { Category } from '../types';
import { StorageService } from '../services/storage.service';

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const data = await StorageService.getCategories();
    setCategories(data);
  };

  const addCategory = async (name: string): Promise<void> => {
    if (!name.trim()) return;

    const newCategory: Category = {
      id: Date.now().toString(),
      name: name.trim(),
    };
    const newCategories = [...categories, newCategory];
    setCategories(newCategories);
    await StorageService.setCategories(newCategories);
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    const newCategories = categories.filter(c => c.id !== id);
    setCategories(newCategories);
    await StorageService.setCategories(newCategories);
    return true;
  };

  return {
    categories,
    addCategory,
    deleteCategory,
  };
};
