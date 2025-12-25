import { useState, useEffect } from 'react';
import { Location } from '../types';
import { StorageService } from '../services/storage.service';

export const useLocations = () => {
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    const data = await StorageService.getLocations();
    setLocations(data);
  };

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
