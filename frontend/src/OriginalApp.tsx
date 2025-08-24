
import React, { useState, useEffect, createContext, useContext, useMemo, useCallback } from 'react';
import {
    Search, Plus, Edit, Trash2, Package, ShoppingCart, FileText,
    BarChart3, Home, Eye, Download, Printer, AlertTriangle, ChevronUp,
    ChevronDown, Menu, X, Users
} from 'lucide-react';
import CreatableSelect from 'react-select/creatable';
import { SingleValue } from 'react-select';
import { Toaster, toast } from 'react-hot-toast';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import { Oval } from 'react-loader-spinner';


// ====================================================================================
// NEW: Reusable Spinner Component
// ====================================================================================
function Spinner() {
    return (
        <div className="flex justify-center items-center h-full">
            <Oval
                height={80}
                width={80}
                color="#4fa94d"
                wrapperStyle={{}}
                wrapperClass=""
                visible={true}
                ariaLabel='oval-loading'
                secondaryColor="#4fa94d"
                strokeWidth={2}
                strokeWidthSecondary={2}
            />
        </div>
    );
}

// ====================================================================================
// NEW: Transaction Modal Context for cross-component communication
// ====================================================================================
interface TransactionModalContextType {
    showTransactionModal: (initialPart?: PartDto) => void;
}

const TransactionModalContext = createContext<TransactionModalContextType | null>(null);

export const useTransactionModal = () => {
    const context = useContext(TransactionModalContext);
    if (!context) {
        throw new Error('useTransactionModal must be used within a TransactionModalProvider');
    }
    return context;
};

// ====================================================================================
// NEW: Reusable Pagination Component
// ====================================================================================
function Pagination({
    totalItems,
    itemsPerPage,
    currentPage,
    onPageChange,
}: {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
    onPageChange: (page: number) => void;
}) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    const handlePageClick = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            onPageChange(page);
        }
    };

    return (
        <div className="flex items-center justify-between py-3 bg-white px-4 md:px-6 border-t">
            <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center space-x-2">
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handlePageClick(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    Previous
                </Button>
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handlePageClick(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}

// ====================================================================================
// NEW: Reusable Sorting Hook
// ====================================================================================
type SortDirection = 'ascending' | 'descending';

interface SortConfig<T> {
    key: keyof T | null;
    direction: SortDirection;
}

const useSortableData = <T extends object>(
    items: T[],
    initialConfig: SortConfig<T> = { key: null, direction: 'ascending' }
) => {
    const [sortConfig, setSortConfig] = useState(initialConfig);

    const sortedItems = useMemo(() => {
        let sortableItems = [...items];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key!];
                const valB = b[sortConfig.key!];

                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;

                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;

                return 0;
            });
        }
        return sortableItems;
    }, [items, sortConfig]);

    const requestSort = (key: keyof T) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader = ({ sortKey, children, className = '' }: { sortKey: keyof T, children: React.ReactNode, className?: string }) => {
        const isSorted = sortConfig.key === sortKey;
        const Icon = isSorted ? (sortConfig.direction === 'ascending' ? ChevronUp : ChevronDown) : null;
        return (
            <th
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer ${className}`}
                onClick={() => requestSort(sortKey)}
            >
                <div className="flex items-center">
                    {children}
                    {Icon && <Icon className="h-4 w-4 ml-1" />}
                </div>
            </th>
        );
    };

    return { items: sortedItems, requestSort, sortConfig, SortableHeader };
};

// ====================================================================================
// NEW: Debounce Hook to fix search input focus issue
// ====================================================================================
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}


// Types matching your Kotlin DTOs exactly
interface CategoryDto {
    id?: number;
    name: string;
    description?: string;
    createdAt?: string;
}

interface PartDto {
    id?: number;
    name: string;
    description?: string;
    partNumber: string;
    categoryId: number;
    categoryName?: string;
    unitPrice: number;
    currentStock: number;
    minimumStock: number;
    maxStock?: number;
    location?: string;
    supplier?: string;
    machineModels?: string[];
    createdAt?: string;
    updatedAt?: string;
}

interface TransactionItemDto {
    id?: number;
    transactionId?: number;
    partId: number;
    partName?: string;
    partNumber?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

interface TransactionDto {
    id?: number;
    type: 'IN' | 'OUT' | 'ADJUSTMENT';
    recipientName?: string;
    reason?: string;
    isPaid: boolean;
    amountPaid: number;
    totalAmount: number;
    transactionDate?: string;
    notes?: string;
    items: TransactionItemDto[];
}

interface InvoiceItemDto {
    id?: number;
    invoiceId?: number;
    partId: number;
    partName: string;
    partNumber: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

interface InvoiceDto {
    id?: number;
    invoiceNumber: string;
    transactionId: number;
    type: 'CUSTOMER_COPY' | 'COMPANY_COPY';
    recipientName?: string;
    reason?: string;
    isPaid: boolean;
    amountPaid: number;
    totalAmount: number;
    notes?: string;
    createdAt?: string;
    companyName: string;
    companyAddress: string;
    companyPhone: string;
    companyEmail: string;
    items: InvoiceItemDto[];
}

interface TransactionWithInvoicesDto {
    transaction: TransactionDto;
    invoices: InvoiceDto[];
}

// ====================================================================================
// NEW: Customer DTOs
// ====================================================================================
interface MachineDto {
    model: string;
    quantity: number;
    serialNumber?: string;
}

interface CustomerDto {
    id?: number;
    name: string;
    machines: MachineDto[];
    contactName: string;
    contactPhone: string;
    address: string;
    contactEmail?: string;
    inCharge: string;
    businessType?: string;
}


interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
interface DeletePartResult {
    success: boolean;
    message: string;
    errorType?: 'NOT_FOUND' | 'CONSTRAINT_VIOLATION' | 'SYSTEM_ERROR' | 'HAS_DEPENDENCIES';
    dependenciesRemoved?: number;
    dependenciesFound?: number;
}

interface StockUpdateRequest {
    partId: number;
    newStock: number;
}

interface StockUpdateResult {
    partId: number;
    success: boolean;
    errorMessage?: string;
}

interface BulkUpdateResult {
    totalRequests: number;
    successCount: number;
    failureCount: number;
    results: StockUpdateResult[];
}

interface ValidationResult {
    isValid: boolean;
    message: string;
}

// API Service
const API_BASE = '/api';

const api = {
    async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                headers: { 'Content-Type': 'application/json' },
                ...options,
            });
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({ error: 'Request failed with status ' + response.status }));
                return { success: false, error: errorBody.error || 'Unknown server error' };
            }
            return await response.json();
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    },

    // Categories
    getCategories: () => api.request<CategoryDto[]>('/categories'),
    createCategory: (data: Omit<CategoryDto, 'id'>) =>
        api.request<CategoryDto>('/categories', { method: 'POST', body: JSON.stringify(data) }),
    updateCategory: (id: number, data: Partial<CategoryDto>) =>
        api.request<CategoryDto>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCategory: (id: number) =>
        api.request<boolean>(`/categories/${id}`, { method: 'DELETE' }),

    // Parts - Updated with new endpoints
    getParts: () => api.request<PartDto[]>('/parts'),
    searchParts: (query: string) => api.request<PartDto[]>(`/parts/search?q=${encodeURIComponent(query)}`),
    getPartsByCategory: (categoryId: number) => api.request<PartDto[]>(`/parts/category/${categoryId}`),
    getPartHistory: (partId: number) => api.request<TransactionItemDto[]>(`/parts/${partId}/history`),
    validatePartNumber: (partNumber: string, excludeId?: number) => {
        const params = excludeId ? `?excludeId=${excludeId}` : '';
        return api.request<ValidationResult>(`/parts/validate/part-number/${encodeURIComponent(partNumber)}${params}`);
    },
    createPart: (data: any) =>
        api.request<PartDto>('/parts', { method: 'POST', body: JSON.stringify(data) }),
    updatePart: (id: number, data: any) =>
        api.request<PartDto>(`/parts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePart: (id: number) =>
        api.request<DeletePartResult>(`/parts/${id}`, { method: 'DELETE' }), // Updated return type
    updatePartStock: (id: number, newStock: number) =>
        api.request<boolean>(`/parts/${id}/stock`, { 
            method: 'PUT', 
            body: JSON.stringify({ partId: id, newStock }) 
        }),
    bulkUpdateStock: (updates: StockUpdateRequest[]) =>
        api.request<BulkUpdateResult>('/parts/bulk-stock-update', { 
            method: 'POST', 
            body: JSON.stringify(updates) 
        }),

    // Transactions
    getTransactions: () => api.request<TransactionDto[]>('/transactions'),
    createTransaction: (data: any) =>
        api.request<any>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
    updateTransaction: (id: number, data: any) =>
        api.request<TransactionDto>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteTransaction: (id: number) =>
        api.request<boolean>(`/transactions/${id}`, { method: 'DELETE' }),

    // Invoices
    getInvoices: () => api.request<InvoiceDto[]>('/invoices'),
    getInvoicesByTransaction: (transactionId: number) =>
        api.request<InvoiceDto[]>(`/invoices/transaction/${transactionId}`),
    createInvoicesForTransaction: (transactionId: number) =>
        api.request<InvoiceDto[]>(`/invoices/generate-bulk`, {
            method: 'POST',
            body: JSON.stringify({ transactionIds: [transactionId] })
        }),

    // Stats
    getStats: () => api.request<any>('/stats/inventory'),

    // Customers
    getCustomers: (searchQuery: string = '') =>
        api.request<CustomerDto[]>(`/customers?search=${encodeURIComponent(searchQuery)}`),
    createCustomer: (data: Omit<CustomerDto, 'id'>) =>
        api.request<CustomerDto>('/customers', { method: 'POST', body: JSON.stringify(data) }),
    updateCustomer: (id: number, data: Partial<CustomerDto>) =>
        api.request<boolean>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCustomer: (id: number) =>
        api.request<boolean>(`/customers/${id}`, { method: 'DELETE' }),
};

// UI Components
function Button({
    variant = 'primary',
    size = 'md',
    children,
    className = '',
    ...props
}: {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
    className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    const variants = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        danger: 'bg-red-600 text-white hover:bg-red-700',
    };
    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    return (
        <button
            className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

function Input({
    label,
    error,
    className = '',
    ...props
}: {
    label?: string;
    error?: string;
    className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <input
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${error ? 'border-red-300' : 'border-gray-300'
                    }`}
                {...props}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
}

function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'lg'
}: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'md' | 'lg' | 'xl' | '2xl' | '3xl'
}) {
    if (!isOpen) return null;

    const sizeClasses = {
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-2 md:p-4">
                <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
                <div className={`relative bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]}`}>
                    <div className="flex items-center justify-between p-4 md:p-6 border-b">
                        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
                            ×
                        </button>
                    </div>
                    <div className="p-4 md:p-6">{children}</div>
                </div>
            </div>
        </div>
    );
}

// ====================================================================================
// NEW: Responsive Sidebar Component
// ====================================================================================
function Sidebar({
    currentPage,
    onNavigate,
    isOpen,
    setIsOpen
}: {
    currentPage: string;
    onNavigate: (page: string) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}) {
    const navigation = [
        { name: 'Dashboard', id: 'dashboard', icon: Home },
        { name: 'Categories', id: 'categories', icon: Package },
        { name: 'Parts', id: 'parts', icon: Package },
        { name: 'Customers', id: 'customers', icon: Users }, // NEW: Customers link
        { name: 'Transactions', id: 'transactions', icon: ShoppingCart },
        { name: 'Invoices', id: 'invoices', icon: FileText },
        { name: 'Statistics', id: 'stats', icon: BarChart3 },
    ];

    const handleNavigation = (page: string) => {
        onNavigate(page);
        if (window.innerWidth < 768) { // md breakpoint
            setIsOpen(false);
        }
    }

    return (
        <>
            {/* Backdrop for mobile */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
            />
            <div className={`fixed top-0 left-0 h-full w-64 bg-gray-800 z-40 transform transition-transform md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between h-16 px-4 bg-gray-900">
                    <h1 className="text-xl font-bold text-white">TruePal Inventory</h1>
                    <button className="text-white md:hidden" onClick={() => setIsOpen(false)}>
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <nav className="mt-5 flex-1 px-2 space-y-1">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleNavigation(item.id)}
                                className={`${currentPage === item.id
                                    ? 'bg-gray-900 text-white'
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                    } group flex items-center w-full px-2 py-2 text-sm font-medium rounded-md`}
                            >
                                <Icon className="mr-3 h-5 w-5" />
                                {item.name}
                            </button>
                        );
                    })}
                </nav>
            </div>
        </>
    );
}

