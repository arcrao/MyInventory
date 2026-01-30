import { Product, Category, Location, HistoryEntry, HistoryActionFilter, HistoryDateRangeFilter } from '../types';
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

  // Helper to calculate date range
  private static getDateRangeFilter(dateRange: HistoryDateRangeFilter): { start: Date; end: Date } | null {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateRange) {
      case 'today':
        return {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
        };

      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          start: yesterday,
          end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1)
        };
      }

      case 'weekly': {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return {
          start: weekAgo,
          end: now
        };
      }

      case 'current_month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          start: monthStart,
          end: now
        };
      }

      case 'previous_month': {
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return {
          start: prevMonthStart,
          end: prevMonthEnd
        };
      }

      case '3_months': {
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return {
          start: threeMonthsAgo,
          end: now
        };
      }

      case 'all':
      default:
        return null;
    }
  }

  // Products
  static async getProducts(page?: number, pageSize: number = 50, categoryId?: string, searchTerm?: string): Promise<Product[]> {
    try {
      console.log('[StorageService] Fetching products, page:', page, 'category:', categoryId, 'search:', searchTerm);
      // All authenticated users can view all products (no user_id filter)
      let query = supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      // Add category filter if provided
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      // Add search filter if provided
      if (searchTerm && searchTerm.trim()) {
        query = query.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`);
      }

      // Add pagination if page is provided
      if (page !== undefined && page >= 0) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[StorageService] Error fetching products:', error);
        throw error;
      }

      console.log('[StorageService] Fetched products:', data?.length || 0, 'items');
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

  static async getProductsCount(categoryId?: string, searchTerm?: string): Promise<number> {
    try {
      // All authenticated users can view all products (no user_id filter)
      let query = supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Add category filter if provided
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      // Add search filter if provided
      if (searchTerm && searchTerm.trim()) {
        query = query.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`);
      }

      const { count, error } = await query;

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

  /**
   * @deprecated Use addProductWithHistory() instead for atomic transactions
   * This method is kept for backward compatibility but should not be used
   */
  static async addProduct(product: Omit<Product, 'id' | 'createdAt'>): Promise<Product | null> {
    console.warn('addProduct() is deprecated. Use addProductWithHistory() for atomic operations.');
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

  /**
   * @deprecated Use updateProductWithHistory() instead for atomic transactions
   * This method is kept for backward compatibility but should not be used
   */
  static async updateProduct(id: number, updates: Partial<Product>): Promise<void> {
    console.warn('updateProduct() is deprecated. Use updateProductWithHistory() for atomic operations.');
    try {
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
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  /**
   * @deprecated Use deleteProductWithHistory() instead for atomic transactions
   * This method is kept for backward compatibility but should not be used
   */
  static async deleteProduct(id: number): Promise<void> {
    console.warn('deleteProduct() is deprecated. Use deleteProductWithHistory() for atomic operations.');
    try {
      // RLS policies will handle authorization (only super_admins can delete)
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Categories
  static async getCategories(): Promise<Category[]> {
    try {
      console.log('[StorageService] Fetching categories');
      // All authenticated users can view all categories (no user_id filter)
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true});

      if (error) {
        console.error('[StorageService] Error fetching categories:', error);
        throw error;
      }

      console.log('[StorageService] Fetched categories:', data?.length || 0, 'items');
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
      // RLS policies will handle authorization (only admins can delete)
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  // Locations
  static async getLocations(): Promise<Location[]> {
    try {
      console.log('[StorageService] Fetching locations');
      // All authenticated users can view all locations (no user_id filter)
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('[StorageService] Error fetching locations:', error);
        throw error;
      }

      console.log('[StorageService] Fetched locations:', data?.length || 0, 'items');
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
      // RLS policies will handle authorization (only admins can delete)
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting location:', error);
      throw error;
    }
  }

  // History
  static async getHistory(
    page?: number,
    pageSize: number = 50,
    searchTerm?: string,
    actionFilter: HistoryActionFilter = 'all',
    dateRangeFilter: HistoryDateRangeFilter = 'all'
  ): Promise<HistoryEntry[]> {
    try {
      console.log('[StorageService] Fetching history, page:', page, 'search:', searchTerm, 'action:', actionFilter, 'dateRange:', dateRangeFilter);

      // Start with base query
      let query = supabase
        .from('history')
        .select(`
          *,
          products(name, category_id, categories(name))
        `)
        .order('created_at', { ascending: false });

      // Apply action filter
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      // Apply date range filter
      const dateRange = this.getDateRangeFilter(dateRangeFilter);
      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data: historyData, error: historyError } = await query;

      if (historyError) throw historyError;

      // Apply search filter client-side if needed
      let filtered = historyData || [];
      if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(item => {
          const productName = item.products?.name?.toLowerCase() || '';
          const categoryName = item.products?.categories?.name?.toLowerCase() || '';
          const notes = item.notes?.toLowerCase() || '';
          const contactPerson = item.contact_person?.toLowerCase() || '';

          return (
            productName.includes(searchLower) ||
            categoryName.includes(searchLower) ||
            notes.includes(searchLower) ||
            contactPerson.includes(searchLower)
          );
        });
      }

      // Apply pagination client-side
      const from = page !== undefined && page >= 0 ? page * pageSize : 0;
      const to = page !== undefined && page >= 0 ? from + pageSize : filtered.length;
      const paginated = filtered.slice(from, to);

      console.log('[StorageService] Fetched history:', paginated.length, 'items');
      return paginated.map(item => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name || item.products?.name, // Use stored name, fallback to JOIN for backward compatibility
        action: item.action as 'created' | 'stock_in' | 'stock_out' | 'deleted' | 'updated',
        quantity: item.quantity,
        notes: item.notes || '',
        timestamp: item.created_at,
        contactPerson: item.contact_person,
        pricePerUnit: item.price_per_unit ? parseFloat(item.price_per_unit) : undefined,
        date: item.date,
        unitOfMeasure: item.unit_of_measure
      }));
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  }

  static async getHistoryCount(
    searchTerm?: string,
    actionFilter: HistoryActionFilter = 'all',
    dateRangeFilter: HistoryDateRangeFilter = 'all'
  ): Promise<number> {
    try {
      // Start with base query
      let query = supabase
        .from('history')
        .select(`
          *,
          products(name, category_id, categories(name))
        `);

      // Apply action filter
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      // Apply date range filter
      const dateRange = this.getDateRangeFilter(dateRangeFilter);
      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data: historyData, error } = await query;

      if (error) throw error;

      // Apply search filter client-side if needed
      let filtered = historyData || [];
      if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(item => {
          const productName = item.products?.name?.toLowerCase() || '';
          const categoryName = item.products?.categories?.name?.toLowerCase() || '';
          const notes = item.notes?.toLowerCase() || '';
          const contactPerson = item.contact_person?.toLowerCase() || '';

          return (
            productName.includes(searchLower) ||
            categoryName.includes(searchLower) ||
            notes.includes(searchLower) ||
            contactPerson.includes(searchLower)
          );
        });
      }

      return filtered.length;
    } catch (error) {
      console.error('Error getting history count:', error);
      return 0;
    }
  }

  static async setHistory(_history: HistoryEntry[]): Promise<void> {
    console.warn('setHistory is deprecated with Supabase');
  }

  static async getHistoryByProduct(productId: number): Promise<HistoryEntry[]> {
    try {
      console.log('[StorageService] Fetching history for product:', productId);

      const { data, error } = await supabase
        .from('history')
        .select('*, products(name)')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('[StorageService] Fetched product history:', data?.length || 0, 'items');
      return (data || []).map(item => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name || item.products?.name, // Use stored name, fallback to JOIN for backward compatibility
        action: item.action as 'created' | 'stock_in' | 'stock_out' | 'deleted' | 'updated',
        quantity: item.quantity,
        notes: item.notes || '',
        timestamp: item.created_at,
        contactPerson: item.contact_person,
        pricePerUnit: item.price_per_unit ? parseFloat(item.price_per_unit) : undefined,
        date: item.date,
        unitOfMeasure: item.unit_of_measure
      }));
    } catch (error) {
      console.error('Error getting product history:', error);
      return [];
    }
  }

  static async addHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const userId = await this.getUserId();
      const { error } = await supabase
        .from('history')
        .insert({
          user_id: userId,
          product_id: entry.productId,
          product_name: entry.productName,  // Store product name for audit trail
          action: entry.action,
          quantity: entry.quantity,
          notes: entry.notes,
          contact_person: entry.contactPerson,
          price_per_unit: entry.pricePerUnit,
          date: entry.date,
          unit_of_measure: entry.unitOfMeasure || 'pcs'  // Store unit of measure for audit trail
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding history entry:', error);
      throw error;
    }
  }

  // Get ALL history entries (no pagination) - for CSV export and reports
  // Uses pagination internally to fetch all records (Supabase default limit is 1000)
  // Optionally filter by date range at database level for better performance
  static async getAllHistory(dateRangeFilter: HistoryDateRangeFilter = 'all'): Promise<HistoryEntry[]> {
    try {
      console.log('[StorageService] Fetching ALL history entries, dateRange:', dateRangeFilter);
      const allData: any[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;

      // Get date range for filtering
      const dateRange = this.getDateRangeFilter(dateRangeFilter);

      while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from('history')
          .select('*, products(name)')
          .order('created_at', { ascending: false });

        // Apply date range filter at database level
        if (dateRange) {
          query = query
            .gte('created_at', dateRange.start.toISOString())
            .lte('created_at', dateRange.end.toISOString());
        }

        const { data, error } = await query.range(from, to);

        if (error) throw error;

        if (data && data.length > 0) {
          allData.push(...data);
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      console.log('[StorageService] Fetched all history:', allData.length, 'items');
      return allData.map(item => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name || item.products?.name,
        action: item.action as 'created' | 'stock_in' | 'stock_out' | 'deleted' | 'updated',
        quantity: item.quantity,
        notes: item.notes || '',
        timestamp: item.created_at,
        contactPerson: item.contact_person,
        pricePerUnit: item.price_per_unit ? parseFloat(item.price_per_unit) : undefined,
        date: item.date,
        unitOfMeasure: item.unit_of_measure
      }));
    } catch (error) {
      console.error('Error getting all history:', error);
      return [];
    }
  }

  // Transactional Product CRUD Operations (RPC)
  // These use PostgreSQL functions to ensure atomicity

  /**
   * Add a new product with history entry using atomic transaction
   * Inserts product and creates history entry in single transaction
   */
  static async addProductWithHistory(
    product: Omit<Product, 'id' | 'createdAt'>
  ): Promise<{ success: boolean; productId: number; message: string }> {
    try {
      const { data, error } = await supabase.rpc('add_product_with_history', {
        p_name: product.name,
        p_sku: product.sku,
        p_quantity: product.quantity,
        p_min_stock: product.minStock,
        p_price: product.price,
        p_category_id: product.categoryId || null,
        p_location_id: product.locationId || null,
        p_description: product.description || null,
        p_brand: product.brand || null,
        p_specification: product.specification || null,
        p_unit_of_measure: product.unitOfMeasure
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error in add product transaction:', error);
      throw error;
    }
  }

  /**
   * Update a product with history entry using atomic transaction
   * Updates product and creates history entry in single transaction
   */
  static async updateProductWithHistory(
    id: number,
    updates: Partial<Product>
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.rpc('update_product_with_history', {
        p_product_id: id,
        p_name: updates.name !== undefined ? updates.name : null,
        p_sku: updates.sku !== undefined ? updates.sku : null,
        p_quantity: updates.quantity !== undefined ? updates.quantity : null,
        p_min_stock: updates.minStock !== undefined ? updates.minStock : null,
        p_price: updates.price !== undefined ? updates.price : null,
        p_category_id: updates.categoryId !== undefined ? (updates.categoryId || null) : null,
        p_location_id: updates.locationId !== undefined ? (updates.locationId || null) : null,
        p_description: updates.description !== undefined ? updates.description : null,
        p_brand: updates.brand !== undefined ? updates.brand : null,
        p_specification: updates.specification !== undefined ? updates.specification : null,
        p_unit_of_measure: updates.unitOfMeasure !== undefined ? updates.unitOfMeasure : null
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error in update product transaction:', error);
      throw error;
    }
  }

  /**
   * Delete a product with history entry using atomic transaction
   * Creates history entry and deletes product in single transaction
   */
  static async deleteProductWithHistory(
    id: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.rpc('delete_product_with_history', {
        p_product_id: id
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error in delete product transaction:', error);
      throw error;
    }
  }

  // Transactional Stock Operations (RPC)
  // These use PostgreSQL functions to ensure atomicity

  /**
   * Add stock to a product using atomic transaction
   * Updates product quantity and creates history entry in single transaction
   */
  static async stockInProduct(
    productId: number,
    quantity: number,
    notes?: string,
    contactPerson?: string,
    pricePerUnit?: number,
    date?: string
  ): Promise<{ success: boolean; newQuantity: number; message: string }> {
    try {
      const { data, error } = await supabase.rpc('stock_in_product', {
        p_product_id: productId,
        p_quantity: quantity,
        p_notes: notes || null,
        p_contact_person: contactPerson || null,
        p_price_per_unit: pricePerUnit || null,
        p_date: date || null
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error in stock-in transaction:', error);
      throw error;
    }
  }

  /**
   * Remove stock from a product using atomic transaction
   * Updates product quantity and creates history entry in single transaction
   */
  static async stockOutProduct(
    productId: number,
    quantity: number,
    notes?: string,
    contactPerson?: string,
    pricePerUnit?: number,
    date?: string
  ): Promise<{ success: boolean; newQuantity: number; message: string }> {
    try {
      const { data, error } = await supabase.rpc('stock_out_product', {
        p_product_id: productId,
        p_quantity: quantity,
        p_notes: notes || null,
        p_contact_person: contactPerson || null,
        p_price_per_unit: pricePerUnit || null,
        p_date: date || null
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error in stock-out transaction:', error);
      throw error;
    }
  }
}
