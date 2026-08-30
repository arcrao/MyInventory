import React, { useState } from 'react';
import { Plus, Edit2, Trash2, QrCode, Search } from 'lucide-react';
import { GymMember, GymMemberFormData } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { GymMemberForm } from './GymMemberForm';
import { MemberQRModal } from './MemberQRModal';

interface GymMembersListProps {
  members: GymMember[];
  searchTerm: string;
  onSearch: (term: string) => void;
  onAddMember: (data: GymMemberFormData) => Promise<GymMember>;
  onUpdateMember: (id: number, data: GymMemberFormData) => Promise<void>;
  onDeleteMember: (id: number) => Promise<void>;
}

export const GymMembersList: React.FC<GymMembersListProps> = ({
  members,
  searchTerm,
  onSearch,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
}) => {
  const { isAdmin, loading: adminLoading } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<GymMember | null>(null);
  const [qrMember, setQrMember] = useState<GymMember | null>(null);
  const [localSearch, setLocalSearch] = useState(searchTerm);

  const handleAdd = () => {
    setEditingMember(null);
    setShowForm(true);
  };

  const handleEdit = (member: GymMember) => {
    setEditingMember(member);
    setShowForm(true);
  };

  const handleSave = async (data: GymMemberFormData) => {
    if (editingMember) {
      await onUpdateMember(editingMember.id, data);
    } else {
      const newMember = await onAddMember(data);
      setShowForm(false);
      setEditingMember(null);
      setQrMember(newMember);
      return;
    }
    setShowForm(false);
    setEditingMember(null);
  };

  const handleDelete = (member: GymMember) => {
    if (confirm(`Are you sure you want to delete ${member.name}?`)) {
      onDeleteMember(member.id);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localSearch);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold">Gym Members</h2>
        {!adminLoading && isAdmin && (
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2 text-sm min-h-[44px] font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        )}
      </div>

      <form onSubmit={handleSearchSubmit} className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, code, or phone..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded w-full text-sm min-h-[44px]"
          />
        </div>
      </form>

      <div className="bg-white border rounded-lg overflow-hidden">
        {/* Mobile Card View */}
        <div className="block md:hidden divide-y">
          {members.map((member) => (
            <div key={member.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium">{member.name}</div>
                  <div className="text-xs text-gray-500">{member.memberCode}</div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {member.status}
                </span>
              </div>
              {member.phone && <div className="text-sm text-gray-600">{member.phone}</div>}
              {member.membershipType && <div className="text-sm text-gray-600">{member.membershipType}</div>}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setQrMember(member)}
                  className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200 flex items-center justify-center gap-2 text-sm min-h-[44px]"
                >
                  <QrCode className="w-4 h-4" />
                  QR Code
                </button>
                {!adminLoading && isAdmin && (
                  <>
                    <button
                      onClick={() => handleEdit(member)}
                      className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 min-h-[44px]"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(member)}
                      className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 min-h-[44px]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Member Code</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Phone</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Membership</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{member.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{member.memberCode}</td>
                  <td className="px-4 py-3 text-sm">{member.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm">{member.membershipType || '-'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setQrMember(member)}
                      className="text-gray-600 hover:text-gray-800 p-1"
                      title="Show QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    {!adminLoading && isAdmin && (
                      <>
                        <button
                          onClick={() => handleEdit(member)}
                          className="text-blue-600 hover:text-blue-800 p-1 ml-2"
                          title="Edit Member"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(member)}
                          className="text-red-600 hover:text-red-800 p-1 ml-2"
                          title="Delete Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {members.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No gym members yet. Click "Add Member" to get started.
          </div>
        )}
      </div>

      {showForm && (
        <GymMemberForm
          member={editingMember}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingMember(null);
          }}
        />
      )}

      {qrMember && <MemberQRModal member={qrMember} onClose={() => setQrMember(null)} />}
    </div>
  );
};
