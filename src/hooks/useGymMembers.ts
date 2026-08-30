import { useState, useEffect } from 'react';
import { GymMember, GymMemberFormData } from '../types';
import { StorageService } from '../services/storage.service';
import { User } from '@supabase/supabase-js';

export const useGymMembers = (user: User | null) => {
  const [members, setMembers] = useState<GymMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadMembers = async (newSearchTerm?: string) => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);
      const termToUse = newSearchTerm !== undefined ? newSearchTerm : searchTerm;
      const data = await StorageService.getGymMembers(termToUse || undefined);
      setMembers(data);
      if (newSearchTerm !== undefined) {
        setSearchTerm(newSearchTerm);
      }
    } catch (error) {
      console.error('Error loading gym members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addMember = async (memberData: GymMemberFormData): Promise<GymMember> => {
    const member = await StorageService.addGymMember(memberData);
    await loadMembers();
    return member;
  };

  const updateMember = async (id: number, memberData: GymMemberFormData): Promise<void> => {
    await StorageService.updateGymMember(id, memberData);
    await loadMembers();
  };

  const deleteMember = async (id: number): Promise<void> => {
    await StorageService.deleteGymMember(id);
    await loadMembers();
  };

  const applySearch = (term: string) => {
    loadMembers(term);
  };

  return {
    members,
    loading,
    searchTerm,
    addMember,
    updateMember,
    deleteMember,
    applySearch,
    reloadMembers: loadMembers,
  };
};
