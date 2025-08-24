// Main Application Entry Point - Updated Version
import { initUIUtils, showToast, showLoading, hideLoading, elements } from './js/ui-utils.js';
import { initNavigation, refreshCurrentSection } from './js/navigation.js';
import { initModals, initFormEnhancements, showAddPartModal, showAddCategoryModal } from './js/modals.js';
import { initPartsFilters } from './js/parts.js';
import { initTransactionFilters, initTransactionModal, openTransactionModal } from './js/transactions.js';
import { initInvoiceFilters } from './js/invoices.js';
import { loadDashboard } from './js/dashboard.js';

// Application initialization
async function initApp() {
    try {
        showLoading('Initializing TruePal Inventory System...');

        // Initialize UI utilities first
        initUIUtils();

        // Initialize navigation system
        initNavigation();

        // Initialize modal system
        initModals();

        // Initialize form enhancements
        initFormEnhancements();

        // Initialize search and filter systems
        initPartsFilters();
        initTransactionFilters();

        // Initialize transaction modal system
        initTransactionModal();

        // Initialize button event handlers
        initButtons();

        // Load initial dashboard data
        await loadDashboard();

        showToast('Welcome', 'TruePal Inventory Management System loaded successfully');

    } catch (error) {
        console.error('Application initialization failed:', error);
        showToast('Error', `Failed to initialize application: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// Initialize button event handlers
function initButtons() {
    // Add buttons
    elements.addPartBtn?.addEventListener('click', showAddPartModal);
    elements.addCategoryBtn?.addEventListener('click', showAddCategoryModal);
    elements.addTransactionBtn?.addEventListener('click', openTransactionModal);

    // Handle add transaction button with multiple possible IDs
    const addTransactionButtons = [
        document.getElementById('add-transaction-btn'),
        document.getElementById('addTransactionBtn'),
        ...document.querySelectorAll('[data-action="add-transaction"]'),
        ...document.querySelectorAll('.add-transaction-btn')
    ];

    addTransactionButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                openTransactionModal();
            });
        }
    });

    // Global click handler for transaction buttons
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-action="add-transaction"]') ||
        e.target.closest('[data-action="add-transaction"]') ||
        e.target.matches('.add-transaction-btn') ||
        e.target.closest('.add-transaction-btn')) {
            e.preventDefault();
            openTransactionModal();
        }
    });

    // Refresh button
    elements.refreshBtn?.addEventListener('click', refreshCurrentSection);
}

// Handle potential errors during app lifecycle
function initErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        showToast('Error', 'An unexpected error occurred', 'error');
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        showToast('Error', 'An unexpected error occurred', 'error');
        event.preventDefault();
    });
}

// Initialize service worker for caching (if available)
async function initServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('ServiceWorker registration successful:', registration);
        } catch (error) {
            console.log('ServiceWorker registration failed:', error);
        }
    }
}

// Check for app updates
function checkForUpdates() {
    // Check if there's a newer version available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data && event.data.type === 'CACHE_UPDATED') {
                showToast('Update Available', 'A new version is available. Refresh to update.', 'info');
            }
        });
    }
}

// App performance monitoring
function initPerformanceMonitoring() {
    // Monitor page load performance
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (performance && performance.timing) {
                const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
                console.log(`App loaded in ${loadTime}ms`);

                if (loadTime > 5000) {
                    console.warn('Slow app load detected');
                }
            }
        }, 0);
    });
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize error handling first
    initErrorHandling();

    // Initialize performance monitoring
    initPerformanceMonitoring();

    // Initialize the main app
    await initApp();

    // Initialize service worker
    await initServiceWorker();

    // Check for updates
    checkForUpdates();
});

// Export for potential external use
export { initApp };

// Make transaction modal globally available
window.openTransactionModal = openTransactionModal;