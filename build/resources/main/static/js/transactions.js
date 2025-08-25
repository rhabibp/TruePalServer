// Transactions Management Module - Clean Version - Part 1
import { transactionsAPI, partsAPI, invoicesAPI } from './api.js';
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
saveToStorage
} from './ui-utils.js';

// Unified state for the transaction modal
let transactionModalState = {
    selectedParts: [],
    isSearching: false,
    searchResults: []
};

// Initialize transaction filters
export function initTransactionFilters() {
    if (!elements.transactionSearch) return;

    const debouncedSearch = debounce(performTransactionSearch, 300);

    elements.transactionSearch.addEventListener('input', function(e) {
        appState.transactionFilters.search = e.target.value;
        saveFilters();
        debouncedSearch();
    });

    if (elements.transactionTypeFilter) {
        elements.transactionTypeFilter.addEventListener('change', function(e) {
            appState.transactionFilters.type = e.target.value;
            saveFilters();
            performTransactionSearch();
        });
    }

    if (elements.transactionPaymentFilter) {
        elements.transactionPaymentFilter.addEventListener('change', function(e) {
            appState.transactionFilters.paymentStatus = e.target.value;
            saveFilters();
            performTransactionSearch();
        });
    }

    if (elements.transactionDateFrom) {
        elements.transactionDateFrom.addEventListener('change', function(e) {
            appState.transactionFilters.dateFrom = e.target.value;
            saveFilters();
            performTransactionSearch();
        });
    }

    if (elements.transactionDateTo) {
        elements.transactionDateTo.addEventListener('change', function(e) {
            appState.transactionFilters.dateTo = e.target.value;
            saveFilters();
            performTransactionSearch();
        });
    }

    if (elements.clearTransactionFiltersBtn) {
        elements.clearTransactionFiltersBtn.addEventListener('click', clearTransactionFilters);
    }

    loadSavedFilters();
}

// Initialize transaction modal
export function initTransactionModal() {
    const modal = document.getElementById('transaction-modal');
    if (!modal) return;

    initPartSearch();
    initTransactionTypeHandler();
    initTransactionFormHandlers();
    initModalCloseHandlers();
}

// Initialize part search functionality
function initPartSearch() {
    const searchInput = document.getElementById('part-search');
    const clearBtn = document.getElementById('clear-search-btn');
    const searchResults = document.getElementById('search-results');

    if (!searchInput || !searchResults) return;

    const debouncedSearch = debounce(async function(query) {
        if (query.length < 2) {
            hideSearchResults();
            return;
        }

        try {
            transactionModalState.isSearching = true;
            showSearchLoading();

            const results = await partsAPI.search(query);
            transactionModalState.searchResults = results;
            renderSearchResults(results);

        } catch (error) {
            console.error('Search error:', error);
            showSearchError();
        } finally {
            transactionModalState.isSearching = false;
        }
    }, 300);

    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        debouncedSearch(query);

        if (clearBtn) {
            clearBtn.style.display = query ? 'block' : 'none';
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            hideSearchResults();
        });
    }

    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            hideSearchResults();
        }
    });
}

// Render search results
function renderSearchResults(parts) {
    const filtered = applyPartFilters(parts);
    const searchResults = document.getElementById('search-results');
    if (!searchResults) return;

    if (filtered.length === 0) {
        searchResults.innerHTML = '<div class="search-no-results"><i class="fas fa-search"></i><span>No parts found</span></div>';
    } else {
        let resultsHTML = '';

        for (let i = 0; i < filtered.length; i++) {
            const part = filtered[i];
            const isSelected = transactionModalState.selectedParts.find(p => p.id === part.id);

            resultsHTML += '<div class="search-result-item" data-part-id="' + part.id + '">';
            resultsHTML += '<div class="part-main-info">';
            resultsHTML += '<div class="part-name">' + part.name + '</div>';
            resultsHTML += '<div class="part-number text-muted">' + part.partNumber + '</div>';
            resultsHTML += '</div>';
            resultsHTML += '<div class="part-details">';
            resultsHTML += '<div class="stock-info">';
            resultsHTML += '<span class="stock-label">Stock:</span>';
            resultsHTML += '<span class="stock-value ' + (part.currentStock <= part.minimumStock ? 'low-stock' : '') + '">' + part.currentStock + '</span>';
            resultsHTML += '</div>';
            resultsHTML += '<div class="price-info">';
            resultsHTML += '<span class="price-label">Price:</span>';
            resultsHTML += '<span class="price-value">' + formatCurrency(part.unitPrice) + '</span>';
            resultsHTML += '</div>';
            resultsHTML += '</div>';
            resultsHTML += '<div class="part-actions">';

            if (isSelected) {
                resultsHTML += '<span class="already-selected"><i class="fas fa-check"></i> Selected</span>';
            } else {
                resultsHTML += '<button class="btn btn-sm btn-primary add-part-btn" type="button">Add</button>';
            }

            resultsHTML += '</div>';
            resultsHTML += '</div>';
        }

        searchResults.innerHTML = resultsHTML;

        // Add click handlers
        const resultItems = searchResults.querySelectorAll('.search-result-item');
        for (let i = 0; i < resultItems.length; i++) {
            const item = resultItems[i];
            const addBtn = item.querySelector('.add-part-btn');
            if (addBtn) {
                addBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const partId = parseInt(item.dataset.partId);
                    addPartToSelection(partId);
                });
            }
        }
    }

    searchResults.style.display = 'block';
}

// Transactions Management Module - Clean Version - Part 2

