import React, { useState } from 'react';
import { Menu, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CurrencySelector } from './CurrencySelector';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout, isAdmin } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
  };

  return (
    <header className="glass border-b border-secondary-200/50 sticky top-0 z-30">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden p-2 rounded-xl text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100/50 transition-all duration-200 transform hover:scale-105"
            onClick={onMenuClick}
          >
            <span className="sr-only">Open main menu</span>
            <Menu className="h-6 w-6" />
          </button>

          {/* Page indicator - shows on mobile */}
          <div className="md:hidden flex items-center">
            <h1 className="text-lg font-semibold text-secondary-900">
              TruePal
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Currency Selector */}
            <CurrencySelector />
            
            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center text-sm rounded-2xl text-secondary-700 hover:text-secondary-900 bg-white/50 hover:bg-white/80 px-3 py-2 transition-all duration-200 transform hover:scale-105 shadow-soft"
              >
                <div className="flex items-center">
                  {/* User Avatar */}
                  <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mr-3 shadow-soft">
                    <span className="text-sm font-semibold text-white">
                      {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  
                  {/* User Info - hidden on mobile */}
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-secondary-900">
                      {user?.fullName}
                    </p>
                    <p className="text-xs text-secondary-600">
                      {user?.role}
                    </p>
                  </div>
                  
                  {/* Dropdown Arrow */}
                  <ChevronDown className={`ml-2 h-4 w-4 text-secondary-600 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white/95 backdrop-blur-md rounded-3xl shadow-hard border border-secondary-200/50 z-50 animate-slide-up">
                  <div className="p-2">
                    {/* User Info Section */}
                    <div className="px-4 py-4 border-b border-secondary-200/30">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mr-4 shadow-soft">
                          <span className="text-lg font-bold text-white">
                            {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-secondary-900">
                            {user?.fullName}
                          </p>
                          <p className="text-sm text-secondary-600">
                            {user?.email}
                          </p>
                          <div className="flex items-center mt-1">
                            <div className={`
                              px-2 py-1 rounded-full text-xs font-medium
                              ${isAdmin 
                                ? 'bg-warning-100 text-warning-700' 
                                : 'bg-success-100 text-success-700'
                              }
                            `}>
                              {user?.role} {isAdmin && '• Admin'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <button
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center w-full px-4 py-3 text-sm text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50 rounded-2xl transition-all duration-200 group"
                      >
                        <User className="mr-3 h-4 w-4 transition-transform group-hover:scale-110" />
                        Profile Settings
                      </button>

                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 text-sm text-secondary-600 hover:text-danger-700 hover:bg-danger-50 rounded-2xl transition-all duration-200 group"
                      >
                        <LogOut className="mr-3 h-4 w-4 transition-transform group-hover:scale-110" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
};

export default Header;