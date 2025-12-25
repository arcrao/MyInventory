import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Header: React.FC = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="bg-blue-600 text-white p-6 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management System</h1>
          <p className="text-blue-100 mt-1">Track and manage your business inventory</p>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-blue-700 px-4 py-2 rounded-lg">
              <User className="w-5 h-5" />
              <span className="text-sm">{user.email}</span>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
