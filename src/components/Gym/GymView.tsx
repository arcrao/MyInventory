import React, { useState } from 'react';
import { GymMember, GymMemberFormData, GymCheckin } from '../../types';
import { CheckInScanner } from './CheckInScanner';
import { GymMembersList } from './GymMembersList';
import { GymCheckinLog } from './GymCheckinLog';
import { GymAccessManager } from './GymAccessManager';

type GymSubTab = 'scan' | 'members' | 'log' | 'access';

interface GymViewProps {
  isGymAdmin: boolean;
  gymRoleLoading: boolean;
  members: GymMember[];
  membersSearchTerm: string;
  onSearchMembers: (term: string) => void;
  onAddMember: (data: GymMemberFormData) => Promise<GymMember>;
  onUpdateMember: (id: number, data: GymMemberFormData) => Promise<void>;
  onDeleteMember: (id: number) => Promise<void>;
  checkins: GymCheckin[];
  activeCheckinsCount: number;
  checkinsCurrentPage: number;
  checkinsTotalPages: number;
  checkinsTotalCount: number;
  checkinsSearchTerm: string;
  onSearchCheckins: (term: string) => void;
  onCheckinsPageChange: (page: number) => void;
  onScanComplete: () => void;
}

export const GymView: React.FC<GymViewProps> = ({
  isGymAdmin,
  gymRoleLoading,
  members,
  membersSearchTerm,
  onSearchMembers,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  checkins,
  activeCheckinsCount,
  checkinsCurrentPage,
  checkinsTotalPages,
  checkinsTotalCount,
  checkinsSearchTerm,
  onSearchCheckins,
  onCheckinsPageChange,
  onScanComplete,
}) => {
  const [subTab, setSubTab] = useState<GymSubTab>('scan');

  const tabs: { key: GymSubTab; label: string }[] = [
    { key: 'scan', label: 'Scan Check-In/Out' },
    { key: 'members', label: 'Members' },
    { key: 'log', label: 'Log' },
    ...(isGymAdmin ? [{ key: 'access' as GymSubTab, label: 'Access' }] : []),
  ];

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`px-4 py-2 rounded text-sm font-medium min-h-[40px] transition-colors ${
              subTab === key
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === 'scan' && (
        <CheckInScanner activeCount={activeCheckinsCount} onScanComplete={onScanComplete} />
      )}

      {subTab === 'members' && (
        <GymMembersList
          members={members}
          searchTerm={membersSearchTerm}
          isGymAdmin={isGymAdmin}
          gymRoleLoading={gymRoleLoading}
          onSearch={onSearchMembers}
          onAddMember={onAddMember}
          onUpdateMember={onUpdateMember}
          onDeleteMember={onDeleteMember}
        />
      )}

      {subTab === 'log' && (
        <GymCheckinLog
          checkins={checkins}
          currentPage={checkinsCurrentPage}
          totalPages={checkinsTotalPages}
          totalCount={checkinsTotalCount}
          searchTerm={checkinsSearchTerm}
          onSearch={onSearchCheckins}
          onPageChange={onCheckinsPageChange}
        />
      )}

      {subTab === 'access' && isGymAdmin && <GymAccessManager />}
    </div>
  );
};
