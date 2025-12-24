import React from 'react';

export const Header: React.FC = () => {
  return (
    <div className="bg-blue-600 text-white p-6 shadow-lg">
      <h1 className="text-3xl font-bold">Inventory Management System</h1>
      <p className="text-blue-100 mt-1">Track and manage your business inventory</p>
    </div>
  );
};