// Add part to selection
async function addPartToSelection(partId) {
    // Check if already selected
    const existingPart = transactionModalState.selectedParts.find(p => p.id === partId);
    if (existingPart) {
        showToast('Info', 'Part already selected', 'info');
        return;
    }

    try {
        // Find part in search results first
        let part = transactionModalState.searchResults.find(p => p.id === partId);

        // If not found in search results, fetch from API
        if (!part) {
            part = await partsAPI.getById(partId);
        }

        if (!part) {
            showToast('Error', 'Part not found', 'error');
            return;
        }

        // Add to selection with default values
        const selectedPart = {
            id: part.id,
            name: part.name,
            partNumber: part.partNumber,
            unitPrice: part.unitPrice,
            currentStock: part.currentStock,
            selectedQuantity: 1,
            selectedUnitPrice: part.unitPrice
        };

        transactionModalState.selectedParts.push(selectedPart);

        // Re-render search results
        if (transactionModalState.searchResults.length > 0) {
            renderSearchResults(transactionModalState.searchResults);
        }

        // Render selected parts
        renderSelectedParts();

        // Clear search
        const searchInput = document.getElementById('part-search');
        if (searchInput) {
            searchInput.value = '';
        }
        hideSearchResults();

        showToast('Success', part.name + ' added to transaction');

    } catch (error) {
        console.error('Error adding part:', error);
        showToast('Error', 'Failed to add part', 'error');
    }
}

// Remove part from selection
function removePartFromSelection(partId) {
    transactionModalState.selectedParts = transactionModalState.selectedParts.filter(function(p) {
        return p.id !== partId;
    });
    renderSelectedParts();

    // Update search results if visible
    if (transactionModalState.searchResults.length > 0) {
        renderSearchResults(transactionModalState.searchResults);
    }
}

// Render selected parts
function renderSelectedParts() {
    const container = document.getElementById('selected-parts');
    if (!container) return;

    const parts = transactionModalState.selectedParts;

    // Get current transaction type
    const typeElement = document.getElementById('transaction-type');
    const transactionType = typeElement ? typeElement.value : '';

    if (parts.length === 0) {
        container.innerHTML = '<div class="empty-selection"><i class="fas fa-inbox"></i><p>No parts selected</p><small class="text-muted">Search and add parts above</small></div>';
        updateSelectionSummary(0, 0);
        showSelectionError();
        return;
    }

    let partsHTML = '';
    partsHTML += '<div class="selected-parts-header">';
    partsHTML += '<div class="col-part">Part</div>';
    partsHTML += '<div class="col-qty">Quantity</div>';
    partsHTML += '<div class="col-price">Unit Price</div>';
    partsHTML += '<div class="col-total">Total</div>';
    partsHTML += '<div class="col-actions">Actions</div>';
    partsHTML += '</div>';
    partsHTML += '<div class="selected-parts-list">';

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const lineTotal = part.selectedQuantity * part.selectedUnitPrice;

        // ADAPT min/max for quantity input based on transaction type
        let qtyInputMin = 1;
        let qtyInputMax = '';
        if (transactionType === 'OUT') {
            qtyInputMax = `max="${part.currentStock}" `;
        }
        // For IN and ADJUSTMENT, don't set a max

        partsHTML += `<div class="selected-part-row" data-part-id="${part.id}">
            <div class="col-part">
                <div class="part-info">
                    <div class="part-name">${part.name}</div>
                    <div class="part-number">${part.partNumber}</div>
                    <div class="stock-available">Available: ${part.currentStock}</div>
                </div>
            </div>
            <div class="col-qty">
                <input type="number" class="form-control form-control-sm qty-input"
                    value="${part.selectedQuantity}" min="${qtyInputMin}" ${qtyInputMax}data-part-id="${part.id}">
            </div>
            <div class="col-price">
                <input type="number" class="form-control form-control-sm price-input"
                    value="${part.selectedUnitPrice}" min="0" step="0.01" data-part-id="${part.id}">
            </div>
            <div class="col-total">
                <span class="line-total">${formatCurrency(lineTotal)}</span>
            </div>
            <div class="col-actions">
                <button type="button" class="btn btn-sm btn-danger remove-part-btn" data-part-id="${part.id}" title="Remove part">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>`;
    }

    partsHTML += '</div>';
    container.innerHTML = partsHTML;

    // Add event listeners
    addSelectedPartsEventListeners();

    // Update summary
    const totalQuantity = parts.reduce(function(sum, part) {
        return sum + part.selectedQuantity;
    }, 0);
    const totalValue = parts.reduce(function(sum, part) {
        return sum + (part.selectedQuantity * part.selectedUnitPrice);
    }, 0);

    updateSelectionSummary(totalQuantity, totalValue);
    hideSelectionError();
}


// Add event listeners to selected parts
function addSelectedPartsEventListeners() {
    const container = document.getElementById('selected-parts');
    if (!container) return;

    // Quantity inputs
    const qtyInputs = container.querySelectorAll('.qty-input');
    for (let i = 0; i < qtyInputs.length; i++) {
        const input = qtyInputs[i];
        input.addEventListener('input', function(e) {   // <--- use 'input' not just 'change'
            const partId = parseInt(e.target.dataset.partId);
            const value = parseInt(e.target.value);
            updateSelectedPart(partId, 'selectedQuantity', value);
        });
    }

    // Price inputs
    const priceInputs = container.querySelectorAll('.price-input');
    for (let i = 0; i < priceInputs.length; i++) {
        const input = priceInputs[i];
        input.addEventListener('change', function(e) {
            const partId = parseInt(e.target.dataset.partId);
            const value = parseFloat(e.target.value);
            updateSelectedPart(partId, 'selectedUnitPrice', value);
        });
    }

    // Remove buttons
    const removeButtons = container.querySelectorAll('.remove-part-btn');
    for (let i = 0; i < removeButtons.length; i++) {
        const button = removeButtons[i];
        button.addEventListener('click', function(e) {
            const partId = parseInt(e.target.closest('.remove-part-btn').dataset.partId);
            removePartFromSelection(partId);
        });
    }
}

