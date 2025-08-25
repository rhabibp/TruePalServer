// Navigation Module
import { elements, appState, showLoading, hideLoading, handleError } from './ui-utils.js';
import { loadDashboard } from './dashboard.js';
import { loadParts } from './parts.js';
import { loadCategories } from './categories.js';
import { loadTransactions } from './transactions.js';

// Section titles mapping
const sectionTitles = {
    dashboard: 'Dashboard',
    parts: 'Parts Management',
    categories: 'Categories',
    transactions: 'Transactions',
    'low-stock': 'Low Stock Alert',
    reports: 'Reports & Analytics'
};

// Initialize navigation
export function initNavigation() {
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            switchSection(section);
            // Close mobile menu after navigation on mobile
            closeMobileMenu();
        });
    });

    // Initialize mobile menu toggle
    initMobileMenu();
}

// Initialize mobile menu functionality
function initMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (mobileMenuToggle && sidebar) {
        mobileMenuToggle.addEventListener('click', () => {
            toggleMobileMenu();
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                sidebar.classList.contains('open') && 
                !sidebar.contains(e.target) && 
                !mobileMenuToggle.contains(e.target)) {
                closeMobileMenu();
            }
        });

        // Close mobile menu on window resize if screen becomes larger
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                closeMobileMenu();
            }
        });
    }
}

// Toggle mobile menu
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');

        // Update toggle button icon
        const toggleIcon = document.querySelector('#mobile-menu-toggle i');
        if (toggleIcon) {
            if (sidebar.classList.contains('open')) {
                toggleIcon.className = 'fas fa-times';
            } else {
                toggleIcon.className = 'fas fa-bars';
            }
        }
    }
}

// Close mobile menu
function closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');

        // Reset toggle button icon
        const toggleIcon = document.querySelector('#mobile-menu-toggle i');
        if (toggleIcon) {
            toggleIcon.className = 'fas fa-bars';
        }
    }
}

// Switch between sections
export async function switchSection(section) {
    // Update navigation active state
    elements.navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.section === section);
    });

    // Update sections visibility
    elements.sections.forEach(sec => {
        sec.classList.toggle('active', sec.id === `${section}-section`);
    });

    // Update page title
    if (elements.pageTitle) {
        elements.pageTitle.textContent = sectionTitles[section] || 'Dashboard';
    }

    // Update current section state
    appState.currentSection = section;

    // Load section data
    await loadSectionData(section);
}

// Load data for specific section
async function loadSectionData(section) {
    showLoading();

    try {
        switch (section) {
            case 'dashboard':
                await loadDashboard();
                break;
            case 'parts':
                await loadParts();
                break;
            case 'categories':
                await loadCategories();
                break;
            case 'transactions':
                await loadTransactions();
                break;
            case 'low-stock':
                await loadLowStock();
                break;
            case 'reports':
                await loadReports();
                break;
        }
    } catch (error) {
        handleError(error, `loading ${section}`);
    } finally {
        hideLoading();
    }
}

// Load low stock parts (reuse parts module functionality)
async function loadLowStock() {
    const { loadLowStockParts } = await import('./parts.js');
    await loadLowStockParts();
}

// Load reports (reuse dashboard module functionality)
async function loadReports() {
    const { loadReports } = await import('./dashboard.js');
    await loadReports();
}

// Get current section
export function getCurrentSection() {
    return appState.currentSection;
}

// Refresh current section
export async function refreshCurrentSection() {
    await loadSectionData(appState.currentSection);
}
