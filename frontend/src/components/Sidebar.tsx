import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
    Home, Package, Users, ShoppingCart, FileText, 
    BarChart3, Activity, X, LogOut 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import truePalLogo from '../assets/truepal_logo.png';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
    const { user, logout, isAdmin } = useAuth();
    
    const navigation = [
        { name: 'Dashboard', to: '/', icon: Home, adminOnly: false },
        { name: 'Categories', to: '/categories', icon: Package, adminOnly: false },
        { name: 'Parts', to: '/parts', icon: Package, adminOnly: false },
        { name: 'Customers', to: '/customers', icon: Users, adminOnly: false },
        { name: 'Transactions', to: '/transactions', icon: ShoppingCart, adminOnly: false },
        { name: 'Invoices', to: '/invoices', icon: FileText, adminOnly: false },
        { name: 'Statistics', to: '/stats', icon: BarChart3, adminOnly: false },
        { name: 'Health Check', to: '/health', icon: Activity, adminOnly: false },
        { name: 'User Management', to: '/users', icon: Users, adminOnly: true },
    ];

    const handleLogout = () => {
        logout();
        setIsOpen(false);
    };

    const handleNavClick = () => {
        if (window.innerWidth < 768) { // md breakpoint
            setIsOpen(false);
        }
    };

    return (
        <>
            {/* Backdrop for mobile */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setIsOpen(false)}
            />
            
            {/* Sidebar */}
            <div className={`fixed top-0 left-0 h-full w-64 bg-gray-800 z-40 transform transition-transform md:translate-x-0 ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
                {/* Header */}
                <div className="flex items-center justify-between h-16 px-4 bg-gray-900">
                    <div className="flex items-center">
                        <img
                            src={truePalLogo}
                            alt="TruePal Logo"
                            className="h-8 w-auto mr-3"
                        />
                        <h1 className="text-lg font-bold text-white">TruePal Inventory</h1>
                    </div>
                    <button 
                        className="text-white md:hidden" 
                        onClick={() => setIsOpen(false)}
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="mt-5 flex-1 px-2 space-y-1">
                    {navigation.filter(item => !item.adminOnly || isAdmin).map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={handleNavClick}
                                className={({ isActive }) =>
                                    `${isActive
                                        ? 'bg-gray-900 text-white'
                                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                    } group flex items-center w-full px-2 py-2 text-sm font-medium rounded-md transition-colors`
                                }
                            >
                                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                                {item.name}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* User info and logout */}
                <div className="absolute bottom-0 w-full p-4 bg-gray-900">
                    <div className="flex items-center justify-between text-white text-sm">
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user?.fullName}</p>
                            <p className="text-gray-400 text-xs truncate">{user?.role}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="ml-2 p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                            title="Logout"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Sidebar;