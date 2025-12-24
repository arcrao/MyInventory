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

    const newLocation: Location = {
      id: Date.now().toString(),
      name: name.trim(),
    };
    const newLocations = [...locations, newLocation];
    setLocations(newLocations);
    await StorageService.setLocations(newLocations);
  };

  const deleteLocation = async (id: string): Promise<boolean> => {
    const newLocations = locations.filter(l => l.id !== id);
    setLocations(newLocations);
    await StorageService.setLocations(newLocations);
    return true;
  };

  return {
    locations,
    addLocation,
    deleteLocation,
  };
};