// Update selected part properties
function updateSelectedPart(partId, property, value) {
    const part = transactionModalState.selectedParts.find(function(p) {
        return p.id === partId;
    });

    if (!part) return;

    const typeElement = document.getElementById('transaction-type');
    const transactionType = typeElement ? typeElement.value : '';

    if (property === 'selectedQuantity') {
        const qty = parseInt(value);

        // Only limit for stock OUT, unlimited for IN and ADJUSTMENT
        if (transactionType === 'OUT') {
            if (qty > 0 && qty <= part.currentStock) {
                part.selectedQuantity = qty;
            } else {
                showToast('Warning', 'Quantity must be between 1 and ' + part.currentStock, 'warning');
                return;
            }
        } else {
            // IN or ADJUSTMENT
            if (qty > 0) {
                part.selectedQuantity = qty;
            } else {
                showToast('Warning', 'Quantity must be at least 1', 'warning');
                return;
            }
        }
    } else if (property === 'selectedUnitPrice') {
        const price = parseFloat(value);
        if (price >= 0) {
            part.selectedUnitPrice = price;
        } else {
            showToast('Warning', 'Price must be non-negative', 'warning');
            return;
        }
    }

    renderSelectedParts();
}

// Update selection summary
function updateSelectionSummary(totalQuantity, totalValue) {
    const countElement = document.getElementById('selected-parts-count');
    const totalElement = document.getElementById('selected-parts-total');

    if (countElement) {
        const partsCount = transactionModalState.selectedParts.length;
        const plural = partsCount !== 1 ? 's' : '';
        countElement.textContent = partsCount + ' part' + plural + ' selected (' + totalQuantity + ' items)';
    }

    if (totalElement) {
        totalElement.textContent = 'Total: ' + formatCurrency(totalValue);
    }
}

// Show/hide selection error
function showSelectionError() {
    const errorElement = document.getElementById('selected-parts-error');
    if (errorElement) {
        errorElement.textContent = 'Please select at least one part for the transaction.';
        errorElement.style.display = 'block';
    }
}

function hideSelectionError() {
    const errorElement = document.getElementById('selected-parts-error');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// Search helper functions
function hideSearchResults() {
    const searchResults = document.getElementById('search-results');
    if (searchResults) {
        searchResults.style.display = 'none';
    }
}

function showSearchLoading() {
    const searchResults = document.getElementById('search-results');
    if (searchResults) {
        searchResults.innerHTML = '<div class="search-loading"><i class="fas fa-spinner fa-spin"></i><span>Searching parts...</span></div>';
        searchResults.style.display = 'block';
    }
}

function showSearchError() {
    const searchResults = document.getElementById('search-results');
    if (searchResults) {
        searchResults.innerHTML = '<div class="search-error"><i class="fas fa-exclamation-triangle"></i><span>Error searching parts. Please try again.</span></div>';
    }
}

// Transactions Management Module - Clean Version - Part 3

// Initialize transaction type handler
function initTransactionTypeHandler() {
    const typeSelect = document.getElementById('transaction-type');
    const recipientGroup = document.getElementById('recipient-group');

    if (!typeSelect || !recipientGroup) return;

    function toggleRecipientField() {
        const isStockOut = typeSelect.value === 'OUT';

        if (isStockOut) {
            recipientGroup.classList.remove('hidden');
            const input = recipientGroup.querySelector('input');
            if (input) input.required = true;
        } else {
            recipientGroup.classList.add('hidden');
            const input = recipientGroup.querySelector('input');
            if (input) {
                input.required = false;
                input.value = '';
            }
        }
        if (typeof renderSelectedParts === 'function') {
            renderSelectedParts();
        }

    }

    typeSelect.addEventListener('change', toggleRecipientField);
    toggleRecipientField(); // Initial call
}

// Initialize form handlers
function initTransactionFormHandlers() {
    const form = document.getElementById('transaction-form');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await handleTransactionSubmit();
    });

    // Auto-calculate amount paid when "Mark as Fully Paid" is checked
    const isPaidCheckbox = document.getElementById('transaction-is-paid');
    const amountPaidInput = document.getElementById('transaction-amount-paid');

    if (isPaidCheckbox && amountPaidInput) {
        isPaidCheckbox.addEventListener('change', function() {
            if (isPaidCheckbox.checked) {
                const totalValue = transactionModalState.selectedParts.reduce(function(sum, part) {
                    return sum + (part.selectedQuantity * part.selectedUnitPrice);
                }, 0);
                amountPaidInput.value = totalValue.toFixed(2);
            }
        });
    }
}

// Handle transaction form submission
async function handleTransactionSubmit() {
    try {
        // Validate selected parts
        if (transactionModalState.selectedParts.length === 0) {
            showSelectionError();
            showToast('Error', 'Please select at least one part', 'error');
            return;
        }

        // Validate form fields
        const typeElement = document.getElementById('transaction-type');
        const type = typeElement ? typeElement.value : '';
        if (!type) {
            showToast('Error', 'Please select a transaction type', 'error');
            return;
        }

        // Validate recipient for stock out transactions
        if (type === 'OUT') {
            const recipientElement = document.getElementById('transaction-recipient');
            const recipient = recipientElement ? recipientElement.value.trim() : '';
            if (!recipient) {
                showToast('Error', 'Recipient name is required for stock out transactions', 'error');
                return;
            }
        }

        // Prepare transaction data
        const formData = {
            type: type,
            parts: transactionModalState.selectedParts.map(function(part) {
                return {
                    partId: part.id,
                    quantity: part.selectedQuantity,
                    unitPrice: part.selectedUnitPrice
                };
            }),
            recipientName: getElementValue('transaction-recipient') || null,
            reason: getElementValue('transaction-reason') || null,
            isPaid: getElementChecked('transaction-is-paid') || false,
            amountPaid: parseFloat(getElementValue('transaction-amount-paid')) || 0,
            notes: getElementValue('transaction-notes') || null
        };

        showLoading('Saving transaction...');

        const result = await transactionsAPI.create(formData);
        console.log('Transaction result:', result); // Debug log

        showToast('Success', 'Transaction saved successfully!');

        // Close modal and reset
        closeTransactionModal();

        // Refresh data
        await refreshAllData();

        // Handle invoices - FIXED: Handle the correct response structure
        if (result && Array.isArray(result)) {
            // Backend returns array of TransactionWithInvoicesDto
            const allInvoices = [];
            const transactionIds = [];

            result.forEach(function(transactionWithInvoices) {
                if (transactionWithInvoices.transaction) {
                    transactionIds.push(transactionWithInvoices.transaction.id);
                }
                if (transactionWithInvoices.invoices && transactionWithInvoices.invoices.length > 0) {
                    allInvoices.push(...transactionWithInvoices.invoices);
                }
            });

            if (allInvoices.length > 0) {
                setTimeout(function() {
                    showInvoiceOptions(allInvoices, transactionIds[0]); // Use first transaction ID
                }, 500);
            }
        } else if (result && result.invoices && result.invoices.length > 0) {
            // Single transaction response
            setTimeout(function() {
                showInvoiceOptions(result.invoices, result.transaction.id);
            }, 500);
        }

    } catch (error) {
        console.error('Transaction submission error:', error);
        handleError(error, 'saving transaction');
    } finally {
        hideLoading();
    }
}

