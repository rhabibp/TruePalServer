// Invoices Management Module
import { invoicesAPI } from './api.js';
import { 
    elements, 
    appState, 
    showLoading, 
    hideLoading, 
    showToast, 
    formatCurrency, 
    formatDate,
    formatDateInput,
    handleError,
    confirmAction,
    debounce,
    saveToStorage
} from './ui-utils.js';

// Invoice filtering and search
export function initInvoiceFilters() {
    if (!elements.invoiceSearch) return;

    // Debounced search function
    const debouncedSearch = debounce(performInvoiceSearch, 300);

    // Search input
    elements.invoiceSearch.addEventListener('input', (e) => {
        appState.invoiceFilters.search = e.target.value;
        saveInvoiceFilters();
        debouncedSearch();
    });

    // Type filter
    elements.invoiceTypeFilter?.addEventListener('change', (e) => {
        appState.invoiceFilters.type = e.target.value;
        saveInvoiceFilters();
        performInvoiceSearch();
    });

    // Payment status filter
    elements.invoicePaymentFilter?.addEventListener('change', (e) => {
        appState.invoiceFilters.paymentStatus = e.target.value;
        saveInvoiceFilters();
        performInvoiceSearch();
    });

    // Date filters
    elements.invoiceDateFrom?.addEventListener('change', (e) => {
        appState.invoiceFilters.dateFrom = e.target.value;
        saveInvoiceFilters();
        performInvoiceSearch();
    });

    elements.invoiceDateTo?.addEventListener('change', (e) => {
        appState.invoiceFilters.dateTo = e.target.value;
        saveInvoiceFilters();
        performInvoiceSearch();
    });

    // Clear filters button
    elements.clearInvoiceFiltersBtn?.addEventListener('click', clearInvoiceFilters);

    // Print invoice button
    elements.printInvoiceBtn?.addEventListener('click', handlePrintInvoice);

    // Load saved filters
    loadSavedInvoiceFilters();
}

function saveInvoiceFilters() {
    saveToStorage('invoiceFilters', appState.invoiceFilters);
}

function loadSavedInvoiceFilters() {
    // Set filter values from saved state
    if (elements.invoiceSearch) {
        elements.invoiceSearch.value = appState.invoiceFilters.search;
    }
    if (elements.invoiceTypeFilter) {
        elements.invoiceTypeFilter.value = appState.invoiceFilters.type;
    }
    if (elements.invoicePaymentFilter) {
        elements.invoicePaymentFilter.value = appState.invoiceFilters.paymentStatus;
    }
    if (elements.invoiceDateFrom) {
        elements.invoiceDateFrom.value = appState.invoiceFilters.dateFrom;
    }
    if (elements.invoiceDateTo) {
        elements.invoiceDateTo.value = appState.invoiceFilters.dateTo;
    }
}

function clearInvoiceFilters() {
    appState.invoiceFilters = {
        search: '',
        type: '',
        paymentStatus: '',
        dateFrom: '',
        dateTo: ''
    };

    loadSavedInvoiceFilters();
    saveInvoiceFilters();
    performInvoiceSearch();
}

async function performInvoiceSearch() {
    try {
        showLoading();
        const allInvoices = await invoicesAPI.getAll();
        const filteredInvoices = filterInvoices(allInvoices);
        renderInvoices(filteredInvoices);
    } catch (error) {
        handleError(error, 'invoice search');
    } finally {
        hideLoading();
    }
}

