import { useState, useEffect } from 'react';
import { Location } from '../types';
import { StorageService } from '../services/storage.service';
import { User } from '@supabase/supabase-js';

export const useLocations = (user: User | null) => {
  const [locations, setLocations] = useState<Location[]>([]);

  const loadLocations = async () => {
    if (!user) {
      console.log('[useLocations] No user, skipping load');
      return;
    }

    try {
      const data = await StorageService.getLocations();
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  useEffect(() => {
    console.log('[useLocations] useEffect triggered, user:', !!user);
    loadLocations();
  }, [user]);

  const addLocation = async (name: string): Promise<void> => {
    if (!name.trim()) return;

    const newLocation = await StorageService.addLocation(name.trim());
    if (newLocation) {
      await loadLocations();
    }
  };

  const deleteLocation = async (id: string): Promise<boolean> => {
    await StorageService.deleteLocation(id);
    await loadLocations();
    return true;
  };

  return {
    locations,
    addLocation,
    deleteLocation,
  };
};
