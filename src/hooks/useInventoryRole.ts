import { useState, useEffect } from 'react';
import { StorageService } from '../services/storage.service';
import { User } from '@supabase/supabase-js';

export const useInventoryRole = (user: User | null) => {
  const [hasInventoryAccess, setHasInventoryAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHasInventoryAccess(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    StorageService.hasInventoryAccess()
      .then(setHasInventoryAccess)
      .finally(() => setLoading(false));
  }, [user]);

  return { hasInventoryAccess, loading };
};