// Helper function to get element value safely
function getElementValue(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.value.trim() : '';
}

// Helper function to get element checked state safely
function getElementChecked(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.checked : false;
}

// Initialize modal close handlers
function initModalCloseHandlers() {
    const modal = document.getElementById('transaction-modal');
    const cancelBtn = document.getElementById('cancel-transaction');
    const closeBtn = modal ? modal.querySelector('.close') : null;

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeTransactionModal);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeTransactionModal);
    }

    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeTransactionModal();
            }
        });
    }
}

// Open transaction modal
export function openTransactionModal() {
    const modal = document.getElementById('transaction-modal');
    if (!modal) return;

    // Reset state
    resetTransactionModal();

    // Show modal
    modal.classList.add('show');

    // Focus on search input
    setTimeout(function() {
        const searchInput = document.getElementById('part-search');
        if (searchInput) {
            searchInput.focus();
        }
    }, 100);
}

// Close transaction modal
export function closeTransactionModal() {
    const modal = document.getElementById('transaction-modal');
    if (!modal) return;

    modal.classList.remove('show');
    resetTransactionModal();
}

// Reset transaction modal to initial state
function resetTransactionModal() {
    // Reset state
    transactionModalState.selectedParts = [];
    transactionModalState.searchResults = [];
    transactionModalState.isSearching = false;

    // Clear form
    const form = document.getElementById('transaction-form');
    if (form) {
        form.reset();
    }

    // Clear search
    const searchInput = document.getElementById('part-search');
    if (searchInput) {
        searchInput.value = '';
    }

    const clearBtn = document.getElementById('clear-search-btn');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }

    // Hide search results
    hideSearchResults();

    // Render empty selection
    renderSelectedParts();

    // Reset transaction type handler
    const recipientGroup = document.getElementById('recipient-group');
    if (recipientGroup) {
        recipientGroup.classList.add('hidden');
    }
}

// Refresh all relevant data after transaction
async function refreshAllData() {
    try {
        const promises = [];

        // Refresh dashboard if visible
        if (appState.currentSection === 'dashboard') {
            const dashboardModule = await import('./dashboard.js');
            promises.push(dashboardModule.loadDashboard());
        }

        // Refresh parts if visible
        if (appState.currentSection === 'parts') {
            const partsModule = await import('./parts.js');
            promises.push(partsModule.loadParts());
        }

        // Refresh transactions if visible
        if (appState.currentSection === 'transactions') {
            promises.push(loadTransactions());
        }

        await Promise.all(promises);

    } catch (error) {
        console.error('Error refreshing data:', error);
    }
}