// ====================================================================================
// NEW: Responsive Header for Mobile
// ====================================================================================
function Header({ onMenuClick }: { onMenuClick: () => void }) {
    return (
        <header className="bg-white shadow-sm md:hidden p-4 flex items-center">
            <button onClick={onMenuClick}>
                <Menu className="h-6 w-6 text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-800 ml-4">TruePal Inventory</h1>
        </header>
    );
}

// Page Components
function Dashboard() {
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

    return (
        <div className="p-4 md:p-6">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                        <h2 className="text-lg font-medium text-gray-900">Low Stock Alert</h2>
                    </div>
                    <div className="p-4 md:p-6">
                        <div className="space-y-3">
                            {stats.lowStockParts.slice(0, 5).map((part: PartDto) => (
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

function Categories() {
    const [categories, setCategories] = useState<CategoryDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '' });

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    const { items: sortedCategories, requestSort, SortableHeader } = useSortableData(categories, { key: 'name', direction: 'ascending' });

    const paginatedCategories = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedCategories.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [currentPage, sortedCategories]);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        setLoading(true);
        try {
            const response = await api.getCategories();
            if (response.success && response.data) {
                setCategories(response.data);
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await api.updateCategory(editingCategory.id!, formData);
                toast.success('Category updated successfully');
            } else {
                await api.createCategory(formData);
                toast.success('Category created successfully');
            }
            await loadCategories();
            resetForm();
        } catch (error) {
            console.error('Failed to save category:', error);
            toast.error('Failed to save category');
        }
    };

    const resetForm = () => {
        setShowModal(false);
        setEditingCategory(null);
        setFormData({ name: '', description: '' });
    };

    const handleEdit = (category: CategoryDto) => {
        setEditingCategory(category);
        setFormData({ name: category.name, description: category.description || '' });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        confirmAlert({
            title: 'Confirm to delete',
            message: 'Are you sure you want to delete this category?',
            buttons: [
                {
                    label: 'Yes',
                    onClick: async () => {
                        try {
                            await api.deleteCategory(id);
                            await loadCategories();
                            toast.success('Category deleted successfully');
                        } catch (error) {
                            console.error('Failed to delete category:', error);
                            toast.error('Failed to delete category');
                        }
                    }
                },
                {
                    label: 'No',
                }
            ]
        });
    };

    if (loading) return <Spinner />;

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Categories</h1>
                <Button onClick={() => setShowModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Category
                </Button>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <SortableHeader sortKey="name">Name</SortableHeader>
                                <SortableHeader sortKey="description">Description</SortableHeader>
                                <SortableHeader sortKey="createdAt" className="hidden sm:table-cell">Created</SortableHeader>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedCategories.map((category) => (
                                <tr key={category.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {category.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {category.description || 'No description'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                                        {category.createdAt ? new Date(category.createdAt).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(category)}
                                            className="text-blue-600 hover:text-blue-900 mr-3"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(category.id!)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    totalItems={sortedCategories.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            <Modal
                isOpen={showModal}
                onClose={resetForm}
                title={editingCategory ? 'Edit Category' : 'Add Category'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={resetForm}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {editingCategory ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

interface CategoryOption {
    value: string;
    label: string;
}

function Parts() {
    const [parts, setParts] = useState<PartDto[]>([]);
    const [categories, setCategories] = useState<CategoryDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingPart, setEditingPart] = useState<PartDto | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [machineModelFilter, setMachineModelFilter] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const { showTransactionModal } = useTransactionModal();

    const [formData, setFormData] = useState({
        name: '', description: '', partNumber: '', categoryId: '',
        unitPrice: '', initialStock: '', minimumStock: '', maxStock: '',
        location: '', supplier: '', machineModels: '',
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [partsResponse, categoriesResponse] = await Promise.all([
                api.getParts(),
                api.getCategories()
            ]);

            if (partsResponse.success && partsResponse.data) setParts(partsResponse.data);
            if (categoriesResponse.success && categoriesResponse.data) setCategories(categoriesResponse.data);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredParts = useMemo(() => {
        return parts.filter(part => {
            const queryLower = searchQuery.toLowerCase();
            const modelFilterLower = machineModelFilter.toLowerCase();
            const matchesSearchQuery = searchQuery === '' ||
                part.name.toLowerCase().includes(queryLower) ||
                part.partNumber.toLowerCase().includes(queryLower) ||
                (part.categoryName && part.categoryName.toLowerCase().includes(queryLower));
            const matchesModelFilter = machineModelFilter === '' ||
                (part.machineModels && part.machineModels.some(model => model.toLowerCase().includes(modelFilterLower)));
            return matchesSearchQuery && matchesModelFilter;
        });
    }, [searchQuery, machineModelFilter, parts]);

    const { items: sortedParts, SortableHeader } = useSortableData(filteredParts, { key: 'name', direction: 'ascending' });

    const paginatedParts = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedParts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [currentPage, sortedParts]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, machineModelFilter]);

    const resetForm = () => {
        setShowModal(false);
        setEditingPart(null);
        setFormData({
            name: '', description: '', partNumber: '', categoryId: '',
            unitPrice: '', initialStock: '', minimumStock: '', maxStock: '',
            location: '', supplier: '', machineModels: ''
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Base payload shared between create and update
        const partData = {
            name: formData.name,
            description: formData.description,
            partNumber: formData.partNumber,
            categoryId: parseInt(formData.categoryId),
            unitPrice: parseFloat(formData.unitPrice),
            minimumStock: parseInt(formData.minimumStock),
            maxStock: formData.maxStock ? parseInt(formData.maxStock) : undefined,
            location: formData.location,
            supplier: formData.supplier,
            machineModels: formData.machineModels.split(',').map(s => s.trim()).filter(Boolean),
        };

        try {
            if (editingPart) {
                // For updates, send the current stock value
                const updatePayload = { ...partData, currentStock: parseInt(formData.initialStock) };
                await api.updatePart(editingPart.id!, updatePayload);
                toast.success('Part updated successfully');
            } else {
                // For creation, send the initial stock value
                const createPayload = { ...partData, initialStock: parseInt(formData.initialStock) };
                await api.createPart(createPayload);
                toast.success('Part created successfully');
            }

            await loadData();
            resetForm();
        } catch (error) {
            console.error('Failed to save part:', error);
            toast.error('Failed to save part');
        }
    };

    const handleEdit = (part: PartDto) => {
        setEditingPart(part);
        setFormData({
            name: part.name,
            description: part.description || '',
            partNumber: part.partNumber,
            categoryId: part.categoryId.toString(),
            unitPrice: part.unitPrice.toString(),
            initialStock: part.currentStock.toString(), // The form field `initialStock` holds the `currentStock` when editing
            minimumStock: part.minimumStock.toString(),
            maxStock: part.maxStock?.toString() || '',
            location: part.location || '',
            supplier: part.supplier || '',
            machineModels: part.machineModels?.join(', ') || ''
        });
        setShowModal(true);
    };

     const handleDelete = async (id: number) => {
        confirmAlert({
            title: 'Confirm to delete',
            message: 'Are you sure you want to delete this part? This will also delete related transaction and invoice items.',
            buttons: [
                {
                    label: 'Yes',
                    onClick: async () => {
                        try {
                            const response = await api.deletePart(id);
                            if (response.success && response.data) {
                                const result = response.data;
                                if (result.success) {
                                    await loadData();
                                    
                                    // Show detailed success message
                                    let message = result.message;
                                    if (result.dependenciesRemoved && result.dependenciesRemoved > 0) {
                                        message += ` (${result.dependenciesRemoved} related records were automatically removed)`;
                                    }
                                    
                                    toast.success(message);
                                } else {
                                    // Handle specific error types
                                    switch (result.errorType) {
                                        case 'NOT_FOUND':
                                            toast.error('Part not found');
                                            break;
                                        case 'CONSTRAINT_VIOLATION':
                                        case 'HAS_DEPENDENCIES':
                                            toast.error(`Cannot delete part: ${result.message}`);
                                            break;
                                        default:
                                            toast.error(`Delete failed: ${result.message}`);
                                    }
                                }
                            } else {
                                toast.error(`Delete failed: ${response.error || 'Unknown error'}`);
                            }
                        } catch (error) {
                            console.error('Failed to delete part:', error);
                            toast.error('Failed to delete part due to network error');
                        }
                    }
                },
                {
                    label: 'No'
                }
            ]
        });
    };

    // Add new functions for additional part operations
    const handleUpdateStock = async (partId: number, newStock: number) => {
        try {
            const response = await api.updatePartStock(partId, newStock);
            if (response.success) {
                await loadData();
                toast.success('Stock updated successfully');
            } else {
                toast.error(`Stock update failed: ${response.error}`);
            }
        } catch (error) {
            console.error('Failed to update stock:', error);
            toast.error('Failed to update stock');
        }
    };

    const handleBulkStockUpdate = async (updates: StockUpdateRequest[]) => {
        try {
            const response = await api.bulkUpdateStock(updates);
            if (response.success && response.data) {
                const result = response.data;
                await loadData();
                
                if (result.failureCount === 0) {
                    toast.success(`Successfully updated stock for ${result.successCount} parts`);
                } else {
                    toast.success(`Updated ${result.successCount} parts, ${result.failureCount} failed`);
                }
            } else {
                toast.error(`Bulk update failed: ${response.error}`);
            }
        } catch (error) {
            console.error('Failed to bulk update stock:', error);
            toast.error('Failed to bulk update stock');
        }
    };

    const validatePartNumber = async (partNumber: string, excludeId?: number): Promise<boolean> => {
        try {
            const response = await api.validatePartNumber(partNumber, excludeId);
            if (response.success && response.data) {
                return response.data.isValid;
            }
            return false;
        } catch (error) {
            console.error('Failed to validate part number:', error);
            return false;
        }
    };


    const getStockStatus = (part: PartDto) => {
        if (part.currentStock <= part.minimumStock) return { label: 'Low Stock', color: 'text-red-600 bg-red-100' };
        if (part.maxStock && part.currentStock >= part.maxStock) return { label: 'Overstock', color: 'text-yellow-600 bg-yellow-100' };
        return { label: 'Normal', color: 'text-green-600 bg-green-100' };
    };

    const handleCreateCategory = async (inputValue: string) => {
        setIsCreatingCategory(true);
        try {
            const response = await api.createCategory({ name: inputValue, description: '' });
            if (response.success && response.data) {
                const newCategory = response.data;
                // Add the new category to the existing list and set it in the form
                setCategories(prev => [...prev, newCategory]);
                setFormData(prev => ({ ...prev, categoryId: newCategory.id!.toString() }));
                toast.success(`Category "${inputValue}" created successfully`);
            } else {
                toast.error(`Error: Could not create category "${inputValue}".`);
            }
        } catch (error) {
            console.error('Failed to create category:', error);
        } finally {
            setIsCreatingCategory(false);
        }
    };

    const categoryOptions = useMemo<CategoryOption[]>(() =>
        categories.map(c => ({
            value: c.id!.toString(),
            label: c.name,
        })),
        [categories]
    );

    if (loading) return <Spinner />;

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Parts</h1>
                <Button onClick={() => setShowModal(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Part
                </Button>
            </div>

            <div className="mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Search parts by name, number, category..."
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div className="relative flex-1">
                    <Package className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Filter by machine model..."
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        value={machineModelFilter} onChange={(e) => setMachineModelFilter(e.target.value)} />
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <SortableHeader sortKey="name">Part</SortableHeader>
                                <SortableHeader sortKey="categoryName" className="hidden sm:table-cell">Category</SortableHeader>
                                <SortableHeader sortKey="currentStock">Stock</SortableHeader>
                                <SortableHeader sortKey="unitPrice" className="hidden md:table-cell">Price</SortableHeader>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedParts.map((part) => {
                                const status = getStockStatus(part);
                                return (
                                    <tr key={part.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => showTransactionModal(part)}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{part.name}</div>
                                                <div className="text-sm text-gray-500">#{part.partNumber}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{part.categoryName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{part.currentStock}</div>
                                            <div className="text-sm text-gray-500">Min: {part.minimumStock}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">${part.unitPrice.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>{status.label}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end items-center space-x-2" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => handleEdit(part)} className="text-blue-600 hover:text-blue-900"><Edit className="h-4 w-4" /></button>
                                                <button onClick={() => handleDelete(part.id!)} className="text-red-600 hover:text-red-900"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    totalItems={sortedParts.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            <Modal isOpen={showModal} onClose={resetForm} title={editingPart ? 'Edit Part' : 'Add Part'} size="xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        <Input label="Part Number" value={formData.partNumber} onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <CreatableSelect
                            isClearable
                            required
                            isDisabled={isCreatingCategory}
                            isLoading={isCreatingCategory}
                            // CORRECTED: Explicitly typed `newValue` to fix the implicit 'any' error
                            onChange={(newValue: SingleValue<CategoryOption>) => setFormData({ ...formData, categoryId: newValue ? newValue.value : '' })}
                            onCreateOption={handleCreateCategory}
                            options={categoryOptions}
                            value={categoryOptions.find(c => c.value === formData.categoryId) || null}
                            placeholder="Search or create a category..."
                            styles={{
                                control: (base) => ({
                                    ...base,
                                    borderColor: '#d1d5db',
                                    boxShadow: 'none',
                                    '&:hover': { borderColor: '#9ca3af' },
                                }),
                                input: (base) => ({ ...base, "input:focus": { boxShadow: "none" } }),
                            }}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input label="Unit Price" type="number" step="0.01" value={formData.unitPrice} onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })} required />
                        <Input label={editingPart ? "Current Stock" : "Initial Stock"} type="number" value={formData.initialStock} onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })} required />
                        <Input label="Minimum Stock" type="number" value={formData.minimumStock} onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Max Stock (Optional)" type="number" value={formData.maxStock} onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })} />
                        <Input label="Location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                    </div>
                    <Input label="Supplier" value={formData.supplier} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} />
                    <Input label="Machine Models (comma-separated)" value={formData.machineModels} onChange={(e) => setFormData({ ...formData, machineModels: e.target.value })} placeholder="e.g. Model X, Model Y" />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea className="block w-full rounded-md border-gray-300 shadow-sm" rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                    </div>
                    <div className="flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
                        <Button type="submit" disabled={isCreatingCategory || !formData.categoryId}>{editingPart ? 'Update' : 'Create'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

// ====================================================================================
// CORRECTED: Customers Component with debounced search, pagination, sorting, and CSV Export
// ====================================================================================
function Customers() {
    const [customers, setCustomers] = useState<CustomerDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<CustomerDto | null>(null);

    // State for the search input field
    const [searchQuery, setSearchQuery] = useState('');
    // Debounced search query to be used for API calls
    const debouncedSearchQuery = useDebounce(searchQuery, 500);

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const initialFormData: Omit<CustomerDto, 'id'> = {
        name: '', contactName: '', contactPhone: '', address: '',
        contactEmail: '', inCharge: '', businessType: '', machines: [{ model: '', quantity: 1, serialNumber: '' }]
    };
    const [formData, setFormData] = useState(initialFormData);

    // Sorting and Pagination
    const { items: sortedCustomers, requestSort, SortableHeader } = useSortableData(customers, { key: 'name', direction: 'ascending' });

    const paginatedCustomers = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [currentPage, sortedCustomers]);

    const loadCustomersCallback = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.getCustomers(debouncedSearchQuery);
            if (response.success && response.data) {
                setCustomers(response.data);
            } else {
                setCustomers([]); // Clear data on error or no results
            }
        } catch (error) {
            console.error("Failed to load customers:", error);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearchQuery]);

    // Effect to load customers when debounced search query changes
    useEffect(() => {
        loadCustomersCallback();
    }, [loadCustomersCallback]);

    // Reset page to 1 when search query changes
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery]);


    const resetForm = () => {
        setShowModal(false);
        setEditingCustomer(null);
        setFormData(initialFormData);
    };

    const handleEdit = (customer: CustomerDto) => {
        setEditingCustomer(customer);
        setFormData({
            ...customer,
            machines: customer.machines.length > 0 ? customer.machines : [{ model: '', quantity: 1, serialNumber: '' }]
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        confirmAlert({
            title: 'Confirm to delete',
            message: 'Are you sure you want to delete this customer?',
            buttons: [
                {
                    label: 'Yes',
                    onClick: async () => {
                        try {
                            await api.deleteCustomer(id);
                            await loadCustomersCallback();
                            toast.success('Customer deleted successfully');
                        } catch (error) {
                            console.error("Failed to delete customer:", error);
                            toast.error('Failed to delete customer');
                        }
                    }
                },
                {
                    label: 'No'
                }
            ]
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...formData,
            machines: formData.machines.filter(m => m.model.trim() && m.quantity > 0)
        };

        try {
            if (editingCustomer) {
                await api.updateCustomer(editingCustomer.id!, payload);
                toast.success('Customer updated successfully');
            } else {
                await api.createCustomer(payload);
                toast.success('Customer created successfully');
            }
            await loadCustomersCallback();
            resetForm();
        } catch (error) {
            console.error("Failed to save customer:", error);
            toast.error('Failed to save customer');
        }
    };

    const handleMachineChange = (index: number, field: keyof MachineDto, value: string | number) => {
        const newMachines = [...formData.machines];
        const machine = { ...newMachines[index] };

        if (field === 'quantity') {
            machine.quantity = Math.max(0, Number(value) || 0);
        } else if (field === 'model') {
            machine.model = String(value);
        } else if (field === 'serialNumber') {
            machine.serialNumber = String(value);
        }

        newMachines[index] = machine;
        setFormData({ ...formData, machines: newMachines });
    };

    const addMachineLine = () => {
        setFormData(prev => ({ ...prev, machines: [...prev.machines, { model: '', quantity: 1, serialNumber: '' }] }));
    };

    const removeMachineLine = (index: number) => {
        setFormData(prev => ({ ...prev, machines: prev.machines.filter((_, i) => i !== index) }));
    };

    // NEW: Function to handle CSV Export
    const handleExportCSV = async () => {
        toast('Preparing to download all customers. This may take a moment.');
        const response = await api.getCustomers(''); // Fetch all customers
        if (!response.success || !response.data) {
            toast.error('Failed to fetch customer data for export.');
            return;
        }

        const customersToExport = response.data;

        // Helper to format a cell, wrapping in quotes and escaping existing quotes
        const escapeCsvCell = (cellData: any) => {
            const stringData = String(cellData ?? '');
            if (stringData.includes(',') || stringData.includes('"') || stringData.includes('\n')) {
                return `"${stringData.replace(/"/g, '""')}"`;
            }
            return stringData;
        };

        const headers = [
            'ID', 'Customer Name', 'Business Type', 'Contact Name', 'Contact Phone',
            'Contact Email', 'Address', 'In Charge', 'Machines'
        ];

        const csvRows = [headers.join(',')];

        for (const customer of customersToExport) {
            const machinesString = customer.machines
                .map(m => `${m.model} (Qty: ${m.quantity})`)
                .join('; '); // Use semicolon to avoid conflicts with CSV comma

            const row = [
                customer.id,
                customer.name,
                customer.businessType,
                customer.contactName,
                customer.contactPhone,
                customer.contactEmail,
                customer.address,
                customer.inCharge,
                machinesString
            ].map(escapeCsvCell);

            csvRows.push(row.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'customers.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Customers</h1>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExportCSV} variant="secondary">
                        <Download className="mr-2 h-4 w-4" /> Export to CSV
                    </Button>
                    <Button onClick={() => setShowModal(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Customer
                    </Button>
                </div>
            </div>

            <div className="mb-6 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search customers by name, contact, etc..."
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {loading && <Spinner />}

            {!loading && (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <SortableHeader sortKey="name">Customer</SortableHeader>
                                    <SortableHeader sortKey="contactName" className="hidden sm:table-cell">Contact</SortableHeader>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Machines</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {paginatedCustomers.map((customer) => (
                                    <tr key={customer.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                                            <div className="text-sm text-gray-500">{customer.businessType || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                            <div className="text-sm text-gray-900">{customer.contactName}</div>
                                            <div className="text-sm text-gray-500">{customer.contactPhone}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                                            {customer.machines.map(m => `${m.model} (SN: ${m.serialNumber || 'N/A'}, Qty: ${m.quantity})`).join(', ')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end items-center space-x-2">
                                                <button onClick={() => handleEdit(customer)} className="text-blue-600 hover:text-blue-900"><Edit className="h-4 w-4" /></button>
                                                <button onClick={() => handleDelete(customer.id!)} className="text-red-600 hover:text-red-900"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination
                        totalItems={sortedCustomers.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}


            <Modal isOpen={showModal} onClose={resetForm} title={editingCustomer ? "Edit Customer" : "Add Customer"} size="3xl">
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto p-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Customer Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        <Input label="Business Type" value={formData.businessType} onChange={e => setFormData({ ...formData, businessType: e.target.value })} />
                        <Input label="Contact Name" value={formData.contactName} onChange={e => setFormData({ ...formData, contactName: e.target.value })} required />
                        <Input label="Contact Phone" value={formData.contactPhone} onChange={e => setFormData({ ...formData, contactPhone: e.target.value })} required />
                        <Input label="Contact Email" type="email" value={formData.contactEmail} onChange={e => setFormData({ ...formData, contactEmail: e.target.value })} />
                        <Input label="In Charge" value={formData.inCharge} onChange={e => setFormData({ ...formData, inCharge: e.target.value })} required />
                    </div>
                    <Input label="Address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required />

                    <div className="space-y-3 pt-2">
                        <h4 className="text-md font-medium text-gray-800">Machines</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {formData.machines.map((machine, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-12 sm:col-span-5"><Input placeholder="Model" value={machine.model} onChange={e => handleMachineChange(index, 'model', e.target.value)} /></div>
                                    <div className="col-span-12 sm:col-span-4"><Input placeholder="Serial Number" value={machine.serialNumber || ''} onChange={e => handleMachineChange(index, 'serialNumber', e.target.value)} /></div>
                                    <div className="col-span-8 sm:col-span-2"><Input type="number" placeholder="Qty" min="1" value={machine.quantity} onChange={e => handleMachineChange(index, 'quantity', e.target.value)} /></div>
                                    <button type="button" onClick={() => removeMachineLine(index)} className="col-span-4 sm:col-span-1 text-red-600 flex justify-center"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            ))}
                        </div>
                        <Button type="button" size="sm" variant="secondary" onClick={addMachineLine}><Plus className="h-4 w-4 mr-1" /> Add Machine</Button>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
                        <Button type="submit">{editingCustomer ? 'Update' : 'Create'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function Transactions({ onDemandTransaction, clearOnDemand }: { onDemandTransaction?: { part: PartDto }, clearOnDemand: () => void }) {
    const [transactions, setTransactions] = useState<TransactionDto[]>([]);
    const [parts, setParts] = useState<PartDto[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalState, setModalState] = useState<{ type: 'create' | 'edit' | 'details' | 'invoices' | null; transaction: TransactionDto | null; }>({ type: null, transaction: null });
    const [transactionInvoices, setTransactionInvoices] = useState<InvoiceDto[]>([]);

    const [partSearchQuery, setPartSearchQuery] = useState('');
    const [partMachineModelFilter, setPartMachineModelFilter] = useState('');
    const [filteredParts, setFilteredParts] = useState<PartDto[]>([]);

    const [searchFilters, setSearchFilters] = useState({ query: '', type: '', isPaid: '', startDate: '', endDate: '' });

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    const initialFormData = {
        type: 'OUT' as 'IN' | 'OUT' | 'ADJUSTMENT',
        recipientName: '', reason: '', notes: '', isPaid: false, amountPaid: '',
        parts: [{ partId: '', quantity: '1', unitPrice: '' }]
    };
    const [formData, setFormData] = useState(initialFormData);
    const [calculatedTotal, setCalculatedTotal] = useState(0);

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        if (onDemandTransaction) {
            const { part } = onDemandTransaction;
            openModal('create', null, part);
            clearOnDemand();
        }
    }, [onDemandTransaction, clearOnDemand]);

    useEffect(() => {
        const total = formData.parts.reduce((sum, part) => {
            const qty = parseInt(part.quantity) || 0;
            const price = parseFloat(part.unitPrice) || 0;
            return sum + (qty * price);
        }, 0);
        setCalculatedTotal(total);
    }, [formData.parts]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const query = searchFilters.query.toLowerCase();
            const matchesQuery = !query || t.id?.toString().includes(query) || (t.recipientName || '').toLowerCase().includes(query);
            const matchesType = !searchFilters.type || t.type === searchFilters.type;
            const matchesPayment = !searchFilters.isPaid ||
                (searchFilters.isPaid === 'paid' && t.isPaid) ||
                (searchFilters.isPaid === 'unpaid' && !t.isPaid && (t.amountPaid || 0) === 0) ||
                (searchFilters.isPaid === 'partial' && !t.isPaid && (t.amountPaid || 0) > 0);

            const matchesDate = (() => {
                if (!searchFilters.startDate && !searchFilters.endDate) return true;
                if (!t.transactionDate) return false;
                const transactionDateTime = new Date(t.transactionDate).getTime();
                const start = searchFilters.startDate ? new Date(searchFilters.startDate).setHours(0, 0, 0, 0) : 0;
                const end = searchFilters.endDate ? new Date(searchFilters.endDate).setHours(23, 59, 59, 999) : Infinity;
                return transactionDateTime >= start && transactionDateTime <= end;
            })();
            return matchesQuery && matchesType && matchesPayment && matchesDate;
        });
    }, [searchFilters, transactions]);

    const { items: sortedTransactions, SortableHeader } = useSortableData(filteredTransactions, { key: 'transactionDate', direction: 'descending' });

    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [currentPage, sortedTransactions]);

    useEffect(() => { setCurrentPage(1); }, [searchFilters]);

    useEffect(() => {
        let tempParts = parts;
        const generalQuery = partSearchQuery.toLowerCase();
        const modelQuery = partMachineModelFilter.toLowerCase();
        if (generalQuery) tempParts = tempParts.filter(p => p.name.toLowerCase().includes(generalQuery) || p.partNumber.toLowerCase().includes(generalQuery));
        if (modelQuery) tempParts = tempParts.filter(p => p.machineModels && p.machineModels.some(m => m.toLowerCase().includes(modelQuery)));
        setFilteredParts((generalQuery || modelQuery) ? tempParts.slice(0, 10) : []);
    }, [partSearchQuery, partMachineModelFilter, parts]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [transRes, partsRes] = await Promise.all([api.getTransactions(), api.getParts()]);
            if (transRes.success && transRes.data) setTransactions(transRes.data);
            if (partsRes.success && partsRes.data) setParts(partsRes.data);
        } catch (error) { console.error('Failed to load data:', error); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isEditing = modalState.type === 'edit';

        try {
            const updatePayload = {
                recipientName: formData.recipientName || null,
                reason: formData.reason || null,
                notes: formData.notes || null,
                isPaid: formData.isPaid,
                amountPaid: parseFloat(formData.amountPaid) || 0.0,
            };

            const createPayload = {
                ...updatePayload, type: formData.type,
                parts: formData.parts.filter(p => p.partId && p.quantity).map(p => ({
                    partId: parseInt(p.partId),
                    quantity: parseInt(p.quantity),
                    unitPrice: p.unitPrice ? parseFloat(p.unitPrice) : null
                }))
            };

            if (!isEditing && createPayload.parts.length === 0) {
                toast.error("Please add at least one part.");
                return;
            }

            const response = isEditing
                ? await api.updateTransaction(modalState.transaction!.id!, updatePayload)
                : await api.createTransaction(createPayload);

            if (response.success) {
                await loadData();
                closeModal();
                toast.success(`Transaction ${isEditing ? 'updated' : 'created'} successfully`);
                if (!isEditing && formData.type === 'OUT' && response.data?.invoices?.length > 0) {
                    let invoiceToPrint = response.data.invoices.find((inv: InvoiceDto) => inv.type === 'CUSTOMER_COPY') || response.data.invoices[0];
                    if (invoiceToPrint?.id) window.open(`${API_BASE}/invoices/${invoiceToPrint.id}/html`, '_blank');
                }
            } else {
                toast.error(`Failed: ${response.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to save transaction:', error);
            toast.error('Failed to save transaction');
        }
    };

    const handleDelete = async (id: number) => {
        confirmAlert({
            title: 'Confirm to delete',
            message: 'Are you sure you want to delete this transaction? This will revert stock levels.',
            buttons: [
                {
                    label: 'Yes',
                    onClick: async () => {
                        await api.deleteTransaction(id);
                        await loadData();
                        toast.success('Transaction deleted successfully');
                    }
                },
                {
                    label: 'No'
                }
            ]
        });
    };

    const openModal = (type: NonNullable<typeof modalState.type>, transaction: TransactionDto | null = null, initialPart: PartDto | null = null) => {
        if ((type === 'edit' || type === 'details' || type === 'invoices') && !transaction) return;
        setModalState({ type, transaction });

        if (type === 'create' && initialPart) {
            setFormData({
                ...initialFormData,
                parts: [{
                    partId: initialPart.id!.toString(),
                    quantity: '1',
                    unitPrice: (initialPart.unitPrice || 0).toString()
                }]
            });
        } else if (type === 'edit' && transaction) {
            setFormData({
                type: transaction.type, recipientName: transaction.recipientName ?? '', reason: transaction.reason ?? '',
                notes: transaction.notes ?? '', isPaid: transaction.isPaid, amountPaid: (transaction.amountPaid ?? 0).toString(),
                parts: transaction.items.map(item => ({
                    partId: item.partId.toString(), quantity: item.quantity.toString(), unitPrice: (item.unitPrice ?? 0).toString(),
                }))
            });
        }

        if (type === 'invoices' && transaction) loadInvoicesForTransaction(transaction);
    };

    const loadInvoicesForTransaction = async (transaction: TransactionDto) => {
        try {
            let invRes = await api.getInvoicesByTransaction(transaction.id!);
            if (!invRes.success || !invRes.data || invRes.data.length === 0) {
                invRes = await api.createInvoicesForTransaction(transaction.id!);
            }
            setTransactionInvoices(invRes.data || []);
        } catch (error) { console.error('Failed to load invoices:', error); setTransactionInvoices([]); }
    };

    const closeModal = () => {
        setModalState({ type: null, transaction: null });
        setFormData(initialFormData);
        setPartSearchQuery('');
        setPartMachineModelFilter('');
    };

    const handlePaidCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setFormData(prev => ({ ...prev, isPaid: checked, amountPaid: checked ? calculatedTotal.toFixed(2) : '' }));
    };

    const addPartLine = () => setFormData(prev => ({ ...prev, parts: [...prev.parts, { partId: '', quantity: '1', unitPrice: '' }] }));
    const removePartLine = (index: number) => setFormData(prev => ({ ...prev, parts: prev.parts.filter((_, i) => i !== index) }));
    const updatePartLine = (index: number, field: string, value: string) => {
        const newParts = formData.parts.map((p, i) => i === index ? { ...p, [field]: value } : p);
        if (field === 'partId') {
            const selectedPart = parts.find(p => p.id === parseInt(value));
            if (selectedPart) newParts[index].unitPrice = (selectedPart.unitPrice || 0).toString();
        }
        setFormData(prev => ({ ...prev, parts: newParts }));
    };
    const addPartFromSearch = (part: PartDto) => {
        const emptyIndex = formData.parts.findIndex(p => !p.partId);
        const newPart = { partId: part.id!.toString(), quantity: '1', unitPrice: (part.unitPrice || 0).toString() };
        let newParts;
        if (emptyIndex > -1) { newParts = [...formData.parts]; newParts[emptyIndex] = newPart; }
        else { newParts = [...formData.parts, newPart]; }
        setFormData(prev => ({ ...prev, parts: newParts }));
        setPartSearchQuery(''); setPartMachineModelFilter('');
    };

    const getTransactionTypeColor = (type: string) => ({ 'IN': 'bg-green-100 text-green-600', 'OUT': 'bg-red-100 text-red-600', 'ADJUSTMENT': 'bg-blue-100 text-blue-600' }[type] || 'bg-gray-100 text-gray-600');
    const getPaymentStatus = (t: TransactionDto) => t.isPaid ? { l: 'Paid', c: 'bg-green-100 text-green-600' } : (t.amountPaid || 0) > 0 ? { l: 'Partial', c: 'bg-yellow-100 text-yellow-600' } : { l: 'Unpaid', c: 'bg-red-100 text-red-600' };

    if (loading) return <Spinner />;

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-xl md:text-2xl font-bold">Transactions</h1>
                <Button onClick={() => openModal('create')}><Plus className="mr-2 h-4 w-4" /> New Transaction</Button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Input placeholder="Search ID or Recipient..." value={searchFilters.query} onChange={e => setSearchFilters({ ...searchFilters, query: e.target.value })} className="md:col-span-2" />
                    <select className="w-full border-gray-300 rounded-md" value={searchFilters.type} onChange={e => setSearchFilters({ ...searchFilters, type: e.target.value })}>
                        <option value="">All Types</option> <option value="IN">Stock In</option> <option value="OUT">Stock Out</option> <option value="ADJUSTMENT">Adjustment</option>
                    </select>
                    <select className="w-full border-gray-300 rounded-md" value={searchFilters.isPaid} onChange={e => setSearchFilters({ ...searchFilters, isPaid: e.target.value })}>
                        <option value="">All Payment</option> <option value="paid">Paid</option> <option value="partial">Partial</option> <option value="unpaid">Unpaid</option>
                    </select>
                    <div className="lg:col-start-4"><Input type="date" value={searchFilters.startDate} onChange={e => setSearchFilters({ ...searchFilters, startDate: e.target.value })} /></div>
                    <div><Input type="date" value={searchFilters.endDate} onChange={e => setSearchFilters({ ...searchFilters, endDate: e.target.value })} /></div>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <SortableHeader sortKey="id">ID</SortableHeader>
                                <SortableHeader sortKey="transactionDate" className="hidden sm:table-cell">Date</SortableHeader>
                                <SortableHeader sortKey="type">Type</SortableHeader>
                                <SortableHeader sortKey="recipientName">Recipient</SortableHeader>
                                <SortableHeader sortKey="totalAmount">Amount</SortableHeader>
                                <SortableHeader sortKey="isPaid" className="hidden md:table-cell">Payment</SortableHeader>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedTransactions.map(t => {
                                const payment = getPaymentStatus(t);
                                return (
                                    <tr key={t.id}>
                                        <td className="px-6 py-4 font-medium text-gray-900">#{t.id}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">{t.transactionDate ? new Date(t.transactionDate).toLocaleDateString() : 'N/A'}</td>
                                        <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTransactionTypeColor(t.type)}`}>{t.type}</span></td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{t.recipientName || 'N/A'}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">${(t.totalAmount || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4 hidden md:table-cell"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${payment.c}`}>{payment.l}</span></td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            <div className="flex justify-end items-center space-x-2">
                                                <button onClick={() => openModal('details', t)} className="text-blue-600 hover:text-blue-900" title="View"><Eye className="h-4 w-4" /></button>
                                                <button onClick={() => openModal('edit', t)} className="text-yellow-600 hover:text-yellow-900" title="Edit"><Edit className="h-4 w-4" /></button>
                                                {t.type === 'OUT' && <button onClick={() => openModal('invoices', t)} className="text-green-600 hover:text-green-900" title="Invoices"><FileText className="h-4 w-4" /></button>}
                                                <button onClick={() => handleDelete(t.id!)} className="text-red-600 hover:text-red-900" title="Delete"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                <Pagination totalItems={sortedTransactions.length} itemsPerPage={ITEMS_PER_PAGE} currentPage={currentPage} onPageChange={setCurrentPage} />
            </div>

            <Modal isOpen={!!modalState.type} onClose={closeModal} size="2xl" title={
                modalState.type === 'create' ? 'New Transaction' :
                    modalState.type === 'edit' ? `Edit Transaction #${modalState.transaction?.id}` :
                        modalState.type === 'details' ? `Details for Transaction #${modalState.transaction?.id}` :
                            `Invoices for Transaction #${modalState.transaction?.id}`
            }>
                {(modalState.type === 'create' || modalState.type === 'edit') && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {modalState.type === 'create' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Type</label>
                                    <select className="block w-full rounded-md border-gray-300" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })} required >
                                        <option value="OUT">Stock Out</option> <option value="IN">Stock In</option> <option value="ADJUSTMENT">Adjustment</option>
                                    </select>
                                </div>
                            )}
                            <Input label="Recipient Name" value={formData.recipientName} onChange={e => setFormData({ ...formData, recipientName: e.target.value })} />
                            <Input label="Reason / Reference" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} />
                        </div>

                        <div className="p-4 bg-gray-50 rounded-md border">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-2 gap-2">
                                <h4 className="text-md font-medium text-gray-800">Payment</h4>
                                <span className="text-lg font-bold text-gray-900">Total: ${calculatedTotal.toFixed(2)}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input label="Amount Paid" type="number" step="0.01" value={formData.amountPaid} onChange={e => setFormData({ ...formData, amountPaid: e.target.value })} disabled={formData.isPaid} />
                                <div className="flex items-end pb-2">
                                    <input type="checkbox" id="isPaid" className="h-4 w-4" checked={formData.isPaid} onChange={handlePaidCheckboxChange} />
                                    <label htmlFor="isPaid" className="ml-2 text-sm font-medium">Fully Paid</label>
                                </div>
                            </div>
                        </div>

                        {modalState.type === 'create' && (
                            <div className="space-y-3 pt-2">
                                <h4 className="text-md font-medium text-gray-800">Parts</h4>
                                <div className="p-4 border rounded-md bg-gray-50">
                                    <label className="block text-sm font-medium">Find & Add Part</label>
                                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-1">
                                        <Input placeholder="Search name, number..." value={partSearchQuery} onChange={e => setPartSearchQuery(e.target.value)} className="flex-1" />
                                        <Input placeholder="Filter by machine model..." value={partMachineModelFilter} onChange={e => setPartMachineModelFilter(e.target.value)} className="flex-1" />
                                    </div>
                                    <div className="relative">
                                        {filteredParts.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border mt-1 rounded-md shadow-lg max-h-40 overflow-y-auto">{filteredParts.map(p => <div key={p.id} onClick={() => addPartFromSearch(p)} className="p-2 hover:bg-gray-100 cursor-pointer text-sm"><strong>{p.name}</strong> (#{p.partNumber}) - Stock: {p.currentStock}</div>)}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                    {formData.parts.map((part, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-md">
                                            <select className="col-span-12 sm:col-span-6 text-sm rounded-md border-gray-300" value={part.partId} onChange={e => updatePartLine(index, 'partId', e.target.value)} required>
                                                <option value="">Select Part</option>
                                                {parts.map(p => <option key={p.id} value={p.id}>{p.name} (#{p.partNumber})</option>)}
                                            </select>
                                            <div className="col-span-4 sm:col-span-2"><Input type="number" placeholder="Qty" min="1" value={part.quantity} onChange={e => updatePartLine(index, 'quantity', e.target.value)} required /></div>
                                            <div className="col-span-6 sm:col-span-3"><Input type="number" step="0.01" placeholder="Price" value={part.unitPrice} onChange={e => updatePartLine(index, 'unitPrice', e.target.value)} /></div>
                                            <button type="button" onClick={() => removePartLine(index)} className="col-span-2 sm:col-span-1 text-red-600 flex justify-center"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    ))}
                                </div>
                                <Button type="button" size="sm" variant="secondary" onClick={addPartLine}><Plus className="h-4 w-4 mr-1" /> Add Line</Button>
                            </div>
                        )}
                        <Input label="Notes" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                        <div className="flex justify-end space-x-3 pt-4">
                            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                            <Button type="submit">{modalState.type === 'edit' ? 'Update' : 'Create'}</Button>
                        </div>
                    </form>
                )}

                {modalState.type === 'details' && modalState.transaction && (
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                            <p><strong>Type:</strong> {modalState.transaction.type}</p>
                            <p><strong>Date:</strong> {new Date(modalState.transaction.transactionDate!).toLocaleString()}</p>
                            <p><strong>Recipient:</strong> {modalState.transaction.recipientName || 'N/A'}</p>
                            <p><strong>Reason:</strong> {modalState.transaction.reason || 'N/A'}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-md">
                            <strong>Notes:</strong>
                            <p className="mt-1 break-words">{modalState.transaction.notes || 'No notes for this transaction.'}</p>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Items</h4>
                            <ul className="divide-y border rounded-md max-h-60 overflow-y-auto">
                                {modalState.transaction.items.map(item => (
                                    <li key={item.id} className="p-3 grid grid-cols-3 gap-2">
                                        <div className="col-span-2">
                                            <div className="font-medium">{item.partName}</div>
                                            <div className="text-gray-500 text-xs">#{item.partNumber}</div>
                                        </div>
                                        <div className="text-right">
                                            <div>{item.quantity} x ${(item.unitPrice || 0).toFixed(2)}</div>
                                            <div className="font-semibold">${(item.lineTotal || 0).toFixed(2)}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex justify-end pt-4"><Button onClick={closeModal}>Close</Button></div>
                    </div>
                )}

                {modalState.type === 'invoices' && (
                    <div className="space-y-3">
                        {transactionInvoices.length > 0 ? transactionInvoices.map(inv => (
                            <div key={inv.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 bg-gray-50 rounded-md gap-3">
                                <div>
                                    <p className="font-medium text-gray-800">{inv.invoiceNumber}</p>
                                    <p className="text-sm text-gray-600">{inv.type.replace('_', ' ')} - ${(inv.totalAmount || 0).toFixed(2)}</p>
                                </div>
                                <div className="flex space-x-3 self-end sm:self-center">
                                    <button onClick={() => window.open(`${API_BASE}/invoices/${inv.id}/html`, '_blank')} className="text-blue-600 hover:text-blue-800" title="Print"><Printer className="h-5 w-5" /></button>
                                    <a href={`${API_BASE}/invoices/${inv.id}/pdf`} download={`invoice-${inv.invoiceNumber}.pdf`} className="text-green-600 hover:text-green-800" title="Download PDF"><Download className="h-5 w-5" /></a>
                                </div>
                            </div>
                        )) : <p className="text-center text-gray-500 py-4">No invoices found for this transaction.</p>}
                        <div className="flex justify-end pt-4"><Button onClick={closeModal}>Close</Button></div>
                    </div>
                )}

            </Modal>
        </div>
    );
}

function Invoices() {
    const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    useEffect(() => { loadInvoices(); }, []);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(invoice => {
            const matchesQuery = (() => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return invoice.invoiceNumber.toLowerCase().includes(q) ||
                    invoice.transactionId.toString().includes(q) ||
                    (invoice.recipientName || '').toLowerCase().includes(q);
            })();

            const matchesDate = (() => {
                if (!startDate && !endDate) return true;
                if (!invoice.createdAt) return false;
                const invoiceDateTime = new Date(invoice.createdAt).getTime();
                const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : 0;
                const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
                return invoiceDateTime >= start && invoiceDateTime <= end;
            })();

            return matchesQuery && matchesDate;
        });
    }, [invoices, searchQuery, startDate, endDate]);

    const { items: sortedInvoices, SortableHeader } = useSortableData(filteredInvoices, { key: 'createdAt', direction: 'descending' });

    const paginatedInvoices = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [currentPage, sortedInvoices]);

    useEffect(() => { setCurrentPage(1); }, [searchQuery, startDate, endDate]);


    const loadInvoices = async () => {
        setLoading(true);
        try {
            const response = await api.getInvoices();
            if (response.success && response.data) setInvoices(response.data);
        } catch (error) { console.error('Failed to load invoices:', error); }
        finally { setLoading(false); }
    };

    const handlePrintInvoice = (invoiceId: number) => window.open(`${API_BASE}/invoices/${invoiceId}/html`, '_blank');
    const handleDownloadPDF = (invoiceId: number, invoiceNumber: string) => {
        const link = document.createElement('a');
        link.href = `${API_BASE}/invoices/${invoiceId}/pdf`;
        link.download = `invoice-${invoiceNumber}.pdf`;
        link.click();
    };

    if (loading) return <Spinner />;

    return (
        <div className="p-4 md:p-6">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">Invoices</h1>
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input className="md:col-span-3" label="Search" placeholder="Invoice #, Txn ID, or Recipient..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <Input label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <SortableHeader sortKey="invoiceNumber">Invoice #</SortableHeader>
                                <SortableHeader sortKey="createdAt" className="hidden sm:table-cell">Date</SortableHeader>
                                <SortableHeader sortKey="recipientName">Recipient</SortableHeader>
                                <SortableHeader sortKey="type" className="hidden md:table-cell">Type</SortableHeader>
                                <SortableHeader sortKey="totalAmount">Amount</SortableHeader>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedInvoices.map((invoice) => (
                                <tr key={invoice.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                                        <div className="text-sm text-gray-500">Txn #{invoice.transactionId}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{new Date(invoice.createdAt!).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{invoice.recipientName || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{invoice.type.replace('_', ' ')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${invoice.totalAmount.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handlePrintInvoice(invoice.id!)} className="text-blue-600 hover:text-blue-900 mr-3" title="Print"><Printer className="h-4 w-4" /></button>
                                        <button onClick={() => handleDownloadPDF(invoice.id!, invoice.invoiceNumber)} className="text-green-600 hover:text-green-900" title="Download"><Download className="h-4 w-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination totalItems={sortedInvoices.length} itemsPerPage={ITEMS_PER_PAGE} currentPage={currentPage} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
}

function Stats() {
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
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Statistics</h1>

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
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">Low Stock Parts</h2>
                    </div>
                    <div className="p-6">
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
function HealthCheck() {
    const [healthStatus, setHealthStatus] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const checkHealth = async () => {
        setLoading(true);
        try {
            const response = await fetch('/health/database');
            const data = await response.json();
            setHealthStatus(data);
        } catch (error) {
            setHealthStatus({ error: 'Failed to check health' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkHealth();
    }, []);

    if (loading) return <div>Checking system health...</div>;

    return (
        <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">System Health</h2>
            {healthStatus && (
                <div className="bg-white p-4 rounded-lg shadow">
                    {healthStatus.error ? (
                        <div className="text-red-600">Error: {healthStatus.error}</div>
                    ) : (
                        <div>
                            <div className={`p-2 rounded ${healthStatus.constraints_valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                Database Constraints: {healthStatus.constraints_valid ? 'Valid' : 'Invalid'}
                            </div>
                            {healthStatus.issues && healthStatus.issues.length > 0 && (
                                <div className="mt-2">
                                    <h3 className="font-medium text-red-600">Issues:</h3>
                                    <ul className="list-disc list-inside">
                                        {healthStatus.issues.map((issue: string, index: number) => (
                                            <li key={index} className="text-red-600">{issue}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {healthStatus.successes && healthStatus.successes.length > 0 && (
                                <div className="mt-2">
                                    <h3 className="font-medium text-green-600">Successes:</h3>
                                    <ul className="list-disc list-inside">
                                        {healthStatus.successes.map((success: string, index: number) => (
                                            <li key={index} className="text-green-600">{success}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ====================================================================================
// Main App Component - Now with Context Provider & Responsive Layout
// ====================================================================================
export default function App() {
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [onDemandTransaction, setOnDemandTransaction] = useState<{ part: PartDto } | undefined>();

    const showTransactionModal = useCallback((initialPart?: PartDto) => {
        if (initialPart) {
            setOnDemandTransaction({ part: initialPart });
            setCurrentPage('transactions');
        }
    }, []);

    const clearOnDemand = useCallback(() => setOnDemandTransaction(undefined), []);

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard': return <Dashboard />;
            case 'categories': return <Categories />;
            case 'parts': return <Parts />;
            case 'customers': return <Customers />; // NEW: Render Customers page
            case 'transactions': return <Transactions onDemandTransaction={onDemandTransaction} clearOnDemand={clearOnDemand} />;
            case 'invoices': return <Invoices />;
            case 'stats': return <Stats />;
            case 'health': return <HealthCheck />;
            default: return <Dashboard />;
        }
    };

    return (
        <TransactionModalContext.Provider value={{ showTransactionModal }}>
            <div className="flex h-screen bg-gray-100">
                <Toaster position="top-center" reverseOrder={false} />
                <Sidebar
                    currentPage={currentPage}
                    onNavigate={setCurrentPage}
                    isOpen={isSidebarOpen}
                    setIsOpen={setIsSidebarOpen}
                />
                <div className="flex flex-col flex-1 md:ml-64">
                    <Header onMenuClick={() => setIsSidebarOpen(true)} />
                    <main className="flex-1 overflow-y-auto">
                        {renderPage()}
                    </main>
                </div>
            </div>
        </TransactionModalContext.Provider>
    );
}
