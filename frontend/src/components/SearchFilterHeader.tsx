import React from 'react';
import { Search, Filter, X, Calendar, RefreshCw } from 'lucide-react';
import { Input, Button } from './shared';

export interface FilterOption {
    value: string;
    label: string;
}

export interface SearchFilterConfig {
    // Main search
    searchPlaceholder?: string;
    searchValue: string;
    onSearchChange: (value: string) => void;
    
    // Date filters
    showDateFilters?: boolean;
    startDate?: string;
    endDate?: string;
    onStartDateChange?: (value: string) => void;
    onEndDateChange?: (value: string) => void;
    
    // Dropdown filters
    filters?: {
        label: string;
        value: string;
        onChange: (value: string) => void;
        options: FilterOption[];
        placeholder?: string;
    }[];
    
    // Additional text filters
    textFilters?: {
        label: string;
        placeholder: string;
        value: string;
        onChange: (value: string) => void;
        icon?: React.ElementType;
    }[];
    
    // Reset functionality
    onReset?: () => void;
    
    // Results info
    totalResults?: number;
    filteredResults?: number;
}

interface SearchFilterHeaderProps {
    config: SearchFilterConfig;
    title?: string;
    className?: string;
}

export const SearchFilterHeader: React.FC<SearchFilterHeaderProps> = ({ 
    config, 
    title = "Search & Filters",
    className = ""
}) => {
    const hasActiveFilters = () => {
        if (config.searchValue) return true;
        if (config.startDate || config.endDate) return true;
        if (config.filters?.some(f => f.value)) return true;
        if (config.textFilters?.some(f => f.value)) return true;
        return false;
    };

    return (
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    {config.totalResults !== undefined && (
                        <span className="text-sm text-gray-500">
                            ({config.filteredResults || 0} of {config.totalResults} results)
                        </span>
                    )}
                </div>
                
                {hasActiveFilters() && config.onReset && (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={config.onReset}
                        className="flex items-center space-x-1"
                    >
                        <RefreshCw className="h-4 w-4" />
                        <span className="hidden sm:inline">Clear All</span>
                    </Button>
                )}
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                {/* Main Search - Always takes up more space */}
                <div className="lg:col-span-4 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={config.searchPlaceholder || "Search..."}
                            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            value={config.searchValue}
                            onChange={(e) => config.onSearchChange(e.target.value)}
                        />
                        {config.searchValue && (
                            <button
                                onClick={() => config.onSearchChange('')}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Dropdown Filters */}
                {config.filters?.map((filter, index) => (
                    <div key={index} className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {filter.label}
                        </label>
                        <select
                            className="w-full py-2 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            value={filter.value}
                            onChange={(e) => filter.onChange(e.target.value)}
                        >
                            <option value="">{filter.placeholder || `All ${filter.label}`}</option>
                            {filter.options.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}

                {/* Date Filters */}
                {config.showDateFilters && (
                    <>
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Start Date
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <input
                                    type="date"
                                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    value={config.startDate || ''}
                                    onChange={(e) => config.onStartDateChange?.(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                End Date
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <input
                                    type="date"
                                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    value={config.endDate || ''}
                                    onChange={(e) => config.onEndDateChange?.(e.target.value)}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Additional Text Filters */}
                {config.textFilters?.map((filter, index) => (
                    <div key={index} className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {filter.label}
                        </label>
                        <div className="relative">
                            {filter.icon && <filter.icon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />}
                            <input
                                type="text"
                                placeholder={filter.placeholder}
                                className={`${filter.icon ? 'pl-10' : 'pl-4'} pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                                value={filter.value}
                                onChange={(e) => filter.onChange(e.target.value)}
                            />
                            {filter.value && (
                                <button
                                    onClick={() => filter.onChange('')}
                                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters() && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Active filters:</span>
                        
                        {config.searchValue && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Search: "{config.searchValue}"
                                <button
                                    onClick={() => config.onSearchChange('')}
                                    className="ml-1 text-blue-600 hover:text-blue-800"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        )}

                        {config.filters?.map((filter, index) => 
                            filter.value ? (
                                <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {filter.label}: {filter.options.find(o => o.value === filter.value)?.label}
                                    <button
                                        onClick={() => filter.onChange('')}
                                        className="ml-1 text-green-600 hover:text-green-800"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ) : null
                        )}

                        {config.startDate && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                From: {config.startDate}
                                <button
                                    onClick={() => config.onStartDateChange?.('')}
                                    className="ml-1 text-purple-600 hover:text-purple-800"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        )}

                        {config.endDate && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                To: {config.endDate}
                                <button
                                    onClick={() => config.onEndDateChange?.('')}
                                    className="ml-1 text-purple-600 hover:text-purple-800"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        )}

                        {config.textFilters?.map((filter, index) => 
                            filter.value ? (
                                <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    {filter.label}: "{filter.value}"
                                    <button
                                        onClick={() => filter.onChange('')}
                                        className="ml-1 text-orange-600 hover:text-orange-800"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ) : null
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchFilterHeader;