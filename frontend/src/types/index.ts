// Core Data Types
export interface CategoryDto {
    id?: number;
    name: string;
    description?: string;
    createdAt?: string;
}

export interface MachineDto {
    model: string;
    quantity: number;
    serialNumber?: string;
}

export interface CustomerDto {
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

export interface PartDto {
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
    lastUpdated?: string;
    createdAt?: string;
    location?: string;
    supplier?: string;
    machineModels?: string[];
}

export interface TransactionItemDto {
    id?: number;
    transactionId?: number;
    partId: number;
    partName?: string;
    partNumber?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

export interface TransactionDto {
    id?: number;
    type: 'IN' | 'OUT' | 'ADJUSTMENT';
    recipientName?: string;
    reason?: string;
    isPaid: boolean;
    amountPaid: number;
    totalAmount: number;
    transactionDate?: string;
    notes?: string;
    currency?: 'USD' | 'QAR';
    items: TransactionItemDto[];
    createdAt?: string;
}

export interface InvoiceItemDto {
    id?: number;
    invoiceId?: number;
    partId: number;
    partName: string;
    partNumber: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

export interface InvoiceDto {
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
    transactionDate?: string;
    createdAt?: string;
    currency?: 'USD' | 'QAR';
    items: InvoiceItemDto[];
}

export interface TransactionWithInvoicesDto {
    transaction: TransactionDto;
    invoices: InvoiceDto[];
}

// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface DeletePartResult {
    success: boolean;
    message: string;
    errorType?: 'NOT_FOUND' | 'CONSTRAINT_VIOLATION' | 'SYSTEM_ERROR' | 'HAS_DEPENDENCIES';
    dependenciesRemoved?: number;
    dependenciesFound?: number;
}

export interface StockUpdateRequest {
    partId: number;
    newStock: number;
}

export interface StockUpdateResult {
    partId: number;
    success: boolean;
    errorMessage?: string;
}

export interface BulkUpdateResult {
    totalRequests: number;
    successCount: number;
    failureCount: number;
    results: StockUpdateResult[];
}

export interface ValidationResult {
    isValid: boolean;
    message: string;
}

// UI Types
export type SortDirection = 'ascending' | 'descending';

export interface SortConfig<T> {
    key: keyof T | null;
    direction: SortDirection;
}

export interface CategoryOption {
    value: string;
    label: string;
}

// Context Types
export interface TransactionModalContextType {
    showTransactionModal: (initialPart?: PartDto) => void;
}