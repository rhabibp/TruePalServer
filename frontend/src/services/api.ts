import {
    ApiResponse,
    CategoryDto,
    PartDto,
    TransactionDto,
    TransactionItemDto,
    InvoiceDto,
    CustomerDto,
    DeletePartResult,
    StockUpdateRequest,
    BulkUpdateResult,
    ValidationResult
} from '../types';

const API_BASE = '/api';

export { API_BASE };

export const api = {
    async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
        try {
            // Get the auth token from localStorage
            const token = localStorage.getItem('auth_token');
            
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            
            // Add Authorization header if token exists
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${API_BASE}${endpoint}`, {
                headers,
                ...options,
                // Merge headers properly if options has headers
                ...(options?.headers && {
                    headers: { ...headers, ...options.headers }
                })
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

    // Parts
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
        api.request<DeletePartResult>(`/parts/${id}`, { method: 'DELETE' }),
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

export default api;