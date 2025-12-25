import { useState, useEffect } from 'react';
import { Location } from '../types';
import { StorageService } from '../services/storage.service';

export const useLocations = () => {
  const [locations, setLocations] = useState<Location[]>([]);

  const loadLocations = async () => {
    try {
      const data = await StorageService.getLocations();
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const addLocation = async (name: string): Promise<void> => {
    if (!name.trim()) return;

    const newLocation = await StorageService.addLocation(name.trim());
    if (newLocation) {
      setLocations([...locations, newLocation]);
    }
  };

  const deleteLocation = async (id: string): Promise<boolean> => {
    await StorageService.deleteLocation(id);
    setLocations(locations.filter(l => l.id !== id));
    return true;
  };

  return {
    locations,
    addLocation,
    deleteLocation,
  };
};
