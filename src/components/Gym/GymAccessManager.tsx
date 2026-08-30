import React, { useEffect, useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { GymRole, GymRoleEntry } from '../../types';
import { StorageService } from '../../services/storage.service';

export const GymAccessManager: React.FC = () => {
  const [roles, setRoles] = useState<GymRoleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<GymRole>('gym_staff');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const data = await StorageService.listGymRoles();
      setRoles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gym access list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setSaving(true);
    try {
      await StorageService.grantGymRole(email.trim(), role);
      setEmail('');
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grant gym access');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (entry: GymRoleEntry) => {
    if (!confirm(`Remove gym access for ${entry.email}?`)) return;

    try {
      await StorageService.revokeGymRole(entry.userId);
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke gym access');
    }
  };

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold mb-4">Gym Access</h2>
      <p className="text-sm text-gray-600 mb-4">
        Grant or revoke access to the Gym module. This is separate from Products access -
        someone can have Gym access without seeing Products, and vice versa.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleGrant} className="bg-white border rounded-lg p-4 mb-4 flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com (must already have an account)"
          className="flex-1 border rounded px-3 py-2 min-h-[44px]"
          required
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as GymRole)}
          className="border rounded px-3 py-2 bg-white min-h-[44px]"
        >
          <option value="gym_staff">Gym Staff (scan + view)</option>
          <option value="gym_admin">Gym Admin (+ manage members &amp; access)</option>
        </select>
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2 min-h-[44px]"
        >
          <UserPlus className="w-4 h-4" />
          {saving ? 'Granting...' : 'Grant Access'}
        </button>
      </form>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="divide-y">
          {roles.map((entry) => (
            <div key={entry.userId} className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{entry.email}</div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    entry.role === 'gym_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {entry.role === 'gym_admin' ? 'Gym Admin' : 'Gym Staff'}
                </span>
              </div>
              <button
                onClick={() => handleRevoke(entry)}
                className="text-red-600 hover:text-red-800 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Revoke access"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {!loading && roles.length === 0 && (
          <div className="text-center py-12 text-gray-500">No one has been granted Gym access yet.</div>
        )}
      </div>
    </div>
  );
};
