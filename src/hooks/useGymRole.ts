import { useState, useEffect } from 'react';
import { GymRole } from '../types';
import { StorageService } from '../services/storage.service';
import { User } from '@supabase/supabase-js';

export const useGymRole = (user: User | null) => {
  const [gymRole, setGymRole] = useState<GymRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setGymRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    StorageService.getMyGymRole()
      .then(setGymRole)
      .finally(() => setLoading(false));
  }, [user]);

  return {
    gymRole,
    isGymStaff: gymRole === 'gym_staff' || gymRole === 'gym_admin',
    isGymAdmin: gymRole === 'gym_admin',
    loading,
  };
};
