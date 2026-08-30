import React, { useState } from 'react';
import { X } from 'lucide-react';
import { GymMember, GymMemberFormData } from '../../types';

interface GymMemberFormProps {
  member: GymMember | null;
  onSave: (data: GymMemberFormData) => Promise<void>;
  onCancel: () => void;
}

export const GymMemberForm: React.FC<GymMemberFormProps> = ({ member, onSave, onCancel }) => {
  const [formData, setFormData] = useState<GymMemberFormData>({
    name: member?.name || '',
    phone: member?.phone || '',
    membershipType: member?.membershipType || '',
    status: member?.status || 'active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Member name is required');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSave(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onCancel}>
      <div
        className="bg-white rounded-lg max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 pb-4 border-b">
          <h2 className="text-xl font-bold">{member ? 'Edit Member' : 'Add Member'}</h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2 min-h-[44px]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full border rounded px-3 py-2 min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Membership Type</label>
            <input
              type="text"
              value={formData.membershipType}
              onChange={(e) => setFormData({ ...formData, membershipType: e.target.value })}
              placeholder="e.g. Monthly, Annual"
              className="w-full border rounded px-3 py-2 min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
              className="w-full border rounded px-3 py-2 bg-white min-h-[44px]"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 min-h-[44px]"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
