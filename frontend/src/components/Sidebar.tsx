import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
    Home, Package, Users, ShoppingCart, FileText, 
    BarChart3, Activity, X, LogOut, Sparkles
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
                className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden transition-all duration-300 ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setIsOpen(false)}
            />
            
            {/* Sidebar */}
            <div className={`
                fixed top-0 left-0 h-full w-72 glass-dark z-40 border-r border-white/20
                transform transition-all duration-300 ease-out md:translate-x-0 
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                animate-slide-in-left
            `}>
                {/* Header */}
                <div className="flex items-center justify-between h-20 px-6 border-b border-white/10">
                    <div className="flex items-center">
                        <img
                            src={truePalLogo}
                            alt="TruePal Logo"
                            className="h-10 w-auto mr-3 drop-shadow-lg"
                        />
                        <div>
                            <h1 className="text-lg font-bold text-white">TruePal</h1>
                            <p className="text-xs text-white/60">Inventory System</p>
                        </div>
                    </div>
                    <button 
                        className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 md:hidden" 
                        onClick={() => setIsOpen(false)}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                    {navigation.filter(item => !item.adminOnly || isAdmin).map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={handleNavClick}
                                className={({ isActive }) =>
                                    `group flex items-center w-full px-4 py-3 text-sm font-medium rounded-2xl 
                                    transition-all duration-200 transform hover:scale-105 hover:-translate-y-0.5
                                    ${isActive
                                        ? 'bg-white/20 text-white shadow-soft backdrop-blur-md border border-white/30'
                                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                                    }`
                                }
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Icon className="mr-4 h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110" />
                                        <span className="transition-all duration-200">{item.name}</span>
                                        
                                        {/* Active indicator */}
                                        {isActive && (
                                            <div className="ml-auto flex items-center">
                                                <Sparkles className="h-4 w-4 text-white/80 animate-pulse" />
                                            </div>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* User info and logout */}
                <div className="p-4 border-t border-white/10">
                    <div className="glass rounded-2xl p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center flex-1 min-w-0">
                                <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mr-3 shadow-soft">
                                    <span className="text-sm font-bold text-white">
                                        {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-white truncate text-sm">
                                        {user?.fullName}
                                    </p>
                                    <p className="text-white/60 text-xs truncate">
                                        {user?.role} • {user?.username}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="ml-3 p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 transform hover:scale-110"
                                title="Logout"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                        
                        {/* Status indicator */}
                        <div className="mt-3 flex items-center text-xs text-white/60">
                            <div className="w-2 h-2 bg-success-400 rounded-full mr-2 animate-pulse" />
                            Online
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Sidebar;