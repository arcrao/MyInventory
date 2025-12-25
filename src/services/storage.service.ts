import { Product, Category, Location, HistoryEntry } from '../types';
import { supabase } from '../lib/supabase';

export class StorageService {
  // Get current user ID
  private static async getUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  // Products
  static async getProducts(page?: number, pageSize: number = 50): Promise<Product[]> {
    try {
      const userId = await this.getUserId();
      let query = supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Add pagination if page is provided
      if (page !== undefined && page >= 0) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Map database fields to application format
      return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        minStock: item.min_stock,
        price: parseFloat(item.price),
        categoryId: item.category_id || '',
        locationId: item.location_id || '',
        description: item.description || '',
        brand: item.brand || '',
        specification: item.specification || '',
        unitOfMeasure: item.unit_of_measure,
        createdAt: item.created_at
      }));
    } catch (error) {
      console.error('Error getting products:', error);
      return [];
    }
  }

  static async getProductsCount(): Promise<number> {
    try {
      const userId = await this.getUserId();
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting products count:', error);
      return 0;
    }
  }

  static async setProducts(_products: Product[]): Promise<void> {
    // This method is not used with Supabase - use addProduct, updateProduct instead
    console.warn('setProducts is deprecated with Supabase');
  }

  static async addProduct(product: Omit<Product, 'id' | 'createdAt'>): Promise<Product | null> {
    try {
      const userId = await this.getUserId();
      const { data, error } = await supabase
        .from('products')
        .insert({
          user_id: userId,
          name: product.name,
          sku: product.sku,
          quantity: product.quantity,
          min_stock: product.minStock,
          price: product.price,
          category_id: product.categoryId || null,
          location_id: product.locationId || null,
          description: product.description,
          brand: product.brand,
          specification: product.specification,
          unit_of_measure: product.unitOfMeasure
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        sku: data.sku,
        quantity: data.quantity,
        minStock: data.min_stock,
        price: parseFloat(data.price),
        categoryId: data.category_id || '',
        locationId: data.location_id || '',
        description: data.description || '',
        brand: data.brand || '',
        specification: data.specification || '',
        unitOfMeasure: data.unit_of_measure,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  }

  static async updateProduct(id: number, updates: Partial<Product>): Promise<void> {
    try {
      const userId = await this.getUserId();
      const updateData: any = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.sku !== undefined) updateData.sku = updates.sku;
      if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
      if (updates.minStock !== undefined) updateData.min_stock = updates.minStock;
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId || null;
      if (updates.locationId !== undefined) updateData.location_id = updates.locationId || null;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.brand !== undefined) updateData.brand = updates.brand;
      if (updates.specification !== undefined) updateData.specification = updates.specification;
      if (updates.unitOfMeasure !== undefined) updateData.unit_of_measure = updates.unitOfMeasure;

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  static async deleteProduct(id: number): Promise<void> {
    try {
      const userId = await this.getUserId();
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Categories
  static async getCategories(): Promise<Category[]> {
    try {
      const userId = await this.getUserId();
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        name: item.name
      }));
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  static async setCategories(_categories: Category[]): Promise<void> {
    console.warn('setCategories is deprecated with Supabase');
  }

  static async addCategory(name: string): Promise<Category | null> {
    try {
      const userId = await this.getUserId();
      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: userId,
          name: name
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name
      };
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  }

  static async deleteCategory(id: string): Promise<void> {
    try {
      const userId = await this.getUserId();
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  // Locations
  static async getLocations(): Promise<Location[]> {
    try {
      const userId = await this.getUserId();
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        name: item.name
      }));
    } catch (error) {
      console.error('Error getting locations:', error);
      return [];
    }
  }

  static async setLocations(_locations: Location[]): Promise<void> {
    console.warn('setLocations is deprecated with Supabase');
  }

  static async addLocation(name: string): Promise<Location | null> {
    try {
      const userId = await this.getUserId();
      const { data, error } = await supabase
        .from('locations')
        .insert({
          user_id: userId,
          name: name
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name
      };
    } catch (error) {
      console.error('Error adding location:', error);
      throw error;
    }
  }

  static async deleteLocation(id: string): Promise<void> {
    try {
      const userId = await this.getUserId();
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting location:', error);
      throw error;
    }
  }

  // History
  static async getHistory(): Promise<HistoryEntry[]> {
    try {
      const userId = await this.getUserId();
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        productId: item.product_id,
        action: item.action as 'created' | 'stock_in' | 'stock_out' | 'deleted' | 'updated',
        quantity: item.quantity,
        notes: item.notes || '',
        timestamp: item.created_at,
        receivedBy: item.received_by,
        pricePerUnit: item.price_per_unit ? parseFloat(item.price_per_unit) : undefined,
        issuedTo: item.issued_to,
        date: item.date
      }));
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  }

  static async setHistory(_history: HistoryEntry[]): Promise<void> {
    console.warn('setHistory is deprecated with Supabase');
  }

  static async addHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const userId = await this.getUserId();
      const { error } = await supabase
        .from('history')
        .insert({
          user_id: userId,
          product_id: entry.productId,
          action: entry.action,
          quantity: entry.quantity,
          notes: entry.notes,
          received_by: entry.receivedBy,
          price_per_unit: entry.pricePerUnit,
          issued_to: entry.issuedTo,
          date: entry.date
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding history entry:', error);
      throw error;
    }
  }
}
