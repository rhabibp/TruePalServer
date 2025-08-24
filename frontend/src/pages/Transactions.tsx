import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Eye, FileText, Printer, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { confirmAlert } from 'react-confirm-alert';
import { useLocation } from 'react-router-dom';
import { Button, Input, Modal, Spinner, Pagination, SearchFilterHeader, SearchFilterConfig, FilterOption, TableHeader, SortConfig } from '../components/shared';
import { useSortableData } from '../hooks';
import { useCurrency, Currency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import { api, API_BASE } from '../services/api';
import { TransactionDto, PartDto, InvoiceDto } from '../types';

export function Transactions() {
    const location = useLocation();
    const { formatPrice, currency } = useCurrency();
    
    // Helper function to format dates properly (avoiding timezone conversion)
    const formatDate = (dateString: string) => {
        try {
            // If dateString contains only date (no time), treat as local date
            if (dateString.includes('T')) {
                // Has time component, format normally
                const date = new Date(dateString);
                return date.toLocaleDateString();
            } else {
                // Only date, create as local date to avoid timezone shift
                const [year, month, day] = dateString.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                return date.toLocaleDateString();
            }
        } catch (error) {
            return 'N/A';
        }
    };
    
    const formatDateTime = (dateString: string) => {
        try {
            if (dateString.includes('T')) {
                // Has time component
                const date = new Date(dateString);
                return date.toLocaleString();
            } else {
                // Only date, show as date only
                const [year, month, day] = dateString.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                return date.toLocaleDateString() + ', 12:00:00 AM';
            }
        } catch (error) {
            return 'N/A';
        }
    };
    const { isAdmin } = useAuth();
    const [transactions, setTransactions] = useState<TransactionDto[]>([]);
    const [parts, setParts] = useState<PartDto[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalState, setModalState] = useState<{ 
        type: 'create' | 'edit' | 'details' | 'invoices' | null; 
        transaction: TransactionDto | null; 
    }>({ type: null, transaction: null });
    const [transactionInvoices, setTransactionInvoices] = useState<InvoiceDto[]>([]);

    const [partSearchQuery, setPartSearchQuery] = useState('');
    const [partMachineModelFilter, setPartMachineModelFilter] = useState('');
    const [filteredParts, setFilteredParts] = useState<PartDto[]>([]);

    const [searchFilters, setSearchFilters] = useState({ 
        query: '', type: '', isPaid: '', startDate: '', endDate: '' 
    });

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    const initialFormData = {
        type: 'OUT' as 'IN' | 'OUT' | 'ADJUSTMENT',
        recipientName: '', reason: '', notes: '', isPaid: false, amountPaid: '',
        parts: [{ partId: '', quantity: '1', unitPrice: '' }]
    };
    const [formData, setFormData] = useState(initialFormData);
    const [calculatedTotal, setCalculatedTotal] = useState(0);
    
    // State to handle navigation from parts page
    const [pendingModalOpen, setPendingModalOpen] = useState<{type: 'create', initialPart?: PartDto} | null>(null);

    useEffect(() => { loadData(); }, []);

    // Handle navigation state from parts page
    useEffect(() => {
        const navState = location.state as any;
        if (navState?.openCreateModal) {
            // Clear the location state to prevent re-opening on refresh
            window.history.replaceState({}, document.title);
            
            // Set pending modal state
            setPendingModalOpen({
                type: 'create',
                initialPart: navState.initialPart
            });
        }
    }, [location.state]);
    
    // Handle pending modal opening after data is loaded
    useEffect(() => {
        if (pendingModalOpen && parts.length > 0) {
            // Data is loaded, set modal state and form data directly
            setModalState({ type: 'create', transaction: null });
            
            if (pendingModalOpen.initialPart) {
                // Pre-fill form with part data
                const initialPart = pendingModalOpen.initialPart;
                setFormData({
                    ...initialFormData,
                    parts: [{
                        partId: initialPart.id!.toString(),
                        quantity: '1',
                        unitPrice: (initialPart.unitPrice || 0).toString()
                    }]
                });
            } else {
                // Reset form data
                setFormData(initialFormData);
            }
            
            setPendingModalOpen(null);
        }
    }, [pendingModalOpen, parts, initialFormData]);

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
            const matchesQuery = !query || 
                t.id?.toString().includes(query) || 
                (t.recipientName || '').toLowerCase().includes(query);
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

    const { items: sortedTransactions, sortConfig, requestSort } = useSortableData(
        filteredTransactions, 
        { key: 'transactionDate', direction: 'descending' }
    );
    
    // Search filter configuration
    const searchFilterConfig: SearchFilterConfig = {
        searchPlaceholder: "Search by ID or recipient...",
        searchValue: searchFilters.query,
        onSearchChange: (value) => setSearchFilters({ ...searchFilters, query: value }),
        
        showDateFilters: true,
        startDate: searchFilters.startDate,
        endDate: searchFilters.endDate,
        onStartDateChange: (value) => setSearchFilters({ ...searchFilters, startDate: value }),
        onEndDateChange: (value) => setSearchFilters({ ...searchFilters, endDate: value }),
        
        filters: [
            {
                label: "Type",
                value: searchFilters.type,
                onChange: (value) => setSearchFilters({ ...searchFilters, type: value }),
                options: [
                    { value: 'IN', label: 'Stock In' },
                    { value: 'OUT', label: 'Stock Out' },
                    { value: 'ADJUSTMENT', label: 'Adjustment' }
                ],
                placeholder: "All Types"
            },
            {
                label: "Payment",
                value: searchFilters.isPaid,
                onChange: (value) => setSearchFilters({ ...searchFilters, isPaid: value }),
                options: [
                    { value: 'paid', label: 'Paid' },
                    { value: 'partial', label: 'Partial' },
                    { value: 'unpaid', label: 'Unpaid' }
                ],
                placeholder: "All Payment Status"
            }
        ],
        
        onReset: () => {
            setSearchFilters({ query: '', type: '', isPaid: '', startDate: '', endDate: '' });
        },
        
        totalResults: transactions.length,
        filteredResults: filteredTransactions.length
    };

    // Table columns configuration
    const tableColumns = [
        { key: 'id', label: 'ID', sortable: true, width: '80px' },
        { key: 'transactionDate', label: 'Date', sortable: true, className: 'hidden sm:table-cell' },
        { key: 'type', label: 'Type', sortable: true },
        { key: 'recipientName', label: 'Recipient', sortable: true },
        { key: 'totalAmount', label: 'Amount', sortable: true, className: 'text-right' },
        { key: 'payment', label: 'Payment', sortable: false, className: 'hidden md:table-cell' },
        { key: 'actions', label: 'Actions', sortable: false, className: 'text-right' }
    ];

    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [currentPage, sortedTransactions]);

    useEffect(() => { setCurrentPage(1); }, [searchFilters]);

    useEffect(() => {
        let tempParts = parts;
        const generalQuery = partSearchQuery.toLowerCase();
        const modelQuery = partMachineModelFilter.toLowerCase();
        if (generalQuery) {
            tempParts = tempParts.filter(p => 
                p.name.toLowerCase().includes(generalQuery) || 
                p.partNumber.toLowerCase().includes(generalQuery)
            );
        }
        if (modelQuery) {
            tempParts = tempParts.filter(p => 
                p.machineModels && p.machineModels.some(m => m.toLowerCase().includes(modelQuery))
            );
        }
        setFilteredParts((generalQuery || modelQuery) ? tempParts.slice(0, 10) : []);
    }, [partSearchQuery, partMachineModelFilter, parts]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [transRes, partsRes] = await Promise.all([api.getTransactions(), api.getParts()]);
            if (transRes.success && transRes.data) setTransactions(transRes.data);
            if (partsRes.success && partsRes.data) setParts(partsRes.data);
        } catch (error) { 
            console.error('Failed to load data:', error); 
        } finally { 
            setLoading(false); 
        }
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
                ...updatePayload, 
                type: formData.type,
                currency: currency,
                parts: formData.parts.filter(p => p.partId && p.quantity).map(p => ({
                    partId: parseInt(p.partId),
                    quantity: parseInt(p.quantity),
                    // For staff users, always send null - backend will use part's actual price
                    // For admin users, send the entered price or null to use part's actual price
                    unitPrice: isAdmin && p.unitPrice ? parseFloat(p.unitPrice) : null
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
                    let invoiceToPrint = response.data.invoices.find((inv: InvoiceDto) => 
                        inv.type === 'CUSTOMER_COPY'
                    ) || response.data.invoices[0];
                    if (invoiceToPrint?.id) {
                        window.open(`${API_BASE}/invoices/${invoiceToPrint.id}/html`, '_blank');
                    }
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
                        try {
                            await api.deleteTransaction(id);
                            await loadData();
                            toast.success('Transaction deleted successfully');
                        } catch (error) {
                            console.error('Failed to delete transaction:', error);
                            toast.error('Failed to delete transaction');
                        }
                    }
                },
                {
                    label: 'No'
                }
            ]
        });
    };

    const openModal = (
        type: NonNullable<typeof modalState.type>, 
        transaction: TransactionDto | null = null, 
        initialPart: PartDto | null = null
    ) => {
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
                type: transaction.type, 
                recipientName: transaction.recipientName ?? '', 
                reason: transaction.reason ?? '',
                notes: transaction.notes ?? '', 
                isPaid: transaction.isPaid, 
                amountPaid: (transaction.amountPaid ?? 0).toString(),
                parts: transaction.items.map(item => ({
                    partId: item.partId.toString(), 
                    quantity: item.quantity.toString(), 
                    unitPrice: (item.unitPrice ?? 0).toString(),
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
        } catch (error) { 
            console.error('Failed to load invoices:', error); 
            setTransactionInvoices([]); 
        }
    };

    const closeModal = () => {
        setModalState({ type: null, transaction: null });
        setFormData(initialFormData);
        setPartSearchQuery('');
        setPartMachineModelFilter('');
    };

    const handlePaidCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setFormData(prev => ({ 
            ...prev, 
            isPaid: checked, 
            amountPaid: checked ? calculatedTotal.toFixed(2) : '' 
        }));
    };

    const addPartLine = () => setFormData(prev => ({ 
        ...prev, 
        parts: [...prev.parts, { partId: '', quantity: '1', unitPrice: '' }] 
    }));

    const removePartLine = (index: number) => setFormData(prev => ({ 
        ...prev, 
        parts: prev.parts.filter((_, i) => i !== index) 
    }));

    const updatePartLine = (index: number, field: string, value: string) => {
        const newParts = formData.parts.map((p, i) => i === index ? { ...p, [field]: value } : p);
        if (field === 'partId' && isAdmin) {
            // Only admin users can auto-populate prices (staff users send null unitPrice to backend)
            const selectedPart = parts.find(p => p.id === parseInt(value));
            if (selectedPart) {
                newParts[index].unitPrice = (selectedPart.unitPrice || 0).toString();
            }
        }
        setFormData(prev => ({ ...prev, parts: newParts }));
    };

    const addPartFromSearch = (part: PartDto) => {
        const emptyIndex = formData.parts.findIndex(p => !p.partId);
        const newPart = { 
            partId: part.id!.toString(), 
            quantity: '1', 
            // Only admin users get price auto-populated (staff users send null unitPrice to backend) 
            unitPrice: isAdmin ? (part.unitPrice || 0).toString() : ''
        };
        let newParts;
        if (emptyIndex > -1) { 
            newParts = [...formData.parts]; 
            newParts[emptyIndex] = newPart; 
        } else { 
            newParts = [...formData.parts, newPart]; 
        }
        setFormData(prev => ({ ...prev, parts: newParts }));
        setPartSearchQuery(''); 
        setPartMachineModelFilter('');
    };

    const getTransactionTypeColor = (type: string) => ({
        'IN': 'bg-green-100 text-green-600',
        'OUT': 'bg-red-100 text-red-600',
        'ADJUSTMENT': 'bg-blue-100 text-blue-600'
    }[type] || 'bg-gray-100 text-gray-600');

    const getPaymentStatus = (t: TransactionDto) => 
        t.isPaid 
            ? { l: 'Paid', c: 'bg-green-100 text-green-600' } 
            : (t.amountPaid || 0) > 0 
                ? { l: 'Partial', c: 'bg-yellow-100 text-yellow-600' } 
                : { l: 'Unpaid', c: 'bg-red-100 text-red-600' };

    if (loading) return <Spinner />;

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-xl md:text-2xl font-bold">Transactions</h1>
                <Button onClick={() => openModal('create')}>
                    <Plus className="mr-2 h-4 w-4" /> New Transaction
                </Button>
            </div>

            <SearchFilterHeader 
                config={searchFilterConfig}
                title="Transactions Search & Filters"
            />

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <TableHeader 
                            columns={tableColumns}
                            sortConfig={sortConfig}
                            onSort={requestSort}
                        />
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedTransactions.map(t => {
                                const payment = getPaymentStatus(t);
                                return (
                                    <tr key={t.id}>
                                        <td className="px-6 py-4 font-medium text-gray-900">#{t.id}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                                            {t.transactionDate ? formatDate(t.transactionDate) : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTransactionTypeColor(t.type)}`}>
                                                {t.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{t.recipientName || 'N/A'}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {formatPrice(t.totalAmount || 0, t.currency as Currency)}
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${payment.c}`}>
                                                {payment.l}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            <div className="flex justify-end items-center space-x-2">
                                                <button 
                                                    onClick={() => openModal('details', t)} 
                                                    className="text-blue-600 hover:text-blue-900" 
                                                    title="View"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => openModal('edit', t)} 
                                                    className="text-yellow-600 hover:text-yellow-900" 
                                                    title="Edit"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                {t.type === 'OUT' && (
                                                    <button 
                                                        onClick={() => openModal('invoices', t)} 
                                                        className="text-green-600 hover:text-green-900" 
                                                        title="Invoices"
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleDelete(t.id!)} 
                                                    className="text-red-600 hover:text-red-900" 
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <Pagination 
                    totalItems={sortedTransactions.length} 
                    itemsPerPage={ITEMS_PER_PAGE} 
                    currentPage={currentPage} 
                    onPageChange={setCurrentPage} 
                />
            </div>

            <Modal 
                isOpen={!!modalState.type} 
                onClose={closeModal} 
                size="2xl" 
                title={
                    modalState.type === 'create' ? 'New Transaction' :
                    modalState.type === 'edit' ? `Edit Transaction #${modalState.transaction?.id}` :
                    modalState.type === 'details' ? `Details for Transaction #${modalState.transaction?.id}` :
                    `Invoices for Transaction #${modalState.transaction?.id}`
                }
            >
                {(modalState.type === 'create' || modalState.type === 'edit') && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {modalState.type === 'create' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Type</label>
                                    <select 
                                        className="block w-full rounded-md border-gray-300" 
                                        value={formData.type} 
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })} 
                                        required 
                                    >
                                        <option value="OUT">Stock Out</option>
                                        <option value="IN">Stock In</option>
                                        <option value="ADJUSTMENT">Adjustment</option>
                                    </select>
                                </div>
                            )}
                            <Input 
                                label="Recipient Name" 
                                value={formData.recipientName} 
                                onChange={e => setFormData({ ...formData, recipientName: e.target.value })} 
                            />
                            <Input 
                                label="Reason / Reference" 
                                value={formData.reason} 
                                onChange={e => setFormData({ ...formData, reason: e.target.value })} 
                            />
                        </div>

                        <div className="p-4 bg-gray-50 rounded-md border">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-2 gap-2">
                                <h4 className="text-md font-medium text-gray-800">Payment</h4>
                                <span className="text-lg font-bold text-gray-900">
                                    Total: ${calculatedTotal.toFixed(2)}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input 
                                    label="Amount Paid" 
                                    type="number" 
                                    step="0.01" 
                                    value={formData.amountPaid} 
                                    onChange={e => setFormData({ ...formData, amountPaid: e.target.value })} 
                                    disabled={formData.isPaid} 
                                />
                                <div className="flex items-end pb-2">
                                    <input 
                                        type="checkbox" 
                                        id="isPaid" 
                                        className="h-4 w-4" 
                                        checked={formData.isPaid} 
                                        onChange={handlePaidCheckboxChange} 
                                    />
                                    <label htmlFor="isPaid" className="ml-2 text-sm font-medium">Fully Paid</label>
                                </div>
                            </div>
                        </div>

                        {modalState.type === 'create' && (
                            <div className="space-y-3 pt-2">
                                <h4 className="text-md font-medium text-gray-800">Parts</h4>
                                {!isAdmin && (
                                    <div className="bg-blue-50 border-l-4 border-blue-400 p-3 text-sm">
                                        <p className="text-blue-700">
                                            <strong>Note:</strong> As a staff user, part prices are not shown during transaction creation. Correct prices will appear in the generated invoice.
                                        </p>
                                    </div>
                                )}
                                <div className="p-4 border rounded-md bg-gray-50">
                                    <label className="block text-sm font-medium">Find & Add Part</label>
                                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-1">
                                        <Input 
                                            placeholder="Search name, number..." 
                                            value={partSearchQuery} 
                                            onChange={e => setPartSearchQuery(e.target.value)} 
                                            className="flex-1" 
                                        />
                                        <Input 
                                            placeholder="Filter by machine model..." 
                                            value={partMachineModelFilter} 
                                            onChange={e => setPartMachineModelFilter(e.target.value)} 
                                            className="flex-1" 
                                        />
                                    </div>
                                    <div className="relative">
                                        {filteredParts.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border mt-1 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                                {filteredParts.map(p => 
                                                    <div 
                                                        key={p.id} 
                                                        onClick={() => addPartFromSearch(p)} 
                                                        className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                                                    >
                                                        <strong>{p.name}</strong> (#{p.partNumber}) - Stock: {p.currentStock}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                    {formData.parts.map((part, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-md">
                                            <select 
                                                className={`${isAdmin ? 'col-span-12 sm:col-span-6' : 'col-span-8 sm:col-span-8'} text-sm rounded-md border-gray-300`}
                                                value={part.partId} 
                                                onChange={e => updatePartLine(index, 'partId', e.target.value)} 
                                                required
                                            >
                                                <option value="">Select Part</option>
                                                {parts.map(p => 
                                                    <option key={p.id} value={p.id}>
                                                        {p.name} (#{p.partNumber})
                                                    </option>
                                                )}
                                            </select>
                                            <div className="col-span-3 sm:col-span-2">
                                                <Input 
                                                    type="number" 
                                                    placeholder="Qty" 
                                                    min="1" 
                                                    value={part.quantity} 
                                                    onChange={e => updatePartLine(index, 'quantity', e.target.value)} 
                                                    required 
                                                />
                                            </div>
                                            {isAdmin && (
                                                <div className="col-span-6 sm:col-span-3">
                                                    <Input 
                                                        type="number" 
                                                        step="0.01" 
                                                        placeholder="Price (optional)" 
                                                        value={part.unitPrice} 
                                                        onChange={e => updatePartLine(index, 'unitPrice', e.target.value)}
                                                    />
                                                </div>
                                            )}
                                            <button 
                                                type="button" 
                                                onClick={() => removePartLine(index)} 
                                                className="col-span-1 sm:col-span-1 text-red-600 flex justify-center"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <Button type="button" size="sm" variant="secondary" onClick={addPartLine}>
                                    <Plus className="h-4 w-4 mr-1" /> Add Line
                                </Button>
                            </div>
                        )}
                        <Input 
                            label="Notes" 
                            value={formData.notes} 
                            onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                        />
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
                            <p><strong>Date:</strong> {formatDateTime(modalState.transaction.transactionDate!)}</p>
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
                                            <div>{item.quantity} x {formatPrice(item.unitPrice || 0, modalState.transaction?.currency as Currency)}</div>
                                            <div className="font-semibold">{formatPrice(item.lineTotal || 0, modalState.transaction?.currency as Currency)}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button onClick={closeModal}>Close</Button>
                        </div>
                    </div>
                )}

                {modalState.type === 'invoices' && (
                    <div className="space-y-3">
                        {transactionInvoices.length > 0 ? transactionInvoices.map(inv => (
                            <div key={inv.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 bg-gray-50 rounded-md gap-3">
                                <div>
                                    <p className="font-medium text-gray-800">{inv.invoiceNumber}</p>
                                    <p className="text-sm text-gray-600">
                                        {inv.type.replace('_', ' ')} - {formatPrice(inv.totalAmount || 0, inv.currency as Currency)}
                                    </p>
                                </div>
                                <div className="flex space-x-3 self-end sm:self-center">
                                    <button 
                                        onClick={() => window.open(`${API_BASE}/invoices/${inv.id}/html`, '_blank')} 
                                        className="text-blue-600 hover:text-blue-800" 
                                        title="Print"
                                    >
                                        <Printer className="h-5 w-5" />
                                    </button>
                                    <a 
                                        href={`${API_BASE}/invoices/${inv.id}/pdf`} 
                                        download={`invoice-${inv.invoiceNumber}.pdf`} 
                                        className="text-green-600 hover:text-green-800" 
                                        title="Download PDF"
                                    >
                                        <Download className="h-5 w-5" />
                                    </a>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-gray-500 py-4">
                                No invoices found for this transaction.
                            </p>
                        )}
                        <div className="flex justify-end pt-4">
                            <Button onClick={closeModal}>Close</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default Transactions;