function showInvoiceOptions(invoices, transactionId) {
    if (!invoices || invoices.length === 0) {
        console.log('No invoices to show');
        return;
    }

    console.log('Showing invoice options:', invoices); // Debug log

    let modalHtml = '<div class="invoice-options-modal modal show">';
    modalHtml += '<div class="modal-content">';
    modalHtml += '<div class="modal-header">';
    modalHtml += '<h3><i class="fas fa-file-invoice"></i> Transaction Complete</h3>';
    modalHtml += '<button class="close" onclick="closeInvoiceModal()">&times;</button>';
    modalHtml += '</div>';
    modalHtml += '<div class="modal-body">';
    modalHtml += '<div class="success-message">';
    modalHtml += '<i class="fas fa-check-circle"></i>';
    modalHtml += '<span>Transaction completed successfully!</span>';
    modalHtml += '</div>';
    modalHtml += '<p>' + invoices.length + ' invoice(s) have been generated:</p>';
    modalHtml += '<div class="invoice-list">';

    for (let i = 0; i < invoices.length; i++) {
        const invoice = invoices[i];
        modalHtml += '<div class="invoice-item">';
        modalHtml += '<div class="invoice-info">';
        modalHtml += '<strong>' + invoice.invoiceNumber + '</strong>';
        modalHtml += '<span class="invoice-type">' + (invoice.type || 'CUSTOMER_COPY').replace('_', ' ') + '</span>';
        modalHtml += '<span class="invoice-amount">' + formatCurrency(invoice.totalAmount || 0) + '</span>';
        modalHtml += '</div>';
        modalHtml += '<div class="invoice-actions">';
        modalHtml += '<button class="btn btn-sm btn-primary" onclick="viewInvoiceDetails(' + invoice.id + ')">';
        modalHtml += '<i class="fas fa-eye"></i> View';
        modalHtml += '</button>';
        modalHtml += '<button class="btn btn-sm btn-secondary" onclick="printInvoiceDetails(' + invoice.id + ')">';
        modalHtml += '<i class="fas fa-print"></i> Print';
        modalHtml += '</button>';
        modalHtml += '</div>';
        modalHtml += '</div>';
    }

    modalHtml += '</div>';
    modalHtml += '</div>';
    modalHtml += '<div class="modal-footer">';
    modalHtml += '<button class="btn btn-secondary" onclick="closeInvoiceModal()">Close</button>';
    modalHtml += '</div>';
    modalHtml += '</div>';
    modalHtml += '</div>';

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ADD this function to close invoice modal
window.closeInvoiceModal = function() {
    const modal = document.querySelector('.invoice-options-modal');
    if (modal) {
        modal.remove();
    }
};

// ADD enhanced invoice viewing functions
window.viewInvoiceDetails = async function(invoiceId) {
    try {
        showLoading();
        const htmlContent = await invoicesAPI.getHTML(invoiceId);

        const printWindow = window.open('', '_blank', 'width=800,height=900,scrollbars=yes,resizable=yes');
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Error', 'Failed to view invoice', 'error');
        console.error('Error viewing invoice:', error);
    }
};

window.printInvoiceDetails = async function(invoiceId) {
    try {
        showLoading();
        const htmlContent = await invoicesAPI.getHTML(invoiceId);

        const printWindow = window.open('', '_blank', 'width=800,height=900');
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // Auto-print after a short delay
        printWindow.onload = function() {
            setTimeout(function() {
                printWindow.print();
            }, 500);
        };

        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Error', 'Failed to print invoice', 'error');
        console.error('Error printing invoice:', error);
    }
};
// Transactions Management Module - Clean Version - Part 4 (Final)

// Filter and search functions
function saveFilters() {
    saveToStorage('transactionFilters', appState.transactionFilters);
}

function loadSavedFilters() {
    if (elements.transactionSearch) {
        elements.transactionSearch.value = appState.transactionFilters.search;
    }
    if (elements.transactionTypeFilter) {
        elements.transactionTypeFilter.value = appState.transactionFilters.type;
    }
    if (elements.transactionPaymentFilter) {
        elements.transactionPaymentFilter.value = appState.transactionFilters.paymentStatus;
    }
    if (elements.transactionDateFrom) {
        elements.transactionDateFrom.value = appState.transactionFilters.dateFrom;
    }
    if (elements.transactionDateTo) {
        elements.transactionDateTo.value = appState.transactionFilters.dateTo;
    }
}

function clearTransactionFilters() {
    appState.transactionFilters = {
        search: '',
        type: '',
        paymentStatus: '',
        dateFrom: '',
        dateTo: ''
    };

    loadSavedFilters();
    saveFilters();
    performTransactionSearch();
}

async function performTransactionSearch() {
    try {
        showLoading();
        const allTransactions = await transactionsAPI.getAll();
        const filteredTransactions = filterTransactions(allTransactions);
        renderTransactions(filteredTransactions);
    } catch (error) {
        handleError(error, 'transaction search');
    } finally {
        hideLoading();
    }
}

function filterTransactions(transactions) {
    const filters = appState.transactionFilters;

    return transactions.filter(function(transaction) {
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            const searchableText = [
                transaction.recipientName || '',
                transaction.partName || '',
                transaction.reason || '',
                transaction.notes || ''
            ].join(' ').toLowerCase();

            if (searchableText.indexOf(searchTerm) === -1) {
                return false;
            }
        }

        if (filters.type && transaction.type !== filters.type) {
            return false;
        }

        if (filters.paymentStatus) {
            const isPaid = transaction.isPaid;
            const hasPartialPayment = transaction.amountPaid > 0 && !isPaid;

            switch (filters.paymentStatus) {
                case 'paid':
                    if (!isPaid) return false;
                    break;
                case 'unpaid':
                    if (isPaid || hasPartialPayment) return false;
                    break;
                case 'partial':
                    if (!hasPartialPayment) return false;
                    break;
            }
        }

        if (filters.dateFrom || filters.dateTo) {
            const transactionDate = new Date(transaction.transactionDate);

            if (filters.dateFrom) {
                const fromDate = new Date(filters.dateFrom);
                if (transactionDate < fromDate) return false;
            }

            if (filters.dateTo) {
                const toDate = new Date(filters.dateTo);
                toDate.setHours(23, 59, 59, 999);
                if (transactionDate > toDate) return false;
            }
        }

        return true;
    });
}

export async function loadTransactions() {
    try {
        showLoading();
        await performTransactionSearch();
    } catch (error) {
        handleError(error, 'loading transactions');
    } finally {
        hideLoading();
    }
}

