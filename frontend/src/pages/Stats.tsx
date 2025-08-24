import React, { useState, useEffect } from 'react';
import { Package, BarChart3, AlertTriangle } from 'lucide-react';
import { Spinner } from '../components/shared';
import { api } from '../services/api';
import { PartDto } from '../types';

export function Stats() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        try {
            const response = await api.getStats();
            if (response.success) setStats(response.data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Spinner />;

    return (
        <div className="p-4 md:p-6">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">Statistics</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <Package className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Categories</p>
                            <p className="text-2xl font-bold text-gray-900">{stats?.totalCategories || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <Package className="h-8 w-8 text-green-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Parts</p>
                            <p className="text-2xl font-bold text-gray-900">{stats?.totalParts || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <BarChart3 className="h-8 w-8 text-purple-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Value</p>
                            <p className="text-2xl font-bold text-gray-900">
                                ${(stats?.totalValue || 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                            <p className="text-2xl font-bold text-gray-900">{stats?.lowStockParts?.length || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {stats?.lowStockParts && stats.lowStockParts.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                    <div className="px-4 md:px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">Low Stock Parts</h2>
                    </div>
                    <div className="p-4 md:p-6">
                        <div className="space-y-3">
                            {stats.lowStockParts.slice(0, 10).map((part: PartDto) => (
                                <div key={part.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900">{part.name}</p>
                                        <p className="text-sm text-gray-600">Part #: {part.partNumber}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-red-600">
                                            Current: {part.currentStock}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Min: {part.minimumStock}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Stats;