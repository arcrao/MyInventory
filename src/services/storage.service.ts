import { Product, Category, Location, HistoryEntry } from '../types';
import { STORAGE_KEYS } from '../constants';

declare global {
  interface Window {
    storage: {
      get: (key: string) => Promise<{ value: string } | null>;
      set: (key: string, value: string) => Promise<void>;
    };
  }
}

export class StorageService {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const result = await window.storage.get(key);
      if (result) {
        return JSON.parse(result.value) as T;
      }
      return null;
    } catch (error) {
      console.error(`Error getting ${key} from storage:`, error);
      return null;
    }
  }

  static async set<T>(key: string, value: T): Promise<void> {
    try {
      await window.storage.set(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting ${key} in storage:`, error);
      throw error;
    }
  }

  static async getProducts(): Promise<Product[]> {
    return (await this.get<Product[]>(STORAGE_KEYS.PRODUCTS)) || [];
  }

  static async setProducts(products: Product[]): Promise<void> {
    await this.set(STORAGE_KEYS.PRODUCTS, products);
  }

  static async getCategories(): Promise<Category[]> {
    return (await this.get<Category[]>(STORAGE_KEYS.CATEGORIES)) || [];
  }

  static async setCategories(categories: Category[]): Promise<void> {
    await this.set(STORAGE_KEYS.CATEGORIES, categories);
  }

  static async getLocations(): Promise<Location[]> {
    return (await this.get<Location[]>(STORAGE_KEYS.LOCATIONS)) || [];
  }

  static async setLocations(locations: Location[]): Promise<void> {
    await this.set(STORAGE_KEYS.LOCATIONS, locations);
  }

  static async getHistory(): Promise<HistoryEntry[]> {
    return (await this.get<HistoryEntry[]>(STORAGE_KEYS.HISTORY)) || [];
  }

  static async setHistory(history: HistoryEntry[]): Promise<void> {
    await this.set(STORAGE_KEYS.HISTORY, history);
  }
}
