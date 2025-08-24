import React, { useState, useEffect, useMemo } from 'react';
import { Printer, Download } from 'lucide-react';
import { Input, Spinner, Pagination, SearchFilterHeader, SearchFilterConfig } from '../components/shared';
import { useSortableData } from '../hooks';
import { useCurrency, Currency } from '../contexts/CurrencyContext';
import { api, API_BASE } from '../services/api';
import { InvoiceDto } from '../types';

export function Invoices() {
    const { formatPrice } = useCurrency();
    const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    useEffect(() => { 
        loadInvoices(); 
    }, []);

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

    const { items: sortedInvoices, SortableHeader } = useSortableData(
        filteredInvoices, 
        { key: 'createdAt', direction: 'descending' }
    );

    // Search filter configuration
    const searchFilterConfig: SearchFilterConfig = {
        searchPlaceholder: "Search by invoice #, transaction ID, or recipient...",
        searchValue: searchQuery,
        onSearchChange: setSearchQuery,
        
        showDateFilters: true,
        startDate: startDate,
        endDate: endDate,
        onStartDateChange: setStartDate,
        onEndDateChange: setEndDate,
        
        onReset: () => {
            setSearchQuery('');
            setStartDate('');
            setEndDate('');
        },
        
        totalResults: invoices.length,
        filteredResults: filteredInvoices.length
    };

    const paginatedInvoices = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [currentPage, sortedInvoices]);

    useEffect(() => { 
        setCurrentPage(1); 
    }, [searchQuery, startDate, endDate]);

    const loadInvoices = async () => {
        setLoading(true);
        try {
            const response = await api.getInvoices();
            if (response.success && response.data) setInvoices(response.data);
        } catch (error) { 
            console.error('Failed to load invoices:', error); 
        } finally { 
            setLoading(false); 
        }
    };

    const handlePrintInvoice = (invoiceId: number) => 
        window.open(`${API_BASE}/invoices/${invoiceId}/html`, '_blank');

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
            
            <SearchFilterHeader 
                config={searchFilterConfig}
                title="Invoices Search & Filters"
            />

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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                                        {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {invoice.recipientName || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                                        {invoice.type.replace('_', ' ')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatPrice(invoice.totalAmount || 0, invoice.currency as Currency)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end items-center space-x-2">
                                            <button 
                                                onClick={() => handlePrintInvoice(invoice.id!)} 
                                                className="text-blue-600 hover:text-blue-900" 
                                                title="Print"
                                            >
                                                <Printer className="h-4 w-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDownloadPDF(invoice.id!, invoice.invoiceNumber)} 
                                                className="text-green-600 hover:text-green-900" 
                                                title="Download"
                                            >
                                                <Download className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination 
                    totalItems={sortedInvoices.length} 
                    itemsPerPage={ITEMS_PER_PAGE} 
                    currentPage={currentPage} 
                    onPageChange={setCurrentPage} 
                />
            </div>
        </div>
    );
}

export default Invoices;