function filterInvoices(invoices) {
    const filters = appState.invoiceFilters;
    
    return invoices.filter(invoice => {
        // Search filter
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            const searchableText = [
                invoice.invoiceNumber,
                invoice.partName,
                invoice.partNumber,
                invoice.recipientName,
                invoice.reason,
                invoice.notes
            ].filter(Boolean).join(' ').toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }

        // Type filter
        if (filters.type && invoice.type !== filters.type) {
            return false;
        }

        // Payment status filter
        if (filters.paymentStatus) {
            if (filters.paymentStatus === 'paid' && !invoice.isPaid) {
                return false;
            }
            if (filters.paymentStatus === 'unpaid' && invoice.isPaid) {
                return false;
            }
            if (filters.paymentStatus === 'partial' && (invoice.isPaid || invoice.amountPaid === 0)) {
                return false;
            }
        }

        // Date filters
        if (filters.dateFrom) {
            const invoiceDate = new Date(invoice.createdAt);
            const fromDate = new Date(filters.dateFrom);
            if (invoiceDate < fromDate) {
                return false;
            }
        }

        if (filters.dateTo) {
            const invoiceDate = new Date(invoice.createdAt);
            const toDate = new Date(filters.dateTo);
            toDate.setHours(23, 59, 59, 999); // End of day
            if (invoiceDate > toDate) {
                return false;
            }
        }

        return true;
    });
}

export async function loadInvoices() {
    try {
        showLoading();
        const invoices = await invoicesAPI.getAll();
        renderInvoices(invoices);
    } catch (error) {
        handleError(error, 'loading invoices');
    } finally {
        hideLoading();
    }
}

