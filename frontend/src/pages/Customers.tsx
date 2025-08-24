import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { confirmAlert } from 'react-confirm-alert';
import { Button, Input, Modal, Spinner, Pagination, SearchFilterHeader, SearchFilterConfig } from '../components/shared';
import { useSortableData, useDebounce } from '../hooks';
import { api } from '../services/api';
import { CustomerDto, MachineDto } from '../types';

export function Customers() {
    const [customers, setCustomers] = useState<CustomerDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<CustomerDto | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 500);

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const initialFormData: Omit<CustomerDto, 'id'> = {
        name: '', contactName: '', contactPhone: '', address: '',
        contactEmail: '', inCharge: '', businessType: '', 
        machines: [{ model: '', quantity: 1, serialNumber: '' }]
    };
    const [formData, setFormData] = useState(initialFormData);

    const { items: sortedCustomers, SortableHeader } = useSortableData(customers, { key: 'name', direction: 'ascending' });

    // Search filter configuration
    const searchFilterConfig: SearchFilterConfig = {
        searchPlaceholder: "Search customers by name, contact, address...",
        searchValue: searchQuery,
        onSearchChange: setSearchQuery,
        
        onReset: () => {
            setSearchQuery('');
        },
        
        totalResults: customers.length,
        filteredResults: sortedCustomers.length
    };

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
                setCustomers([]);
            }
        } catch (error) {
            console.error("Failed to load customers:", error);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearchQuery]);

    useEffect(() => {
        loadCustomersCallback();
    }, [loadCustomersCallback]);

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
            console.error('Failed to save customer:', error);
            toast.error('Failed to save customer');
        }
    };

    const addMachineLine = () => {
        setFormData(prev => ({
            ...prev,
            machines: [...prev.machines, { model: '', quantity: 1, serialNumber: '' }]
        }));
    };

    const removeMachineLine = (index: number) => {
        if (formData.machines.length > 1) {
            setFormData(prev => ({
                ...prev,
                machines: prev.machines.filter((_, i) => i !== index)
            }));
        }
    };

    const handleMachineChange = (index: number, field: keyof MachineDto, value: string) => {
        setFormData(prev => ({
            ...prev,
            machines: prev.machines.map((machine, i) =>
                i === index ? { ...machine, [field]: field === 'quantity' ? parseInt(value) || 1 : value } : machine
            )
        }));
    };

    if (loading) return <Spinner />;

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Customers</h1>
                <Button onClick={() => setShowModal(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Customer
                </Button>
            </div>

            <SearchFilterHeader 
                config={searchFilterConfig}
                title="Customers Search & Filters"
            />

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <SortableHeader sortKey="name">Customer</SortableHeader>
                                <SortableHeader sortKey="contactName" className="hidden sm:table-cell">Contact</SortableHeader>
                                <SortableHeader sortKey="contactPhone" className="hidden md:table-cell">Phone</SortableHeader>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machines</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedCustomers.map((customer) => (
                                <tr key={customer.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                                            <div className="text-sm text-gray-500">{customer.businessType}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                                        <div>
                                            <div className="text-sm text-gray-900">{customer.contactName}</div>
                                            <div className="text-sm text-gray-500">{customer.contactEmail}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                                        {customer.contactPhone}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {customer.machines.length} machine(s)
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end items-center space-x-2">
                                            <button onClick={() => handleEdit(customer)} className="text-blue-600 hover:text-blue-900">
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDelete(customer.id!)} className="text-red-600 hover:text-red-900">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
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

            <Modal isOpen={showModal} onClose={resetForm} title={editingCustomer ? 'Edit Customer' : 'Add Customer'} size="xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Customer Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        <Input label="Business Type" value={formData.businessType} onChange={e => setFormData({ ...formData, businessType: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Contact Name" value={formData.contactName} onChange={e => setFormData({ ...formData, contactName: e.target.value })} required />
                        <Input label="Contact Phone" value={formData.contactPhone} onChange={e => setFormData({ ...formData, contactPhone: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Contact Email" type="email" value={formData.contactEmail} onChange={e => setFormData({ ...formData, contactEmail: e.target.value })} />
                        <Input label="In Charge" value={formData.inCharge} onChange={e => setFormData({ ...formData, inCharge: e.target.value })} required />
                    </div>
                    <Input label="Address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required />

                    <div className="space-y-3 pt-2">
                        <h4 className="text-md font-medium text-gray-800">Machines</h4>
                        <div className="space-y-2">
                            {formData.machines.map((machine, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-12 sm:col-span-5"><Input placeholder="Model" value={machine.model} onChange={e => handleMachineChange(index, 'model', e.target.value)} /></div>
                                    <div className="col-span-6 sm:col-span-3"><Input placeholder="Serial Number" value={machine.serialNumber} onChange={e => handleMachineChange(index, 'serialNumber', e.target.value)} /></div>
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

export default Customers;