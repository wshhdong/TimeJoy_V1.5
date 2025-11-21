
import React from 'react';
import { User, UserRole } from '../types';

interface Props {
  user: User;
  currentTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export const Navigation: React.FC<Props> = ({ user, currentTab, onTabChange, onLogout }) => {
  const tabs = [
    { id: 'log', label: 'Log Activity' },
    { id: 'dashboard', label: 'My Dashboard' },
    { id: 'profile', label: 'My Profile' },
  ];

  if (user.role === UserRole.ADMIN) {
    tabs.push({ id: 'admin', label: 'Admin' });
  }

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex overflow-x-auto hide-scrollbar">
            <div className="flex-shrink-0 flex items-center mr-8">
                <span className="font-bold text-xl text-primary">TimeJoy</span>
            </div>
            <div className="flex space-x-4 items-center">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    currentTab === tab.id
                      ? 'bg-primary text-white'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center ml-4">
             <div className="text-sm text-gray-600 mr-4 hidden md:block">
                 Hi, <span className="font-bold">{user.username}</span>
             </div>
             <button 
                onClick={onLogout}
                className="text-sm text-red-500 hover:text-red-700 font-medium"
             >
                 Logout
             </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
