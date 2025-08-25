// Parts Management Module
import { partsAPI, categoriesAPI, transactionsAPI } from './api.js';
import { 
    elements, 
    appState, 
    showLoading, 
    hideLoading, 
    showToast, 
    formatCurrency, 
    formatDate,
    handleError,
    confirmAction,
    debounce,
    renderPagination
} from './ui-utils.js';

// Initialize parts search and filters
export function initPartsFilters() {
    if (!elements.partsSearch) return;

    // Debounced search function
    const debouncedSearch = debounce(performPartsSearch, 300);

    // Search input
    elements.partsSearch.addEventListener('input', () => {
        appState.currentPage = 1;
        debouncedSearch();
    });

    // Category filter
    elements.categoryFilter?.addEventListener('change', () => {
        appState.currentPage = 1;
        performPartsSearch();
    });

    // Enhanced filters
    const supplierFilter = document.getElementById('supplier-filter');
    const locationFilter = document.getElementById('location-filter');
    const stockStatusFilter = document.getElementById('stock-status-filter');
    const priceMinInput = document.getElementById('price-min');
    const priceMaxInput = document.getElementById('price-max');
    const hasMachineModelsFilter = document.getElementById('has-machine-models-filter');
    const hasDescriptionFilter = document.getElementById('has-description-filter');
    const recentlyUpdatedFilter = document.getElementById('recently-updated-filter');
    const clearFiltersBtn = document.getElementById('clear-parts-filters');

    // Add event listeners for all filters
    [supplierFilter, locationFilter, stockStatusFilter].forEach(filter => {
        filter?.addEventListener('change', () => {
            appState.currentPage = 1;
            performPartsSearch();
        });
    });

    [priceMinInput, priceMaxInput].forEach(input => {
        input?.addEventListener('input', debounce(() => {
            appState.currentPage = 1;
            performPartsSearch();
        }, 500));
    });

    [hasMachineModelsFilter, hasDescriptionFilter, recentlyUpdatedFilter].forEach(checkbox => {
        checkbox?.addEventListener('change', () => {
            appState.currentPage = 1;
            performPartsSearch();
        });
    });

    // Clear filters button
    clearFiltersBtn?.addEventListener('click', clearAllPartsFilters);
}

// Load parts section
export async function loadParts() {
    try {
        showLoading();

        // Load categories for filter
        appState.categories = await categoriesAPI.getAll();
        populateCategoryFilter();

        // Load all parts to populate filter dropdowns
        const allParts = await partsAPI.getAll();
        populateEnhancedFilters(allParts);

        // Perform initial search
        await performPartsSearch();

    } catch (error) {
        handleError(error, 'loading parts');
    } finally {
        hideLoading();
    }
}

// Populate category filter dropdown
function populateCategoryFilter() {
    if (!elements.categoryFilter) return;

    elements.categoryFilter.innerHTML = '<option value="">All Categories</option>';
    appState.categories.forEach(category => {
        elements.categoryFilter.innerHTML += `<option value="${category.id}">${category.name}</option>`;
    });
}

// Populate enhanced filter dropdowns
function populateEnhancedFilters(parts) {
    // Get unique suppliers
    const suppliers = [...new Set(parts.map(part => part.supplier).filter(Boolean))].sort();
    const supplierFilter = document.getElementById('supplier-filter');
    if (supplierFilter) {
        supplierFilter.innerHTML = '<option value="">All Suppliers</option>';
        suppliers.forEach(supplier => {
            supplierFilter.innerHTML += `<option value="${supplier}">${supplier}</option>`;
        });
    }

    // Get unique locations
    const locations = [...new Set(parts.map(part => part.location).filter(Boolean))].sort();
    const locationFilter = document.getElementById('location-filter');
    if (locationFilter) {
        locationFilter.innerHTML = '<option value="">All Locations</option>';
        locations.forEach(location => {
            locationFilter.innerHTML += `<option value="${location}">${location}</option>`;
        });
    }
}