export function renderTransactions(transactions) {
    if (!elements.transactionsTable) return;

    if (!transactions || transactions.length === 0) {
        elements.transactionsTable.innerHTML = '<div class="empty-state"><i class="fas fa-exchange-alt"></i><h3>No transactions found</h3><p>No transactions match your current filters.</p></div>';
        return;
    }

    const sortedTransactions = transactions.slice().sort(function(a, b) {
        return new Date(b.transactionDate) - new Date(a.transactionDate);
    });

    let tableHTML = '<div class="table-responsive">';
    tableHTML += '<table class="data-table">';
    tableHTML += '<thead>';
    tableHTML += '<tr>';
    tableHTML += '<th>Date</th>';
    tableHTML += '<th>Parts</th>';
    tableHTML += '<th>Type</th>';
    tableHTML += '<th>Quantity</th>';
    tableHTML += '<th>Recipient</th>';
    tableHTML += '<th>Amount</th>';
    tableHTML += '<th>Payment Status</th>';
    tableHTML += '<th>Reason</th>';
    tableHTML += '<th>Actions</th>';
    tableHTML += '</tr>';
    tableHTML += '</thead>';
    tableHTML += '<tbody>';

    for (let i = 0; i < sortedTransactions.length; i++) {
        const transaction = sortedTransactions[i];
        const items = Array.isArray(transaction.items) ? transaction.items : [];

        // Consolidated item descriptions
        const partNames = items.length
            ? items.map(item => (item.partName ? item.partName : 'Unknown') + ' (x' + item.quantity + ')').join(', ')
            : 'No items';

        // All part IDs as string (optional)
        const partIds = items.length
            ? items.map(item => item.partId).join(', ')
            : 'N/A';

        // Total quantity for the transaction
        const totalQty = items.length
            ? items.reduce((sum, item) => sum + (item.quantity || 0), 0)
            : 'N/A';

        tableHTML += '<tr class="transaction-row" data-id="' + transaction.id + '">';
        tableHTML += '<td class="transaction-date">' + formatDate(transaction.transactionDate) + '</td>';

        // Parts info (names and IDs as tooltip)
        tableHTML += `<td class="transaction-part" title="IDs: ${partIds}">${partNames}</td>`;

        tableHTML += '<td>';
        tableHTML += '<span class="transaction-type ' + transaction.type.toLowerCase() + '">' + transaction.type + '</span>';
        tableHTML += '</td>';

        tableHTML += `<td class="transaction-quantity"><span class="quantity-badge ${transaction.type.toLowerCase()}">${totalQty}</span></td>`;
        tableHTML += '<td class="transaction-recipient">' + (transaction.recipientName || 'N/A') + '</td>';
        tableHTML += '<td class="transaction-amount">' + (transaction.totalAmount ? formatCurrency(transaction.totalAmount) : 'N/A') + '</td>';
        tableHTML += '<td class="transaction-payment">';
        tableHTML += renderPaymentStatus(transaction);
        tableHTML += '</td>';
        tableHTML += '<td class="transaction-reason">';
        tableHTML += '<div class="reason-text" title="' + (transaction.reason || 'N/A') + '">' + (transaction.reason || 'N/A') + '</div>';
        if (transaction.notes) {
            tableHTML += '<div class="notes-text text-muted" title="' + transaction.notes + '">Notes: ' + transaction.notes + '</div>';
        }
        tableHTML += '</td>';
        tableHTML += '<td class="transaction-actions">';
        tableHTML += '<div class="action-buttons">';
        tableHTML += '<button class="btn-icon btn-success" onclick="updateTransactionPayment(' + transaction.id + ')" title="Update Payment">';
        tableHTML += '<i class="fas fa-dollar-sign"></i>';
        tableHTML += '</button>';
        tableHTML += '<button class="btn-icon btn-info" onclick="viewTransactionDetails(' + transaction.id + ')" title="View Details">';
        tableHTML += '<i class="fas fa-eye"></i>';
        tableHTML += '</button>';
        tableHTML += '<button class="btn-icon btn-danger" onclick="deleteTransaction(' + transaction.id + ')" title="Delete">';
        tableHTML += '<i class="fas fa-trash"></i>';
        tableHTML += '</button>';
        tableHTML += '</div>';
        tableHTML += '</td>';
        tableHTML += '</tr>';
    }

    tableHTML += '</tbody>';
    tableHTML += '</table>';
    tableHTML += '</div>';
    tableHTML += '<div class="transaction-summary">';
    tableHTML += '<div class="summary-item">';
    tableHTML += '<span class="summary-label">Total Transactions:</span>';
    tableHTML += '<span class="summary-value">' + transactions.length + '</span>';
    tableHTML += '</div>';
    tableHTML += '<div class="summary-item">';
    tableHTML += '<span class="summary-label">Total Value:</span>';
    tableHTML += '<span class="summary-value">' + formatCurrency(calculateTotalValue(transactions)) + '</span>';
    tableHTML += '</div>';
    tableHTML += '</div>';

    elements.transactionsTable.innerHTML = tableHTML;
}

function renderPaymentStatus(transaction) {
    const isPaid = transaction.isPaid;
    const amountPaid = transaction.amountPaid || 0;
    const totalAmount = transaction.totalAmount || 0;

    if (isPaid) {
        return '<span class="payment-status paid">Paid</span>';
    } else if (amountPaid > 0) {
        return '<span class="payment-status partial">Partial</span><div class="payment-details">' + formatCurrency(amountPaid) + ' / ' + formatCurrency(totalAmount) + '</div>';
    } else {
        return '<span class="payment-status unpaid">Unpaid</span>';
    }
}

function calculateTotalValue(transactions) {
    return transactions.reduce(function(total, transaction) {
        return total + (transaction.totalAmount || 0);
    }, 0);
}

