// UI Utility Functions and DOM Management

// Global state management
export const appState = {
    currentSection: 'dashboard',
    currentPart: null,
    categories: [],
    parts: [],
    transactions: [],
    invoices: [],
    currentPage: 1,
    totalPages: 1,
    transactionFilters: {
        search: '',
        type: '',
        paymentStatus: '',
        dateFrom: '',
        dateTo: ''
    },
    invoiceFilters: {
        search: '',
        type: '',
        paymentStatus: '',
        dateFrom: '',
        dateTo: ''
    }
};

// DOM Elements cache
export const elements = {
    // Navigation
    navLinks: document.querySelectorAll('.nav-link'),
    pageTitle: document.getElementById('page-title'),

    // Sections
    sections: document.querySelectorAll('.content-section'),

    // Dashboard
    totalParts: document.getElementById('total-parts'),
    totalCategories: document.getElementById('total-categories'),
    totalValue: document.getElementById('total-value'),
    lowStockCount: document.getElementById('low-stock-count'),
    fastMovingParts: document.getElementById('fast-moving-parts'),
    recentTransactions: document.getElementById('recent-transactions'),

    // Parts
    partsGrid: document.getElementById('parts-grid'),
    partsSearch: document.getElementById('parts-search'),
    categoryFilter: document.getElementById('category-filter'),
    lowStockFilter: document.getElementById('low-stock-filter'),
    partsPagination: document.getElementById('parts-pagination'),

    // Categories
    categoriesGrid: document.getElementById('categories-grid'),

    // Transactions
    transactionsTable: document.getElementById('transactions-table'),
    transactionSearch: document.getElementById('transaction-search'),
    transactionTypeFilter: document.getElementById('transaction-type-filter'),
    transactionPaymentFilter: document.getElementById('transaction-payment-filter'),
    transactionDateFrom: document.getElementById('transaction-date-from'),
    transactionDateTo: document.getElementById('transaction-date-to'),

    // Invoices
    invoicesTable: document.getElementById('invoices-table'),
    invoiceSearch: document.getElementById('invoice-search'),
    invoiceTypeFilter: document.getElementById('invoice-type-filter'),
    invoicePaymentFilter: document.getElementById('invoice-payment-filter'),
    invoiceDateFrom: document.getElementById('invoice-date-from'),
    invoiceDateTo: document.getElementById('invoice-date-to'),

    // Low Stock
    lowStockGrid: document.getElementById('low-stock-grid'),

    // Reports
    categoryStats: document.getElementById('category-stats'),
    inventoryAnalysis: document.getElementById('inventory-analysis'),

    // Modals
    partModal: document.getElementById('part-modal'),
    categoryModal: document.getElementById('category-modal'),
    transactionModal: document.getElementById('transaction-modal'),
    partDetailsModal: document.getElementById('part-details-modal'),

    // Forms
    partForm: document.getElementById('part-form'),
    categoryForm: document.getElementById('category-form'),
    transactionForm: document.getElementById('transaction-form'),

    // Buttons
    addPartBtn: document.getElementById('add-part-btn'),
    addCategoryBtn: document.getElementById('add-category-btn'),
    addTransactionBtn: document.getElementById('add-transaction-btn'),
    refreshBtn: document.getElementById('refresh-btn'),
    clearTransactionFiltersBtn: document.getElementById('clear-transaction-filters'),
    clearInvoiceFiltersBtn: document.getElementById('clear-invoice-filters'),
    printInvoiceBtn: document.getElementById('print-invoice-btn'),

    // Loading and Toast
    loading: document.getElementById('loading'),
    toastContainer: document.getElementById('toast-container')
};

// Loading state management
export function showLoading() {
    elements.loading?.classList.add('show');
}

export function hideLoading() {
    elements.loading?.classList.remove('show');
}

// Toast notification system
export function showToast(title, message, type = 'success') {
    if (!elements.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    elements.toastContainer.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// Formatting utilities
export function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

export function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function formatDateInput(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
}

// DOM manipulation utilities
export function clearElement(element) {
    if (element) {
        element.innerHTML = '';
    }
}

export function showElement(element) {
    if (element) {
        element.style.display = 'block';
    }
}

export function hideElement(element) {
    if (element) {
        element.style.display = 'none';
    }
}

export function toggleElement(element, show) {
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

// Form utilities
export function getFormData(form) {
    const formData = new FormData(form);
    const data = {};
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    return data;
}

export function resetForm(form) {
    if (form) {
        form.reset();
    }
}

export function setFormData(form, data) {
    if (!form || !data) return;

    Object.keys(data).forEach(key => {
        const element = form.querySelector(`[name="${key}"], #${key}`);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = data[key];
            } else {
                element.value = data[key] || '';
            }
        }
    });
}

// Validation utilities
export function validateRequired(value, fieldName) {
    if (!value || value.trim() === '') {
        throw new Error(`${fieldName} is required`);
    }
    return true;
}

export function validateNumber(value, fieldName, min = null, max = null) {
    const num = parseFloat(value);
    if (isNaN(num)) {
        throw new Error(`${fieldName} must be a valid number`);
    }
    if (min !== null && num < min) {
        throw new Error(`${fieldName} must be at least ${min}`);
    }
    if (max !== null && num > max) {
        throw new Error(`${fieldName} must be at most ${max}`);
    }
    return num;
}

export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Debounce utility for search inputs
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Pagination utilities
export function renderPagination(container, currentPage, totalPages, onPageChange) {
    if (!container) return;

    let paginationHTML = '';

    // Previous button
    paginationHTML += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="(${onPageChange})(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i> Previous
    </button>`;

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="(${onPageChange})(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="(${onPageChange})(${i})">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHTML += `<button class="pagination-btn" onclick="(${onPageChange})(${totalPages})">${totalPages}</button>`;
    }

    // Next button
    paginationHTML += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="(${onPageChange})(${currentPage + 1})">
        Next <i class="fas fa-chevron-right"></i>
    </button>`;

    container.innerHTML = paginationHTML;
}

// Confirmation dialog
export function confirmAction(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
        const result = confirm(`${title}\n\n${message}`);
        resolve(result);
    });
}

// Error handling utilities
export function handleError(error, context = '') {
    console.error(`Error in ${context}:`, error);
    showToast('Error', error.message || 'An unexpected error occurred', 'error');
}

// Local storage utilities
export function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.warn('Failed to save to localStorage:', error);
    }
}

export function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.warn('Failed to load from localStorage:', error);
        return defaultValue;
    }
}

// Keyboard navigation utilities
export function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // ESC key closes modals
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) {
                openModal.classList.remove('show');
            }
        }

        // Ctrl+F focuses search input
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.querySelector('.search-input:not([style*="display: none"])');
            if (searchInput) {
                searchInput.focus();
            }
        }
    });
}

// Initialize UI utilities
export function initUIUtils() {
    setupKeyboardNavigation();

    // Load saved filters from localStorage
    const savedTransactionFilters = loadFromStorage('transactionFilters');
    if (savedTransactionFilters) {
        Object.assign(appState.transactionFilters, savedTransactionFilters);
    }

    const savedInvoiceFilters = loadFromStorage('invoiceFilters');
    if (savedInvoiceFilters) {
        Object.assign(appState.invoiceFilters, savedInvoiceFilters);
    }
}
