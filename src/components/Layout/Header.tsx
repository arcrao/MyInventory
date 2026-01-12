import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Header: React.FC = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="bg-blue-600 text-white p-4 md:p-6 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Inventory Management</h1>
          <p className="text-blue-100 mt-1 text-xs sm:text-sm">Track and manage your inventory</p>
        </div>
        {user && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-blue-700 px-3 py-2 rounded-lg min-h-[44px]">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm truncate">{user.email}</span>
            </div>
            <button
              onClick={signOut}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors min-h-[44px]"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