// Payment update functions
export async function updateTransactionPayment(transactionId) {
    try {
        showLoading();
        const transaction = await transactionsAPI.getById(transactionId);
        if (!transaction) {
            showToast('Error', 'Transaction not found', 'error');
            return;
        }
        hideLoading();

        // Show the payment update modal
        showPaymentUpdateModal(transaction);

    } catch (error) {
        handleError(error, 'updating payment');
        hideLoading();
    }
}
function showPaymentUpdateModal(transaction) {
    const currentAmount = transaction.amountPaid || 0;
    const totalAmount = transaction.totalAmount || 0;
    const remainingAmount = Math.max(0, totalAmount - currentAmount);

    const modalHtml = '<div id="payment-update-modal" class="modal show">' +
    '<div class="modal-content">' +
    '<div class="modal-header">' +
    '<h3>Update Payment - Transaction #' + transaction.id + '</h3>' +
    '<button class="close" onclick="closePaymentModal()">&times;</button>' +
    '</div>' +
    '<div class="modal-body">' +
    '<div class="payment-summary">' +
    '<div class="summary-row">' +
    '<span>Total Amount:</span>' +
    '<span id="payment-total-amount">' + formatCurrency(totalAmount) + '</span>' +
    '</div>' +
    '<div class="summary-row">' +
    '<span>Current Paid:</span>' +
    '<span id="payment-current-amount">' + formatCurrency(currentAmount) + '</span>' +
    '</div>' +
    '<div class="summary-row">' +
    '<span>Remaining:</span>' +
    '<span id="payment-remaining-amount">' + formatCurrency(remainingAmount) + '</span>' +
    '</div>' +
    '</div>' +
    '<div class="form-group">' +
    '<label for="payment-amount">Payment Amount:</label>' +
    '<input type="number" id="payment-amount" step="0.01" min="0" max="' + remainingAmount + '" value="' + remainingAmount.toFixed(2) + '">' +
    '</div>' +
    '<div class="form-group">' +
    '<label>' +
    '<input type="checkbox" id="mark-as-paid"> Mark as Fully Paid' +
    '</label>' +
    '</div>' +
    '<div class="payment-preview" id="payment-preview">' +
    '<h4>Preview:</h4>' +
    '<div class="preview-row">' +
    '<span>New Total Paid:</span>' +
    '<span id="preview-new-total">' + formatCurrency(totalAmount) + '</span>' +
    '</div>' +
    '<div class="preview-row">' +
    '<span>Remaining Balance:</span>' +
    '<span id="preview-remaining">$0.00</span>' +
    '</div>' +
    '<div class="preview-row">' +
    '<span>Status:</span>' +
    '<span id="preview-status" class="preview-status paid">Fully Paid</span>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="modal-footer">' +
    '<button type="button" class="btn btn-secondary" onclick="closePaymentModal()">Cancel</button>' +
    '<button type="button" class="btn btn-primary" onclick="processPaymentUpdate(' + transaction.id + ')">Update Payment</button>' +
    '</div>' +
    '</div>' +
    '</div>';

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Add event listeners for real-time preview
    const paymentAmountInput = document.getElementById('payment-amount');
    const markAsPaidCheckbox = document.getElementById('mark-as-paid');

    function updatePreview() {
        const paymentAmount = parseFloat(paymentAmountInput.value) || 0;
        const markAsPaid = markAsPaidCheckbox.checked;

        const newTotalPaid = currentAmount + paymentAmount;
        const newRemainingBalance = Math.max(0, totalAmount - newTotalPaid);

        document.getElementById('preview-new-total').textContent = formatCurrency(newTotalPaid);
        document.getElementById('preview-remaining').textContent = formatCurrency(newRemainingBalance);

        const statusElement = document.getElementById('preview-status');
        if (markAsPaid || newTotalPaid >= totalAmount) {
            statusElement.textContent = 'Fully Paid';
            statusElement.className = 'preview-status paid';
        } else if (newTotalPaid > 0) {
            statusElement.textContent = 'Partial Payment';
            statusElement.className = 'preview-status partial';
        } else {
            statusElement.textContent = 'Unpaid';
            statusElement.className = 'preview-status unpaid';
        }
    }

    paymentAmountInput.addEventListener('input', updatePreview);
    markAsPaidCheckbox.addEventListener('change', updatePreview);

    // Initial preview update
    updatePreview();
}
window.closePaymentModal = function() {
    const modal = document.getElementById('payment-update-modal');
    if (modal) {
        modal.remove();
    }
};

// ADD this function to process payment update
window.processPaymentUpdate = async function(transactionId) {
    try {
        const paymentAmount = parseFloat(document.getElementById('payment-amount').value) || 0;
        const markAsPaid = document.getElementById('mark-as-paid').checked;

        if (paymentAmount < 0) {
            showToast('Error', 'Payment amount cannot be negative', 'error');
            return;
        }

        showLoading();

        // Get current transaction to calculate new total
        const transaction = await transactionsAPI.getById(transactionId);
        const currentAmount = transaction.amountPaid || 0;
        const totalAmount = transaction.totalAmount || 0;
        const newTotalPaid = currentAmount + paymentAmount;

        await transactionsAPI.updatePayment(transactionId, {
            amountPaid: newTotalPaid,
            isPaid: markAsPaid || newTotalPaid >= totalAmount
        });

        showToast('Success', 'Payment updated successfully');
        closePaymentModal();
        await loadTransactions();

    } catch (error) {
        handleError(error, 'updating payment');
    } finally {
        hideLoading();
    }
};

// Delete transaction
export async function deleteTransaction(transactionId) {
    try {
        const confirmed = await confirmAction(
            'Are you sure you want to delete this transaction? This action cannot be undone.',
            'Delete Transaction'
        );

        if (!confirmed) return;

        showLoading();
        await transactionsAPI.delete(transactionId);
        showToast('Success', 'Transaction deleted successfully');
        await loadTransactions();

    } catch (error) {
        handleError(error, 'deleting transaction');
    } finally {
        hideLoading();
    }
}

