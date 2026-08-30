import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, LogIn, LogOut } from 'lucide-react';
import { GymCheckin } from '../../types';

interface GymCheckinLogProps {
  checkins: GymCheckin[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  searchTerm: string;
  onSearch: (term: string) => void;
  onPageChange: (page: number) => void;
}

export const GymCheckinLog: React.FC<GymCheckinLogProps> = ({
  checkins,
  currentPage,
  totalPages,
  totalCount,
  searchTerm,
  onSearch,
  onPageChange,
}) => {
  const [localSearch, setLocalSearch] = useState(searchTerm);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localSearch);
  };

  const formatDuration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return '-';
    const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const minutes = Math.round(ms / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return `${hours}h ${remMinutes}m`;
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl sm:text-2xl font-bold mb-3">Check-In / Check-Out Log</h2>
        <form onSubmit={handleSearchSubmit}>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name or code..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded w-full text-sm min-h-[44px]"
            />
          </div>
        </form>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        {checkins.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
            Showing {checkins.length} of {totalCount} entries
          </div>
        )}

        {/* Mobile Card View */}
        <div className="block md:hidden divide-y">
          {checkins.map((entry) => (
            <div key={entry.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="font-medium">{entry.memberName}</div>
                {entry.checkOutTime ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
                    <LogOut className="w-3 h-3" /> Checked out
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                    <LogIn className="w-3 h-3" /> Checked in
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mb-1">{entry.memberCode}</div>
              <div className="text-sm text-gray-700">
                In: {new Date(entry.checkInTime).toLocaleString()}
              </div>
              {entry.checkOutTime && (
                <div className="text-sm text-gray-700">
                  Out: {new Date(entry.checkOutTime).toLocaleString()}
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                Duration: {formatDuration(entry.checkInTime, entry.checkOutTime)}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Member</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Check-In</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Check-Out</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Duration</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {checkins.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{entry.memberName}</div>
                    <div className="text-xs text-gray-500">{entry.memberCode}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">{new Date(entry.checkInTime).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">
                    {entry.checkOutTime ? new Date(entry.checkOutTime).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">{formatDuration(entry.checkInTime, entry.checkOutTime)}</td>
                  <td className="px-4 py-3">
                    {entry.checkOutTime ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">Checked out</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Checked in</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {checkins.length === 0 && (
          <div className="text-center py-12 text-gray-500">No check-in records yet.</div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {currentPage * 50 + 1} to {Math.min((currentPage + 1) * 50, totalCount)} of {totalCount}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className={`px-3 py-1 rounded flex items-center gap-1 ${
                currentPage === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border hover:bg-gray-50'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className={`px-3 py-1 rounded flex items-center gap-1 ${
                currentPage >= totalPages - 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white border hover:bg-gray-50'
              }`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
