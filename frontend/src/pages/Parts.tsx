import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Edit, Trash2, Search, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { confirmAlert } from 'react-confirm-alert';
import CreatableSelect from 'react-select/creatable';
import { SingleValue } from 'react-select';
import { Button, Input, Modal, Spinner, Pagination, SearchFilterHeader, SearchFilterConfig, FilterOption, TableHeader, SortConfig } from '../components/shared';
import { useSortableData } from '../hooks';
import { api } from '../services/api';
import { PartDto, CategoryDto, CategoryOption, StockUpdateRequest } from '../types';
import { useTransactionModal } from '../contexts/TransactionModalContext';

export function Parts() {
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

    const { items: sortedParts, sortConfig, requestSort } = useSortableData(filteredParts, { key: 'name', direction: 'ascending' });

    // Search filter configuration
    const searchFilterConfig: SearchFilterConfig = {
        searchPlaceholder: "Search parts by name, number, category...",
        searchValue: searchQuery,
        onSearchChange: setSearchQuery,
        
        textFilters: [
            {
                label: "Machine Model",
                placeholder: "Filter by machine model...",
                value: machineModelFilter,
                onChange: setMachineModelFilter,
                icon: Package
            }
        ],
        
        onReset: () => {
            setSearchQuery('');
            setMachineModelFilter('');
        },
        
        totalResults: parts.length,
        filteredResults: filteredParts.length
    };

    // Table columns configuration
    const tableColumns = [
        { key: 'name', label: 'Part', sortable: true, className: 'min-w-[200px]' },
        { key: 'categoryName', label: 'Category', sortable: true },
        { key: 'currentStock', label: 'Stock', sortable: true, className: 'text-center' },
        { key: 'status', label: 'Status', sortable: false },
        { key: 'actions', label: 'Actions', sortable: false, className: 'text-right' }
    ];

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
            unitPrice: (part.unitPrice || 0).toString(),
            initialStock: part.currentStock.toString(),
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
                                    
                                    let message = result.message;
                                    if (result.dependenciesRemoved && result.dependenciesRemoved > 0) {
                                        message += ` (${result.dependenciesRemoved} related records were automatically removed)`;
                                    }
                                    
                                    toast.success(message);
                                } else {
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

            <SearchFilterHeader 
                config={searchFilterConfig}
                title="Parts Search & Filters"
            />

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <TableHeader 
                            columns={tableColumns}
                            sortConfig={sortConfig}
                            onSort={requestSort}
                        />
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{part.categoryName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="text-sm font-semibold text-gray-900">{part.currentStock}</div>
                                            <div className="text-xs text-gray-500">Min: {part.minimumStock}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>{status.label}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end items-center space-x-2" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => handleEdit(part)} className="text-blue-600 hover:text-blue-900">
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleDelete(part.id!)} className="text-red-600 hover:text-red-900">
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
                    totalItems={sortedParts.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {paginatedParts.map((part) => {
                    const status = getStockStatus(part);
                    return (
                        <div key={part.id} className="bg-white shadow rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => showTransactionModal(part)}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h3 className="text-sm font-medium text-gray-900">{part.name}</h3>
                                    <p className="text-xs text-gray-500">#{part.partNumber}</p>
                                    <p className="text-xs text-gray-500 mt-1">{part.categoryName}</p>
                                </div>
                                <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => handleEdit(part)} className="text-blue-600 hover:text-blue-900 p-1">
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDelete(part.id!)} className="text-red-600 hover:text-red-900 p-1">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500 text-xs">Stock:</span>
                                    <div className="text-gray-900 font-medium">{part.currentStock}</div>
                                    <div className="text-xs text-gray-500">Min: {part.minimumStock}</div>
                                </div>
                                <div>
                                    <span className="text-gray-500 text-xs">Status:</span>
                                    <div className="mt-1">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>{status.label}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                {/* Mobile Pagination */}
                <div className="bg-white shadow rounded-lg p-4">
                    <Pagination
                        totalItems={sortedParts.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </div>

            <Modal isOpen={showModal} onClose={resetForm} title={editingPart ? 'Edit Part' : 'Add Part'} size="xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label="Name" 
                            value={formData.name} 
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                            required 
                        />
                        <Input 
                            label="Part Number" 
                            value={formData.partNumber} 
                            onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })} 
                            required 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <CreatableSelect
                            isClearable
                            required
                            isDisabled={isCreatingCategory}
                            isLoading={isCreatingCategory}
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
                        <Input 
                            label="Unit Price" 
                            type="number" 
                            step="0.01" 
                            value={formData.unitPrice} 
                            onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })} 
                            required 
                        />
                        <Input 
                            label={editingPart ? "Current Stock" : "Initial Stock"} 
                            type="number" 
                            value={formData.initialStock} 
                            onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })} 
                            required 
                        />
                        <Input 
                            label="Minimum Stock" 
                            type="number" 
                            value={formData.minimumStock} 
                            onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })} 
                            required 
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label="Max Stock (Optional)" 
                            type="number" 
                            value={formData.maxStock} 
                            onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })} 
                        />
                        <Input 
                            label="Location" 
                            value={formData.location} 
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                        />
                    </div>
                    <Input 
                        label="Supplier" 
                        value={formData.supplier} 
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} 
                    />
                    <Input 
                        label="Machine Models (comma-separated)" 
                        value={formData.machineModels} 
                        onChange={(e) => setFormData({ ...formData, machineModels: e.target.value })} 
                        placeholder="e.g. Model X, Model Y" 
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
                        <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
                        <Button type="submit" disabled={isCreatingCategory || !formData.categoryId}>
                            {editingPart ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default Parts;