// View transaction details
export async function viewTransactionDetails(transactionId) {
    try {
        showLoading();
        const transaction = await transactionsAPI.getById(transactionId);

        let detailsHTML = '<div class="transaction-details-modal">';
        detailsHTML += '<div class="modal-content">';
        detailsHTML += '<div class="modal-header">';
        detailsHTML += '<h3>Transaction Details</h3>';
        detailsHTML += '<button class="close" onclick="this.closest(\'.transaction-details-modal\').remove()">&times;</button>';
        detailsHTML += '</div>';
        detailsHTML += '<div class="transaction-details-content">';
        detailsHTML += '<div class="details-grid">';
        detailsHTML += '<div class="detail-item">';
        detailsHTML += '<label>Transaction ID:</label>';
        detailsHTML += '<span>' + transaction.id + '</span>';
        detailsHTML += '</div>';
        detailsHTML += '<div class="detail-item">';
        detailsHTML += '<label>Date:</label>';
        detailsHTML += '<span>' + formatDate(transaction.transactionDate) + '</span>';
        detailsHTML += '</div>';
        detailsHTML += '<div class="detail-item">';
        detailsHTML += '<label>Part:</label>';
        detailsHTML += '<span>' + transaction.partName + ' (ID: ' + transaction.partId + ')</span>';
        detailsHTML += '</div>';
        detailsHTML += '<div class="detail-item">';
        detailsHTML += '<label>Type:</label>';
        detailsHTML += '<span class="transaction-type ' + transaction.type.toLowerCase() + '">' + transaction.type + '</span>';
        detailsHTML += '</div>';
        detailsHTML += '<div class="detail-item">';
        detailsHTML += '<label>Quantity:</label>';
        detailsHTML += '<span>' + transaction.quantity + '</span>';
        detailsHTML += '</div>';
        detailsHTML += '<div class="detail-item">';
        detailsHTML += '<label>Unit Price:</label>';
        detailsHTML += '<span>' + (transaction.unitPrice ? formatCurrency(transaction.unitPrice) : 'N/A') + '</span>';
        detailsHTML += '</div>';
        detailsHTML += '<div class="detail-item">';
        detailsHTML += '<label>Total Amount:</label>';
        detailsHTML += '<span>' + (transaction.totalAmount ? formatCurrency(transaction.totalAmount) : 'N/A') + '</span>';
        detailsHTML += '</div>';
        detailsHTML += '<div class="detail-item">';
        detailsHTML += '<label>Recipient:</label>';
        detailsHTML += '<span>' + (transaction.recipientName || 'N/A') + '</span>';
        detailsHTML += '</div>';
        detailsHTML += '<div class="detail-item">';
        detailsHTML += '<label>Payment Status:</label>';
        detailsHTML += '<span>' + renderPaymentStatus(transaction) + '</span>';
        detailsHTML += '</div>';
        detailsHTML += '<div class="detail-item full-width">';
        detailsHTML += '<label>Reason:</label>';
        detailsHTML += '<span>' + (transaction.reason || 'N/A') + '</span>';
        detailsHTML += '</div>';
        detailsHTML += '<div class="detail-item full-width">';
        detailsHTML += '<label>Notes:</label>';
        detailsHTML += '<span>' + (transaction.notes || 'N/A') + '</span>';
        detailsHTML += '</div>';
        detailsHTML += '</div>';
        detailsHTML += '</div>';
        detailsHTML += '</div>';
        detailsHTML += '</div>';

        document.body.insertAdjacentHTML('beforeend', detailsHTML);

    } catch (error) {
        handleError(error, 'loading transaction details');
    } finally {
        hideLoading();
    }
}

// Global functions for invoice actions
window.viewInvoice = async function(invoiceId) {
    try {
        const htmlContent = await invoicesAPI.getHTML(invoiceId);
        const printWindow = window.open('', '_blank', 'width=800,height=900,scrollbars=yes');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    } catch (error) {
        showToast('Error', 'Failed to view invoice', 'error');
    }
};

window.printInvoice = async function(invoiceId) {
    try {
        const printWindow = await window.viewInvoice(invoiceId);
        if (printWindow) {
            printWindow.focus();
            setTimeout(function() {
                printWindow.print();
            }, 500);
        }
    } catch (error) {
        showToast('Error', 'Failed to print invoice', 'error');
    }
};

// Make functions available globally
window.openTransactionModal = openTransactionModal;
window.closeTransactionModal = closeTransactionModal;
window.updateTransactionPayment = updateTransactionPayment;
window.deleteTransaction = deleteTransaction;
window.viewTransactionDetails = viewTransactionDetails;
window.viewInvoice = window.viewInvoiceDetails;
window.printInvoice = window.printInvoiceDetails;

// --- Enhanced Part Filters UI: Supplier, Location, Models, Description ---
function ensurePartFiltersUI() {
    const searchWrapper = document.querySelector('.search-input-wrapper');
    if (!searchWrapper || document.getElementById('transaction-part-filters')) return;
    const filtersDiv = document.createElement('div');
    filtersDiv.className = 'search-filters';
    filtersDiv.id = 'transaction-part-filters';
    filtersDiv.innerHTML = `
        <select id="filter-supplier"><option value="">All Suppliers</option></select>
        <select id="filter-location"><option value="">All Locations</option></select>
        <select id="filter-machine-models" multiple size="3"></select>
        <label>
            <input type="checkbox" id="filter-has-description"> Has Description
        </label>
    `;
    searchWrapper.parentNode.insertBefore(filtersDiv, searchWrapper.nextSibling);
}

function populateTransactionPartFilters(parts) {
    // Populate supplier, location, machine model options
    const supplierSet = new Set(), locationSet = new Set(), modelSet = new Set();
    parts.forEach(part => {
        if (part.supplier) supplierSet.add(part.supplier);
        if (part.location) locationSet.add(part.location);
        if (Array.isArray(part.machineModels)) part.machineModels.forEach(m => modelSet.add(m));
    });
    const supplierSelect = document.getElementById('filter-supplier');
    const locationSelect = document.getElementById('filter-location');
    const modelSelect = document.getElementById('filter-machine-models');
    if (supplierSelect) supplierSelect.innerHTML = '<option value="">All Suppliers</option>' + [...supplierSet].map(s => `<option value="${s}">${s}</option>`).join('');
    if (locationSelect) locationSelect.innerHTML = '<option value="">All Locations</option>' + [...locationSet].map(l => `<option value="${l}">${l}</option>`).join('');
    if (modelSelect) modelSelect.innerHTML = [...modelSet].map(m => `<option value="${m}">${m}</option>`).join('');
}

function getPartFilterValues() {
    const supplier = document.getElementById('filter-supplier')?.value || '';
    const location = document.getElementById('filter-location')?.value || '';
    const modelSelect = document.getElementById('filter-machine-models');
    const selectedModels = modelSelect ? Array.from(modelSelect.selectedOptions).map(opt => opt.value) : [];
    const hasDesc = document.getElementById('filter-has-description')?.checked || false;
    return { supplier, location, selectedModels, hasDesc };
}

function applyPartFilters(parts) {
    const { supplier, location, selectedModels, hasDesc } = getPartFilterValues();
    return parts.filter(part => {
        if (supplier && part.supplier !== supplier) return false;
        if (location && part.location !== location) return false;
        if (selectedModels.length > 0) {
            const models = Array.isArray(part.machineModels) ? part.machineModels : [];
            if (!selectedModels.some(m => models.includes(m))) return false;
        }
        if (hasDesc && (!part.description || !part.description.trim())) return false;
        return true;
    });
}