// Clear all parts filters
function clearAllPartsFilters() {
    // Clear search input
    const partsSearch = document.getElementById('parts-search');
    if (partsSearch) partsSearch.value = '';

    // Clear all select filters
    const filters = [
        'category-filter',
        'supplier-filter', 
        'location-filter',
        'stock-status-filter'
    ];

    filters.forEach(filterId => {
        const filter = document.getElementById(filterId);
        if (filter) filter.value = '';
    });

    // Clear price inputs
    const priceMin = document.getElementById('price-min');
    const priceMax = document.getElementById('price-max');
    if (priceMin) priceMin.value = '';
    if (priceMax) priceMax.value = '';

    // Clear checkboxes
    const checkboxes = [
        'has-machine-models-filter',
        'has-description-filter',
        'recently-updated-filter'
    ];

    checkboxes.forEach(checkboxId => {
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) checkbox.checked = false;
    });

    // Reset page and perform search
    appState.currentPage = 1;
    performPartsSearch();

    showToast('Info', 'All filters cleared', 'info');
}

// Ensure performPartsSearch is exported for dynamic import compatibility
export async function performPartsSearch() {
    try {
        const query = elements.partsSearch?.value || '';
        const categoryId = elements.categoryFilter?.value || null;

        // Get enhanced filter values
        const supplierFilter = document.getElementById('supplier-filter')?.value || '';
        const locationFilter = document.getElementById('location-filter')?.value || '';
        const stockStatusFilter = document.getElementById('stock-status-filter')?.value || '';
        const priceMin = parseFloat(document.getElementById('price-min')?.value) || null;
        const priceMax = parseFloat(document.getElementById('price-max')?.value) || null;
        const hasMachineModels = document.getElementById('has-machine-models-filter')?.checked || false;
        const hasDescription = document.getElementById('has-description-filter')?.checked || false;
        const recentlyUpdated = document.getElementById('recently-updated-filter')?.checked || false;

        // Use basic API search, passing only the query string
        const result = await partsAPI.search(query || '');
        // result is already an array of parts
        let filteredParts = result || [];

        // Supplier filter
        if (supplierFilter) {
            filteredParts = filteredParts.filter(part => 
                part.supplier && part.supplier.toLowerCase().includes(supplierFilter.toLowerCase())
            );
        }

        // Location filter
        if (locationFilter) {
            filteredParts = filteredParts.filter(part => 
                part.location && part.location.toLowerCase().includes(locationFilter.toLowerCase())
            );
        }

        // Stock status filter
        if (stockStatusFilter) {
            filteredParts = filteredParts.filter(part => {
                const stockRatio = part.maxStock ? part.currentStock / part.maxStock : part.currentStock / (part.minimumStock * 2);
                switch (stockStatusFilter) {
                    case 'critical':
                        return part.currentStock <= part.minimumStock;
                    case 'low':
                        return part.currentStock > part.minimumStock && part.currentStock <= part.minimumStock * 1.5;
                    case 'good':
                        return part.currentStock > part.minimumStock * 1.5 && stockRatio <= 1;
                    case 'overstocked':
                        return part.maxStock && part.currentStock > part.maxStock;
                    default:
                        return true;
                }
            });
        }

        // Price range filter
        if (priceMin !== null) {
            filteredParts = filteredParts.filter(part => part.unitPrice >= priceMin);
        }
        if (priceMax !== null) {
            filteredParts = filteredParts.filter(part => part.unitPrice <= priceMax);
        }

        // Machine models filter
        if (hasMachineModels) {
            filteredParts = filteredParts.filter(part => 
                part.machineModels && part.machineModels.length > 0
            );
        }

        // Description filter
        if (hasDescription) {
            filteredParts = filteredParts.filter(part => 
                part.description && part.description.trim().length > 0
            );
        }

        // Recently updated filter (last 7 days)
        if (recentlyUpdated) {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            filteredParts = filteredParts.filter(part => 
                part.updatedAt && new Date(part.updatedAt) >= sevenDaysAgo
            );
        }

        // Apply pagination to filtered results
        const limit = 20;
        const total = filteredParts.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (appState.currentPage - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedParts = filteredParts.slice(startIndex, endIndex);

        // Create pagination result object
        const paginationResult = {
            data: paginatedParts,
            page: appState.currentPage,
            limit: limit,
            total: total,
            totalPages: totalPages
        };

        renderParts(paginatedParts);
        renderPartsNavigation(paginationResult);

        // Show filter results info (use only the frontend total now)
        showToast('Info', `Showing ${total} parts after filtering`, 'info');

    } catch (error) {
        handleError(error, 'searching parts');
    }
}

// Render parts grid
function renderParts(parts) {
    if (!elements.partsGrid) return;

    if (!parts || parts.length === 0) {
        elements.partsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-cogs"></i>
                <h3>No parts found</h3>
                <p>No parts match your current search criteria.</p>
                <button class="btn btn-primary" onclick="showAddPartModal()">
                    <i class="fas fa-plus"></i> Add First Part
                </button>
            </div>
        `;
        return;
    }

    elements.partsGrid.innerHTML = parts.map(part => {
        const stockPercentage = Math.min((part.currentStock / (part.maxStock || part.minimumStock * 2)) * 100, 100);
        const stockClass = part.currentStock <= part.minimumStock ? 'critical' : 
                          part.currentStock <= part.minimumStock * 1.5 ? 'low' : '';

        return `
            <div class="part-card ${part.currentStock <= part.minimumStock ? 'low-stock' : ''}" onclick="showPartDetails(${part.id})">
                <div class="part-header">
                    <div class="part-info-main">
                        <div class="part-title">${part.name}</div>
                        <div class="part-number">${part.partNumber}</div>
                        <div class="part-category">${part.categoryName || 'Uncategorized'}</div>
                    </div>
                    <div class="part-actions" onclick="event.stopPropagation()">
                        <button class="btn-icon btn-primary" onclick="editPart(${part.id})" title="Edit Part">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-danger" onclick="deletePart(${part.id})" title="Delete Part">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>

                <div class="part-details">
                    <div class="part-detail-row">
                        <span class="detail-label">Price:</span>
                        <span class="detail-value">${formatCurrency(part.unitPrice)}</span>
                    </div>
                    <div class="part-detail-row">
                        <span class="detail-label">Location:</span>
                        <span class="detail-value">${part.location || 'Not specified'}</span>
                    </div>
                    <div class="part-detail-row">
                        <span class="detail-label">Supplier:</span>
                        <span class="detail-value">${part.supplier || 'Not specified'}</span>
                    </div>
                    ${part.machineModels && part.machineModels.length > 0 ? `
                        <div class="part-detail-row">
                            <span class="detail-label">Models:</span>
                            <span class="detail-value">${part.machineModels.join(', ')}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="stock-section">
                    <div class="stock-info">
                        <span class="stock-current ${stockClass}">
                            ${part.currentStock}
                        </span>
                        <span class="stock-separator">/</span>
                        <span class="stock-minimum">${part.minimumStock} min</span>
                        ${part.maxStock ? `<span class="stock-maximum">(${part.maxStock} max)</span>` : ''}
                    </div>
                    <div class="stock-bar">
                        <div class="stock-fill ${stockClass}" style="width: ${stockPercentage}%"></div>
                    </div>
                    ${part.currentStock <= part.minimumStock ? 
                        '<div class="stock-alert"><i class="fas fa-exclamation-triangle"></i> Low Stock</div>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Render parts pagination
function renderPartsNavigation(result) {
    appState.totalPages = result.totalPages;
    appState.currentPage = result.page;

    if (elements.partsPagination) {
        renderPagination(
            elements.partsPagination, 
            appState.currentPage, 
            appState.totalPages, 
            'changePage'
        );
    }
}

// Change page function
export async function changePage(page) {
    if (page < 1 || page > appState.totalPages) return;
    appState.currentPage = page;
    await performPartsSearch();
}

// Show part details modal
export async function showPartDetails(partId) {
    try {
        showLoading();

        // Fetch part details
        const part = await partsAPI.getById(partId);

        // Fetch part transactions
        const partTransactions = await transactionsAPI.getByPartId(partId);

        // Calculate stock status
        const stockPercentage = part.maxStock ? 
            (part.currentStock / part.maxStock) * 100 : 
            (part.currentStock / (part.minimumStock * 2)) * 100;

        const stockStatus = part.currentStock <= part.minimumStock ? 'critical' : 
                           part.currentStock <= part.minimumStock * 1.5 ? 'low' : 'good';

        const stockStatusText = stockStatus === 'critical' ? 'Critical - Reorder Now' :
                               stockStatus === 'low' ? 'Low Stock - Consider Reordering' : 'Stock Level Good';

        // Render compact part details modal
        const modalHTML = `
            <div class="part-details-modal modal show">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-cog"></i> ${part.name} <span class="badge badge-${stockStatus}">${stockStatus.toUpperCase()}</span></h3>
                        <span class="close" onclick="this.closest('.part-details-modal').remove()">&times;</span>
                    </div>
                    <div class="part-details-content-compact">
                        <!-- Quick Actions Bar -->
                        <div class="quick-actions-bar">
                            <button class="btn btn-primary btn-sm" onclick="createTransactionForPart(${part.id}, 'IN')" title="Add stock">
                                <i class="fas fa-plus-circle"></i> Stock In
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="createTransactionForPart(${part.id}, 'OUT')" title="Remove stock">
                                <i class="fas fa-minus-circle"></i> Stock Out
                            </button>
                            <button class="btn btn-info btn-sm" onclick="showStockAdjustmentModal(${part.id})" title="Set exact stock level">
                                <i class="fas fa-adjust"></i> Set Stock
                            </button>
                            <button class="btn btn-success btn-sm" onclick="editPartFromDetails(${part.id})" title="Edit part details">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        </div>

                        <!-- Compact Part Overview -->
                        <div class="part-overview-compact">
                            <div class="overview-row">
                                <div class="overview-col">
                                    <strong>Part #:</strong> ${part.partNumber}
                                </div>
                                <div class="overview-col">
                                    <strong>Category:</strong> ${part.categoryName || 'Uncategorized'}
                                </div>
                                <div class="overview-col">
                                    <strong>Price:</strong> ${formatCurrency(part.unitPrice)}
                                </div>
                            </div>
                            <div class="overview-row">
                                <div class="overview-col">
                                    <strong>Current Stock:</strong> <span class="stock-number ${stockStatus}">${part.currentStock}</span>
                                </div>
                                <div class="overview-col">
                                    <strong>Min/Max:</strong> ${part.minimumStock}/${part.maxStock || '∞'}
                                </div>
                                <div class="overview-col">
                                    <strong>Total Value:</strong> ${formatCurrency(part.currentStock * part.unitPrice)}
                                </div>
                            </div>
                            ${(part.location || part.supplier) ? `
                            <div class="overview-row">
                                ${part.location ? `<div class="overview-col"><strong>Location:</strong> ${part.location}</div>` : ''}
                                ${part.supplier ? `<div class="overview-col"><strong>Supplier:</strong> ${part.supplier}</div>` : ''}
                            </div>
                            ` : ''}
                            ${part.machineModels && part.machineModels.length > 0 ? `
                            <div class="overview-row">
                                <div class="overview-col-full">
                                    <strong>Machine Models:</strong> ${part.machineModels.map(model => `<span class="machine-model-tag-compact">${model}</span>`).join(' ')}
                                </div>
                            </div>
                            ` : ''}
                            ${part.description ? `
                            <div class="overview-row">
                                <div class="overview-col-full">
                                    <strong>Description:</strong> ${part.description}
                                </div>
                            </div>
                            ` : ''}
                        </div>

                        <!-- Enhanced Transaction History -->
                        <div class="transactions-section-enhanced">
                            <div class="transactions-header">
                                <h4><i class="fas fa-history"></i> Transaction History</h4>
                                <div class="transactions-summary">
                                    <span class="summary-item">Total Transactions: <strong>${partTransactions.length}</strong></span>
                                    ${partTransactions.length > 0 ? `
                                        <span class="summary-item">Last Activity: <strong>${formatDate(partTransactions[0]?.transactionDate)}</strong></span>
                                    ` : ''}
                                </div>
                            </div>
                            ${renderEnhancedPartTransactions(partTransactions)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

    } catch (error) {
        handleError(error, 'loading part details');
    } finally {
        hideLoading();
    }
}

// Render part transactions (legacy function - kept for compatibility)
function renderPartTransactions(transactions) {
    if (!transactions || transactions.length === 0) {
        return `
            <div class="empty-state-small">
                <i class="fas fa-exchange-alt"></i>
                <p>No transactions recorded for this part</p>
            </div>
        `;
    }

    return `
        <div class="transactions-table">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Quantity</th>
                        <th>Recipient</th>
                        <th>Amount</th>
                        <th>Payment</th>
                        <th>Reason</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map(transaction => `
                        <tr>
                            <td>${formatDate(transaction.transactionDate)}</td>
                            <td><span class="transaction-type ${transaction.type.toLowerCase()}">${transaction.type}</span></td>
                            <td><span class="quantity-badge ${transaction.type.toLowerCase()}">${transaction.quantity}</span></td>
                            <td>${transaction.recipientName || 'N/A'}</td>
                            <td>${transaction.totalAmount ? formatCurrency(transaction.totalAmount) : 'N/A'}</td>
                            <td><span class="payment-status ${transaction.isPaid ? 'paid' : (transaction.amountPaid > 0 ? 'partial' : 'unpaid')}">${transaction.isPaid ? 'Paid' : (transaction.amountPaid > 0 ? 'Partial' : 'Unpaid')}</span></td>
                            <td>${transaction.reason || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Enhanced transaction rendering for the improved modal
function renderEnhancedPartTransactions(transactions) {
    if (!transactions || transactions.length === 0) {
        return `
            <div class="empty-state-enhanced">
                <div class="empty-icon">
                    <i class="fas fa-exchange-alt"></i>
                </div>
                <h5>No Transaction History</h5>
                <p>No transactions have been recorded for this part yet.</p>
                <button class="btn btn-primary btn-sm" onclick="createTransactionForPart(${transactions.partId || 'null'}, 'IN')">
                    <i class="fas fa-plus"></i> Create First Transaction
                </button>
            </div>
        `;
    }

    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => 
        new Date(b.transactionDate) - new Date(a.transactionDate)
    );

    // Calculate transaction statistics
    const totalIn = transactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.quantity, 0);
    const totalOut = transactions.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.quantity, 0);
    const totalValue = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const unpaidTransactions = transactions.filter(t => !t.isPaid && t.type === 'OUT').length;

    return `
        <div class="enhanced-transactions-container">
            <!-- Transaction Statistics -->
            <div class="transaction-stats">
                <div class="stat-item">
                    <div class="stat-icon in">
                        <i class="fas fa-arrow-up"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${totalIn}</div>
                        <div class="stat-label">Total In</div>
                    </div>
                </div>
                <div class="stat-item">
                    <div class="stat-icon out">
                        <i class="fas fa-arrow-down"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${totalOut}</div>
                        <div class="stat-label">Total Out</div>
                    </div>
                </div>
                <div class="stat-item">
                    <div class="stat-icon value">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${formatCurrency(totalValue)}</div>
                        <div class="stat-label">Total Value</div>
                    </div>
                </div>
                ${unpaidTransactions > 0 ? `
                    <div class="stat-item warning">
                        <div class="stat-icon unpaid">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${unpaidTransactions}</div>
                            <div class="stat-label">Unpaid</div>
                        </div>
                    </div>
                ` : ''}
            </div>

            <!-- Transaction List -->
            <div class="enhanced-transactions-list">
                ${sortedTransactions.map(transaction => `
                    <div class="transaction-item ${transaction.type.toLowerCase()}">
                        <div class="transaction-main">
                            <div class="transaction-icon">
                                <i class="fas ${transaction.type === 'IN' ? 'fa-plus-circle' : transaction.type === 'OUT' ? 'fa-minus-circle' : 'fa-adjust'}"></i>
                            </div>
                            <div class="transaction-details">
                                <div class="transaction-header">
                                    <span class="transaction-type-badge ${transaction.type.toLowerCase()}">${transaction.type}</span>
                                    <span class="transaction-quantity">${transaction.quantity} units</span>
                                    <span class="transaction-date">${formatDate(transaction.transactionDate)}</span>
                                </div>
                                <div class="transaction-info">
                                    ${transaction.recipientName ? `<span class="recipient"><i class="fas fa-user"></i> ${transaction.recipientName}</span>` : ''}
                                    ${transaction.reason ? `<span class="reason"><i class="fas fa-comment"></i> ${transaction.reason}</span>` : ''}
                                    ${transaction.notes ? `<span class="notes"><i class="fas fa-sticky-note"></i> ${transaction.notes}</span>` : ''}
                                </div>
                            </div>
                            <div class="transaction-financial">
                                ${transaction.totalAmount ? `
                                    <div class="amount">${formatCurrency(transaction.totalAmount)}</div>
                                ` : ''}
                                <div class="payment-status ${transaction.isPaid ? 'paid' : (transaction.amountPaid > 0 ? 'partial' : 'unpaid')}">
                                    <i class="fas ${transaction.isPaid ? 'fa-check-circle' : (transaction.amountPaid > 0 ? 'fa-clock' : 'fa-times-circle')}"></i>
                                    ${transaction.isPaid ? 'Paid' : (transaction.amountPaid > 0 ? `Partial (${formatCurrency(transaction.amountPaid)})` : 'Unpaid')}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Load low stock parts
export async function loadLowStockParts() {
    try {
        showLoading();

        const lowStockParts = await partsAPI.getLowStock();

        if (elements.lowStockGrid) {
            renderParts(lowStockParts);
        }

    } catch (error) {
        handleError(error, 'loading low stock parts');
    } finally {
        hideLoading();
    }
}

// Edit part function
export async function editPart(partId) {
    try {
        showLoading();

        const part = await partsAPI.getById(partId);
        appState.currentPart = part;

        // Load categories for dropdown
        if (appState.categories.length === 0) {
            appState.categories = await categoriesAPI.getAll();
        }

        // Show edit modal (will be handled by modals module)
        const { showEditPartModal } = await import('./modals.js');
        showEditPartModal(part);

    } catch (error) {
        handleError(error, 'loading part for editing');
    } finally {
        hideLoading();
    }
}

// Delete part function
export async function deletePart(partId) {
    try {
        const confirmed = await confirmAction(
            'Are you sure you want to delete this part? This action cannot be undone and will also delete all associated transactions.',
            'Delete Part'
        );

        if (!confirmed) return;

        showLoading();
        await partsAPI.delete(partId);
        showToast('Success', 'Part deleted successfully');

        // Refresh parts list
        await performPartsSearch();

    } catch (error) {
        handleError(error, 'deleting part');
    } finally {
        hideLoading();
    }
}

// Save part function
export async function savePart(partData, isEdit = false) {
    try {
        showLoading();

        if (isEdit && appState.currentPart) {
            await partsAPI.update(appState.currentPart.id, partData);
            showToast('Success', 'Part updated successfully');
        } else {
            // Check for duplicates before creating new part
            const duplicateWarnings = await checkForDuplicates(partData);
            if (duplicateWarnings.length > 0) {
                hideLoading();
                const proceed = await showDuplicateWarning(duplicateWarnings);
                if (!proceed) {
                    return false;
                }
                showLoading();
            }

            await partsAPI.create(partData);
            showToast('Success', 'Part created successfully');
        }

        // Refresh parts list
        await performPartsSearch();

        return true;
    } catch (error) {
        handleError(error, isEdit ? 'updating part' : 'creating part');
        return false;
    } finally {
        hideLoading();
    }
}

// Check for duplicate part names and part numbers
async function checkForDuplicates(partData) {
    const warnings = [];

    try {
        // Get all existing parts to check for duplicates
        const allParts = await partsAPI.getAll();

        // Check for duplicate part number
        const duplicatePartNumber = allParts.find(part => 
            part.partNumber.toLowerCase() === partData.partNumber.toLowerCase()
        );
        if (duplicatePartNumber) {
            warnings.push({
                type: 'partNumber',
                message: `Part number "${partData.partNumber}" already exists`,
                existingPart: duplicatePartNumber
            });
        }

        // Check for duplicate part name
        const duplicateName = allParts.find(part => 
            part.name.toLowerCase() === partData.name.toLowerCase()
        );
        if (duplicateName) {
            warnings.push({
                type: 'name',
                message: `Part name "${partData.name}" already exists`,
                existingPart: duplicateName
            });
        }

    } catch (error) {
        console.error('Error checking for duplicates:', error);
        // Don't block creation if duplicate check fails
    }

    return warnings;
}

// Show duplicate warning dialog
async function showDuplicateWarning(warnings) {
    return new Promise((resolve) => {
        const warningMessages = warnings.map(warning => {
            const existingPart = warning.existingPart;
            return `
                <div class="duplicate-warning-item">
                    <div class="warning-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        ${warning.message}
                    </div>
                    <div class="existing-part-info">
                        <strong>Existing part:</strong> ${existingPart.name} (${existingPart.partNumber})
                        <br><strong>Category:</strong> ${existingPart.categoryName || 'Unknown'}
                        <br><strong>Current Stock:</strong> ${existingPart.currentStock}
                    </div>
                </div>
            `;
        }).join('');

        const modalHTML = `
            <div class="duplicate-warning-modal modal show">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-exclamation-triangle"></i> Duplicate Parts Detected</h3>
                    </div>
                    <div class="modal-body">
                        <div class="duplicate-warnings">
                            ${warningMessages}
                        </div>
                        <div class="warning-actions">
                            <p><strong>Do you want to continue creating this part anyway?</strong></p>
                            <div class="button-group">
                                <button class="btn btn-secondary" id="cancel-duplicate">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                                <button class="btn btn-warning" id="proceed-duplicate">
                                    <i class="fas fa-check"></i> Create Anyway
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = document.querySelector('.duplicate-warning-modal');

        // Handle button clicks
        document.getElementById('cancel-duplicate').addEventListener('click', () => {
            modal.remove();
            resolve(false);
        });

        document.getElementById('proceed-duplicate').addEventListener('click', () => {
            modal.remove();
            resolve(true);
        });

        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}

// Create transaction for a specific part (called from part details modal)
export async function createTransactionForPart(partId, transactionType = 'OUT') {
    try {
        showLoading();

        // Get the part details to pre-populate the form
        const part = await partsAPI.getById(partId);

        // Import and show the transaction modal with pre-filled data
        const { showAddTransactionModal } = await import('./modals.js');
        await showAddTransactionModal();

        // Pre-select the part and transaction type
        const partSelect = document.getElementById('transaction-part');
        const typeSelect = document.getElementById('transaction-type');
        const priceInput = document.getElementById('transaction-price');

        if (partSelect) {
            partSelect.value = partId;
        }
        if (typeSelect) {
            typeSelect.value = transactionType;
            // Trigger change event to show/hide recipient field properly
            typeSelect.dispatchEvent(new Event('change'));
        }
        if (priceInput && !priceInput.value) {
            priceInput.value = part.unitPrice.toFixed(2);
        }

        // Focus on quantity input
        setTimeout(() => {
            const quantityInput = document.getElementById('transaction-quantity');
            if (quantityInput) {
                quantityInput.focus();
            }
        }, 100);

        showToast('Info', `Creating ${transactionType.toLowerCase()} transaction for ${part.name}`, 'info');

    } catch (error) {
        handleError(error, 'creating transaction for part');
    } finally {
        hideLoading();
    }
}

// Edit part from details modal
export async function editPartFromDetails(partId) {
    try {
        // Close the details modal first
        const detailsModal = document.querySelector('.part-details-modal');
        if (detailsModal) {
            detailsModal.remove();
        }

        // Call the regular edit part function
        await editPart(partId);

    } catch (error) {
        handleError(error, 'editing part from details');
    }
}

// Show stock adjustment modal with clear explanation
export async function showStockAdjustmentModal(partId) {
    try {
        showLoading();

        // Get the part details
        const part = await partsAPI.getById(partId);

        // Create a custom modal for stock adjustment
        const adjustmentModalHTML = `
            <div class="stock-adjustment-modal modal show">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-adjust"></i> Set Stock Level - ${part.name}</h3>
                        <span class="close" onclick="this.closest('.stock-adjustment-modal').remove()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="current-stock-info">
                            <div class="stock-info-item">
                                <label>Current Stock:</label>
                                <span class="current-stock-value">${part.currentStock}</span>
                            </div>
                            <div class="stock-info-item">
                                <label>Minimum Stock:</label>
                                <span>${part.minimumStock}</span>
                            </div>
                            <div class="stock-info-item">
                                <label>Maximum Stock:</label>
                                <span>${part.maxStock || 'No limit'}</span>
                            </div>
                        </div>

                        <div class="adjustment-form">
                            <div class="form-group">
                                <label for="new-stock-level">New Stock Level *</label>
                                <input type="number" id="new-stock-level" min="0" value="${part.currentStock}" required>
                                <small class="form-help">Enter the exact stock level you want to set (not the adjustment amount)</small>
                            </div>

                            <div class="form-group">
                                <label for="adjustment-reason">Reason for Adjustment *</label>
                                <select id="adjustment-reason" required>
                                    <option value="">Select reason...</option>
                                    <option value="Physical count correction">Physical count correction</option>
                                    <option value="Damaged items removed">Damaged items removed</option>
                                    <option value="Found additional stock">Found additional stock</option>
                                    <option value="System correction">System correction</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="adjustment-notes">Additional Notes</label>
                                <textarea id="adjustment-notes" rows="2" placeholder="Optional additional details..."></textarea>
                            </div>

                            <div class="adjustment-preview">
                                <div class="preview-item">
                                    <span>Current: ${part.currentStock}</span>
                                    <span class="arrow">→</span>
                                    <span id="new-level-preview">${part.currentStock}</span>
                                    <span class="change-indicator" id="change-indicator"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.stock-adjustment-modal').remove()">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="processStockAdjustment(${partId})">Set Stock Level</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', adjustmentModalHTML);

        // Add event listener for real-time preview
        const newStockInput = document.getElementById('new-stock-level');
        const preview = document.getElementById('new-level-preview');
        const changeIndicator = document.getElementById('change-indicator');

        newStockInput.addEventListener('input', () => {
            const newLevel = parseInt(newStockInput.value) || 0;
            const currentLevel = part.currentStock;
            const difference = newLevel - currentLevel;

            preview.textContent = newLevel;

            if (difference > 0) {
                changeIndicator.textContent = `(+${difference})`;
                changeIndicator.className = 'change-indicator positive';
            } else if (difference < 0) {
                changeIndicator.textContent = `(${difference})`;
                changeIndicator.className = 'change-indicator negative';
            } else {
                changeIndicator.textContent = '(no change)';
                changeIndicator.className = 'change-indicator neutral';
            }
        });

        // Focus on the input
        setTimeout(() => {
            newStockInput.focus();
            newStockInput.select();
        }, 100);

    } catch (error) {
        handleError(error, 'loading stock adjustment modal');
    } finally {
        hideLoading();
    }
}

// Process stock adjustment
export async function processStockAdjustment(partId) {
    try {
        const newStockLevel = document.getElementById('new-stock-level')?.value;
        const reason = document.getElementById('adjustment-reason')?.value;
        const notes = document.getElementById('adjustment-notes')?.value;

        if (!newStockLevel || newStockLevel < 0) {
            showToast('Error', 'Please enter a valid stock level', 'error');
            return;
        }

        if (!reason) {
            showToast('Error', 'Please select a reason for the adjustment', 'error');
            return;
        }

        showLoading();

        // Create the adjustment transaction
        const transactionData = {
            partId: parseInt(partId),
            type: 'ADJUSTMENT',
            quantity: parseInt(newStockLevel), // For ADJUSTMENT, quantity is the new stock level
            reason: reason,
            notes: notes || null,
            isPaid: true, // Adjustments don't involve payment
            amountPaid: 0
        };

        const { transactionsAPI } = await import('./api.js');
        await transactionsAPI.create(transactionData);

        showToast('Success', `Stock level set to ${newStockLevel}`, 'success');

        // Close the adjustment modal
        document.querySelector('.stock-adjustment-modal')?.remove();

        // Close the part details modal and refresh
        document.querySelector('.part-details-modal')?.remove();

        // Refresh the parts list
        await performPartsSearch();

    } catch (error) {
        handleError(error, 'processing stock adjustment');
    } finally {
        hideLoading();
    }
}

// Make functions available globally for onclick handlers
window.showPartDetails = showPartDetails;
window.editPart = editPart;
window.deletePart = deletePart;
window.changePage = changePage;
window.createTransactionForPart = createTransactionForPart;
window.editPartFromDetails = editPartFromDetails;
window.showStockAdjustmentModal = showStockAdjustmentModal;
window.processStockAdjustment = processStockAdjustment;
