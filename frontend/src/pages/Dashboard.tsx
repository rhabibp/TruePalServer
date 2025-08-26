import React, { useState, useEffect } from 'react';
import { Package, BarChart3, AlertTriangle, TrendingUp } from 'lucide-react';
import { Spinner } from '../components/shared';
import { useCurrency } from '../contexts/CurrencyContext';
import { api } from '../services/api';
import { PartDto } from '../types';

export function Dashboard() {
    const { formatPrice } = useCurrency();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const response = await api.getStats();
                if (response.success) setStats(response.data);
            } catch (error) {
                console.error('Failed to load stats:', error);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    if (loading) return <Spinner />;

    const statCards = [
        {
            title: 'Total Categories',
            value: stats?.totalCategories || 0,
            icon: Package,
            color: 'from-primary-500 to-primary-600',
            bgColor: 'bg-primary-50',
            iconColor: 'text-primary-600',
        },
        {
            title: 'Total Parts',
            value: stats?.totalParts || 0,
            icon: Package,
            color: 'from-success-500 to-success-600',
            bgColor: 'bg-success-50',
            iconColor: 'text-success-600',
        },
        {
            title: 'Total Value',
            value: formatPrice(stats?.totalValue || 0),
            icon: TrendingUp,
            color: 'from-warning-500 to-warning-600',
            bgColor: 'bg-warning-50',
            iconColor: 'text-warning-600',
        },
        {
            title: 'Low Stock Items',
            value: stats?.lowStockParts?.length || 0,
            icon: AlertTriangle,
            color: 'from-danger-500 to-danger-600',
            bgColor: 'bg-danger-50',
            iconColor: 'text-danger-600',
            pulse: (stats?.lowStockParts?.length || 0) > 0,
        },
    ];

    return (
        <div className="min-h-screen p-4 md:p-8 animate-fade-in">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-2">
                        Dashboard
                    </h1>
                    <p className="text-secondary-600">
                        Welcome back! Here's an overview of your inventory.
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {statCards.map((card, index) => {
                        const Icon = card.icon;
                        return (
                            <div 
                                key={card.title}
                                className={`
                                    card-modern group cursor-pointer transform transition-all duration-300 hover:-translate-y-1
                                    ${card.pulse ? 'animate-pulse-soft' : ''}
                                    hover:shadow-hard
                                `}
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-secondary-600 mb-1">
                                            {card.title}
                                        </p>
                                        <p className="text-2xl md:text-3xl font-bold text-secondary-900 mb-2">
                                            {card.value}
                                        </p>
                                    </div>
                                    <div className={`
                                        p-3 rounded-xl ${card.bgColor} 
                                        group-hover:scale-110 transition-transform duration-200
                                    `}>
                                        <Icon className={`h-6 w-6 ${card.iconColor}`} />
                                    </div>
                                </div>
                                
                                {/* Gradient bar */}
                                <div className="mt-4 h-1 bg-secondary-100 rounded-full overflow-hidden">
                                    <div className={`
                                        h-full bg-gradient-to-r ${card.color} 
                                        transform translate-x-0 group-hover:translate-x-1 transition-transform duration-500
                                        animate-pulse
                                    `} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Low Stock Alert */}
                {stats?.lowStockParts && stats.lowStockParts.length > 0 && (
                    <div className="card-modern animate-slide-up">
                        <div className="flex items-center justify-between p-6 border-b border-secondary-200/50">
                            <div className="flex items-center">
                                <div className="p-2 bg-danger-100 rounded-xl mr-3">
                                    <AlertTriangle className="h-5 w-5 text-danger-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-secondary-900">
                                        Low Stock Alert
                                    </h2>
                                    <p className="text-sm text-secondary-600">
                                        Items that need immediate attention
                                    </p>
                                </div>
                            </div>
                            <div className="bg-danger-100 text-danger-700 px-3 py-1 rounded-full text-sm font-medium">
                                {stats.lowStockParts.length} items
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {stats.lowStockParts.slice(0, 5).map((part: PartDto, index: number) => (
                                    <div 
                                        key={part.id} 
                                        className="flex items-center justify-between p-4 bg-danger-50 rounded-2xl border border-danger-200/50 hover:bg-danger-100/50 transition-all duration-200"
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 bg-danger-200 rounded-xl flex items-center justify-center mr-3">
                                                <Package className="h-5 w-5 text-danger-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-secondary-900">{part.name}</p>
                                                <p className="text-sm text-secondary-600">Part #: {part.partNumber}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-danger-600">
                                                Current: {part.currentStock}
                                            </p>
                                            <p className="text-xs text-secondary-500">
                                                Minimum: {part.minimumStock}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {stats.lowStockParts.length > 5 && (
                                <div className="mt-4 text-center">
                                    <p className="text-sm text-secondary-600">
                                        And {stats.lowStockParts.length - 5} more items need attention
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;