function renderInvoices(invoices) {
    const container = document.getElementById('invoices-table');
    if (!container) return;

    if (invoices.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-invoice"></i>
                <h3>No invoices found</h3>
                <p>Invoices will appear here when transactions are created.</p>
            </div>
        `;
        return;
    }

    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Invoice #</th>
                    <th>Type</th>
                    <th>Part</th>
                    <th>Quantity</th>
                    <th>Amount</th>
                    <th>Recipient</th>
                    <th>Payment</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${invoices.map(invoice => `
                    <tr>
                        <td>
                            <span class="invoice-number">${invoice.invoiceNumber}</span>
                        </td>
                        <td>
                            <span class="badge ${invoice.type === 'CUSTOMER_COPY' ? 'badge-primary' : 'badge-secondary'}">
                                ${invoice.type === 'CUSTOMER_COPY' ? 'Customer' : 'Company'}
                            </span>
                        </td>
                        <td>
                            <div class="part-info">
                                <strong>${invoice.partName}</strong>
                                <small>${invoice.partNumber}</small>
                            </div>
                        </td>
                        <td>${invoice.quantity}</td>
                        <td>${formatCurrency(invoice.totalAmount)}</td>
                        <td>${invoice.recipientName || '-'}</td>
                        <td>
                            <span class="payment-status ${getPaymentStatusClass(invoice)}">
                                ${getPaymentStatusText(invoice)}
                            </span>
                        </td>
                        <td>${formatDate(invoice.createdAt)}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-primary" onclick="printInvoice(${invoice.id})" title="Print">
                                    <i class="fas fa-print"></i>
                                </button>
                                <button class="btn btn-sm btn-secondary" onclick="viewInvoice(${invoice.id})" title="View">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}

function getPaymentStatusClass(invoice) {
    if (invoice.isPaid) return 'paid';
    if (invoice.amountPaid > 0) return 'partial';
    return 'unpaid';
}

function getPaymentStatusText(invoice) {
    if (invoice.isPaid) return 'Paid';
    if (invoice.amountPaid > 0) return `Partial (${formatCurrency(invoice.amountPaid)})`;
    return 'Unpaid';
}

// Global functions for button actions
window.printInvoice = async function(invoiceId) {
    try {
        await window.printInvoiceHTML(invoiceId);
    } catch (error) {
        handleError(error, 'printing invoice');
    }
};

window.viewInvoice = async function(invoiceId) {
    try {
        await window.viewInvoiceHTML(invoiceId);
    } catch (error) {
        handleError(error, 'viewing invoice');
    }
};

function generateInvoicePrint(invoice) {
    const printWindow = window.open('', '_blank');
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice ${invoice.invoiceNumber}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .invoice-header { text-align: center; margin-bottom: 30px; }
                .company-info { margin-bottom: 20px; }
                .invoice-details { margin-bottom: 20px; }
                .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .invoice-table th, .invoice-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .invoice-table th { background-color: #f2f2f2; }
                .total-row { font-weight: bold; }
                .copy-type { color: #666; font-style: italic; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="invoice-header">
                <h1>INVOICE</h1>
                <p class="copy-type">${invoice.type === 'CUSTOMER_COPY' ? 'CUSTOMER COPY' : 'COMPANY COPY'}</p>
            </div>
            
            <div class="company-info">
                <h3>${invoice.companyName}</h3>
                <p>${invoice.companyAddress}</p>
                <p>Phone: ${invoice.companyPhone}</p>
                <p>Email: ${invoice.companyEmail}</p>
            </div>
            
            <div class="invoice-details">
                <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
                <p><strong>Date:</strong> ${formatDate(invoice.createdAt)}</p>
                <p><strong>Recipient:</strong> ${invoice.recipientName || 'N/A'}</p>
                ${invoice.reason ? `<p><strong>Reason:</strong> ${invoice.reason}</p>` : ''}
            </div>
            
            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>Part Name</th>
                        <th>Part Number</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${invoice.partName}</td>
                        <td>${invoice.partNumber}</td>
                        <td>${invoice.quantity}</td>
                        <td>${formatCurrency(invoice.unitPrice)}</td>
                        <td>${formatCurrency(invoice.totalAmount)}</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="4">Total Amount:</td>
                        <td>${formatCurrency(invoice.totalAmount)}</td>
                    </tr>
                    <tr>
                        <td colspan="4">Amount Paid:</td>
                        <td>${formatCurrency(invoice.amountPaid)}</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="4">Balance Due:</td>
                        <td>${formatCurrency(invoice.totalAmount - invoice.amountPaid)}</td>
                    </tr>
                </tbody>
            </table>
            
            ${invoice.notes ? `<div><strong>Notes:</strong> ${invoice.notes}</div>` : ''}
            
            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() {
                        window.close();
                    };
                };
            </script>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
}

function showInvoiceModal(invoice) {
    // Create a simple modal to show invoice details
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Invoice Details - ${invoice.invoiceNumber}</h3>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <div class="invoice-details-grid">
                    <div><strong>Type:</strong> ${invoice.type === 'CUSTOMER_COPY' ? 'Customer Copy' : 'Company Copy'}</div>
                    <div><strong>Part:</strong> ${invoice.partName} (${invoice.partNumber})</div>
                    <div><strong>Quantity:</strong> ${invoice.quantity}</div>
                    <div><strong>Unit Price:</strong> ${formatCurrency(invoice.unitPrice)}</div>
                    <div><strong>Total Amount:</strong> ${formatCurrency(invoice.totalAmount)}</div>
                    <div><strong>Recipient:</strong> ${invoice.recipientName || 'N/A'}</div>
                    <div><strong>Payment Status:</strong> ${getPaymentStatusText(invoice)}</div>
                    <div><strong>Date:</strong> ${formatDate(invoice.createdAt)}</div>
                    ${invoice.reason ? `<div><strong>Reason:</strong> ${invoice.reason}</div>` : ''}
                    ${invoice.notes ? `<div><strong>Notes:</strong> ${invoice.notes}</div>` : ''}
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn btn-primary" onclick="printInvoice(${invoice.id})">
                    <i class="fas fa-print"></i> Print
                </button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal functionality
    modal.querySelector('.close').onclick = () => modal.remove();
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

async function handlePrintInvoice() {
    const selectedInvoices = getSelectedInvoices();
    if (selectedInvoices.length === 0) {
        showToast('Please select at least one invoice to print', 'warning');
        return;
    }
    
    for (const invoiceId of selectedInvoices) {
        await printInvoice(invoiceId);
    }
}

function getSelectedInvoices() {
    const checkboxes = document.querySelectorAll('.invoice-checkbox:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

// Initialize invoice filters when the module loads
export function initInvoices() {
    initInvoiceFilters();

    const invoicesSection = document.getElementById('invoices-section');
    if (!invoicesSection) return;

    // Function to load invoices if the section is active
    const loadIfActive = () => {
        if (invoicesSection.classList.contains('active')) {
            loadInvoices();
        }
    };

    // Initial load check
    loadIfActive();

    // Use MutationObserver to detect when the section becomes active
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                loadIfActive();
            }
        }
    });

    observer.observe(invoicesSection, { attributes: true });
}
