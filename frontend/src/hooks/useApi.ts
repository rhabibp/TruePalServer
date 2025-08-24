import { useAuth } from '../contexts/AuthContext';
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

export const useApi = () => {
    const { token } = useAuth();

    const request = async <T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> => {
        try {
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
                const errorBody = await response.json().catch(() => ({ 
                    error: 'Request failed with status ' + response.status 
                }));
                return { success: false, error: errorBody.error || 'Unknown server error' };
            }
            return await response.json();
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    };

    return {
        // Categories
        getCategories: () => request<CategoryDto[]>('/categories'),
        createCategory: (data: Omit<CategoryDto, 'id'>) =>
            request<CategoryDto>('/categories', { method: 'POST', body: JSON.stringify(data) }),
        updateCategory: (id: number, data: Partial<CategoryDto>) =>
            request<CategoryDto>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteCategory: (id: number) =>
            request<boolean>(`/categories/${id}`, { method: 'DELETE' }),

        // Parts
        getParts: () => request<PartDto[]>('/parts'),
        searchParts: (query: string) => request<PartDto[]>(`/parts/search?q=${encodeURIComponent(query)}`),
        getPartsByCategory: (categoryId: number) => request<PartDto[]>(`/parts/category/${categoryId}`),
        getPartHistory: (partId: number) => request<TransactionItemDto[]>(`/parts/${partId}/history`),
        validatePartNumber: (partNumber: string, excludeId?: number) => {
            const params = excludeId ? `?excludeId=${excludeId}` : '';
            return request<ValidationResult>(`/parts/validate/part-number/${encodeURIComponent(partNumber)}${params}`);
        },
        createPart: (data: any) =>
            request<PartDto>('/parts', { method: 'POST', body: JSON.stringify(data) }),
        updatePart: (id: number, data: any) =>
            request<PartDto>(`/parts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deletePart: (id: number) =>
            request<DeletePartResult>(`/parts/${id}`, { method: 'DELETE' }),
        updatePartStock: (id: number, newStock: number) =>
            request<boolean>(`/parts/${id}/stock`, { 
                method: 'PUT', 
                body: JSON.stringify({ partId: id, newStock }) 
            }),
        bulkUpdateStock: (updates: StockUpdateRequest[]) =>
            request<BulkUpdateResult>('/parts/bulk-stock-update', { 
                method: 'POST', 
                body: JSON.stringify(updates) 
            }),

        // Transactions
        getTransactions: () => request<TransactionDto[]>('/transactions'),
        createTransaction: (data: any) =>
            request<any>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
        updateTransaction: (id: number, data: any) =>
            request<TransactionDto>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteTransaction: (id: number) =>
            request<boolean>(`/transactions/${id}`, { method: 'DELETE' }),

        // Invoices
        getInvoices: () => request<InvoiceDto[]>('/invoices'),
        getInvoicesByTransaction: (transactionId: number) =>
            request<InvoiceDto[]>(`/invoices/transaction/${transactionId}`),
        createInvoicesForTransaction: (transactionId: number) =>
            request<InvoiceDto[]>(`/invoices/generate-bulk`, {
                method: 'POST',
                body: JSON.stringify({ transactionIds: [transactionId] })
            }),

        // Stats
        getStats: () => request<any>('/stats/inventory'),

        // Customers
        getCustomers: (searchQuery: string = '') =>
            request<CustomerDto[]>(`/customers?search=${encodeURIComponent(searchQuery)}`),
        createCustomer: (data: Omit<CustomerDto, 'id'>) =>
            request<CustomerDto>('/customers', { method: 'POST', body: JSON.stringify(data) }),
        updateCustomer: (id: number, data: Partial<CustomerDto>) =>
            request<boolean>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteCustomer: (id: number) =>
            request<boolean>(`/customers/${id}`, { method: 'DELETE' }),
    };
};