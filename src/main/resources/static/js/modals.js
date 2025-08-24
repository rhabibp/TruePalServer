// Modals Management Module - Fixed Version
import {
elements,
appState,
showToast,
resetForm,
setFormData,
validateRequired,
validateNumber
} from './ui-utils.js';
import { savePart } from './parts.js';
import { saveCategory } from './categories.js';
// REMOVED: import { saveTransaction } from './transactions.js'; - this function doesn't exist
import { partsAPI } from './api.js';

// Initialize modal system
export function initModals() {
    // Close modal when clicking outside or on close button
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal(modal);
            }
        });

        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                closeModal(modal);
            });
        }
    });

    // Cancel buttons
    const cancelPart = document.getElementById('cancel-part');
    if (cancelPart) {
        cancelPart.addEventListener('click', function() {
            closeModal(elements.partModal);
        });
    }

    const cancelCategory = document.getElementById('cancel-category');
    if (cancelCategory) {
        cancelCategory.addEventListener('click', function() {
            closeModal(elements.categoryModal);
        });
    }

    const cancelTransaction = document.getElementById('cancel-transaction');
    if (cancelTransaction) {
        cancelTransaction.addEventListener('click', function() {
            closeModal(elements.transactionModal);
        });
    }

    // Form submissions
    initFormHandlers();
}

// Initialize form handlers
function initFormHandlers() {
    // Part form
    if (elements.partForm) {
        elements.partForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handlePartFormSubmit();
        });
    }

    // Category form
    if (elements.categoryForm) {
        elements.categoryForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleCategoryFormSubmit();
        });
    }

    // Transaction form - Let transactions.js handle this
    // The transaction modal is now handled by the transactions.js module
}

// Close modal
function closeModal(modal) {
    if (!modal) return;

    modal.classList.remove('show');

    // Reset forms
    const form = modal.querySelector('form');
    if (form) {
        resetForm(form);
    }

    // Clear current item state
    appState.currentPart = null;
    appState.currentCategory = null;
    // Don't clear selectedParts here - let transactions.js handle it
}

// Show add part modal
export async function showAddPartModal() {
    try {
        // Load categories for dropdown
        if (appState.categories.length === 0) {
            const categoriesModule = await import('./api.js');
            appState.categories = await categoriesModule.categoriesAPI.getAll();
        }

        populatePartCategorySelect();

        const modalTitle = document.getElementById('part-modal-title');
        if (modalTitle) {
            modalTitle.textContent = 'Add New Part';
        }

        appState.currentPart = null;

        if (elements.partModal) {
            elements.partModal.classList.add('show');
        }

        // Focus on first input
        setTimeout(function() {
            const partNameInput = document.getElementById('part-name');
            if (partNameInput) {
                partNameInput.focus();
            }
        }, 100);

    } catch (error) {
        showToast('Error', 'Failed to load part modal', 'error');
    }
}

// Show edit part modal
export async function showEditPartModal(part) {
    try {
        // Load categories for dropdown
        if (appState.categories.length === 0) {
            const categoriesModule = await import('./api.js');
            appState.categories = await categoriesModule.categoriesAPI.getAll();
        }

        populatePartCategorySelect();

        // Fill form with part data
        setFormData(elements.partForm, {
            'part-name': part.name,
            'part-description': part.description || '',
            'part-number': part.partNumber,
            'part-category': part.categoryId,
            'part-price': part.unitPrice,
            'part-stock': part.currentStock,
            'part-min-stock': part.minimumStock,
            'part-max-stock': part.maxStock || '',
            'part-location': part.location || '',
            'part-supplier': part.supplier || '',
            'part-machine-models': part.machineModels ? part.machineModels.join(', ') : ''
        });

        const modalTitle = document.getElementById('part-modal-title');
        if (modalTitle) {
            modalTitle.textContent = 'Edit Part';
        }

        appState.currentPart = part;

        if (elements.partModal) {
            elements.partModal.classList.add('show');
        }

    } catch (error) {
        showToast('Error', 'Failed to load part for editing', 'error');
    }
}

// Populate part category select
function populatePartCategorySelect() {
    if (!appState.categories) return;

    // If we're editing a part, pre-select the category
    if (appState.currentPart && appState.currentPart.categoryId) {
        const category = appState.categories.find(function(cat) {
            return cat.id === appState.currentPart.categoryId;
        });

        if (category) {
            const searchInput = document.getElementById('part-category-search');
            const hiddenInput = document.getElementById('part-category');
            if (searchInput && hiddenInput) {
                searchInput.value = category.name;
                hiddenInput.value = category.id;
            }
        }
    }
}

// Handle part form submission
async function handlePartFormSubmit() {
    try {
        // Validate required fields
        const nameElement = document.getElementById('part-name');
        const partNumberElement = document.getElementById('part-number');
        const categoryElement = document.getElementById('part-category');
        const priceElement = document.getElementById('part-price');
        const minStockElement = document.getElementById('part-min-stock');

        const name = nameElement ? nameElement.value : '';
        const partNumber = partNumberElement ? partNumberElement.value : '';
        const categoryId = categoryElement ? categoryElement.value : '';
        const unitPrice = priceElement ? priceElement.value : '';
        const minimumStock = minStockElement ? minStockElement.value : '';

        validateRequired(name, 'Part name');
        validateRequired(partNumber, 'Part number');
        validateRequired(categoryId, 'Category');
        validateNumber(unitPrice, 'Unit price', 0);
        validateNumber(minimumStock, 'Minimum stock', 0);

        // Prepare part data
        const partData = {
            name: name.trim(),
            description: getElementValue('part-description') || null,
            partNumber: partNumber.trim(),
            categoryId: parseInt(categoryId),
            unitPrice: parseFloat(unitPrice),
            initialStock: parseInt(getElementValue('part-stock')) || 0,
            minimumStock: parseInt(minimumStock),
            maxStock: parseInt(getElementValue('part-max-stock')) || null,
            location: getElementValue('part-location') || null,
            supplier: getElementValue('part-supplier') || null,
            machineModels: getElementValue('part-machine-models') ?
            getElementValue('part-machine-models').split(',').map(function(s) {
                return s.trim();
            }).filter(function(s) {
                return s;
            }) : null
        };

        const isEdit = !!appState.currentPart;
        const success = await savePart(partData, isEdit);

        if (success) {
            closeModal(elements.partModal);
        }

    } catch (error) {
        showToast('Validation Error', error.message, 'error');
    }
}

// Helper function to get element value safely
function getElementValue(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.value.trim() : '';
}

// Show add category modal
export async function showAddCategoryModal() {
    const modalTitle = document.getElementById('category-modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Add New Category';
    }

    appState.currentCategory = null;

    if (elements.categoryModal) {
        elements.categoryModal.classList.add('show');
    }

    // Focus on first input
    setTimeout(function() {
        const categoryNameInput = document.getElementById('category-name');
        if (categoryNameInput) {
            categoryNameInput.focus();
        }
    }, 100);
}

// Show edit category modal
export async function showEditCategoryModal(category) {
    // Fill form with category data
    setFormData(elements.categoryForm, {
        'category-name': category.name,
        'category-description': category.description || ''
    });

    const modalTitle = document.getElementById('category-modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Edit Category';
    }

    appState.currentCategory = category;

    if (elements.categoryModal) {
        elements.categoryModal.classList.add('show');
    }
}

// Handle category form submission
async function handleCategoryFormSubmit() {
    try {
        // Validate required fields
        const nameElement = document.getElementById('category-name');
        const name = nameElement ? nameElement.value : '';

        validateRequired(name, 'Category name');

        // Prepare category data
        const categoryData = {
            name: name.trim(),
            description: getElementValue('category-description') || null
        };

        const isEdit = !!appState.currentCategory;
        const success = await saveCategory(categoryData, isEdit);

        if (success) {
            closeModal(elements.categoryModal);
        }

    } catch (error) {
        showToast('Validation Error', error.message, 'error');
    }
}

// Show add transaction modal - Use the one from transactions.js
export async function showAddTransactionModal() {
    // Import and use the openTransactionModal from transactions.js
    try {
        const transactionsModule = await import('./transactions.js');
        transactionsModule.openTransactionModal();
    } catch (error) {
        showToast('Error', 'Failed to load transaction modal', 'error');
    }
}

// Enhanced form interactions
export function initFormEnhancements() {
    // Auto-calculate transaction total
    const transactionQuantity = document.getElementById('transaction-quantity');
    const transactionPrice = document.getElementById('transaction-price');
    const transactionAmountPaid = document.getElementById('transaction-amount-paid');

    if (transactionQuantity && transactionPrice && transactionAmountPaid) {
        const calculateTotal = function() {
            const quantity = parseFloat(transactionQuantity.value) || 0;
            const price = parseFloat(transactionPrice.value) || 0;
            const total = quantity * price;

            if (total > 0 && transactionAmountPaid.value === '0') {
                transactionAmountPaid.value = total.toFixed(2);
            }
        };

        transactionQuantity.addEventListener('input', calculateTotal);
        transactionPrice.addEventListener('input', calculateTotal);
    }

    // Auto-populate unit price from part selection
    const transactionPart = document.getElementById('transaction-part');
    if (transactionPart && transactionPrice) {
        transactionPart.addEventListener('change', function() {
            const partId = parseInt(transactionPart.value);
            const part = appState.parts.find(function(p) {
                return p.id === partId;
            });
            if (part && !transactionPrice.value) {
                transactionPrice.value = part.unitPrice.toFixed(2);
            }
        });
    }

    // Show/hide recipient field based on transaction type
    const transactionType = document.getElementById('transaction-type');
    const recipientInput = document.getElementById('transaction-recipient');

    if (transactionType && recipientInput) {
        // Find the parent form group by traversing up from the input
        const recipientGroup = recipientInput.closest('.form-group');

        const toggleRecipientField = function() {
            const isOutTransaction = transactionType.value === 'OUT';
            if (recipientGroup) {
                recipientGroup.style.display = isOutTransaction ? 'flex' : 'none';
            }
            recipientInput.required = isOutTransaction;
        };

        transactionType.addEventListener('change', toggleRecipientField);
        toggleRecipientField(); // Initial call
    }

    // Initialize searchable category select
    initSearchableCategorySelect();
}

// Initialize searchable category select functionality
function initSearchableCategorySelect() {
    const container = document.getElementById('part-category-container');
    const searchInput = document.getElementById('part-category-search');
    const hiddenInput = document.getElementById('part-category');
    const toggleButton = document.getElementById('part-category-toggle');
    const dropdown = document.getElementById('part-category-dropdown');
    const createNewButton = document.getElementById('create-new-category');
    const dropdownItems = document.getElementById('category-dropdown-items');

    if (!container || !searchInput || !hiddenInput || !toggleButton || !dropdown) {
        return; // Elements not found, skip initialization
    }

    let isOpen = false;
    let selectedCategoryId = null;

    // Populate dropdown with categories
    function populateDropdown(searchTerm) {
        if (searchTerm === undefined) searchTerm = '';
        if (!appState.categories) return;

        const filteredCategories = appState.categories.filter(function(category) {
            return category.name.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1;
        });

        dropdownItems.innerHTML = '';

        if (filteredCategories.length === 0) {
            dropdownItems.innerHTML = '<div class="dropdown-item no-results">No categories found</div>';
        } else {
            filteredCategories.forEach(function(category) {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.textContent = category.name;
                item.dataset.categoryId = category.id;
                item.dataset.categoryName = category.name;

                if (selectedCategoryId === category.id) {
                    item.classList.add('selected');
                }

                item.addEventListener('click', function() {
                    selectCategory(category.id, category.name);
                });
                dropdownItems.appendChild(item);
            });
        }
    }

    // Select a category
    function selectCategory(categoryId, categoryName) {
        selectedCategoryId = categoryId;
        searchInput.value = categoryName;
        hiddenInput.value = categoryId;
        closeDropdown();

        // Update selected state
        const items = dropdownItems.querySelectorAll('.dropdown-item');
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const isSelected = item.dataset.categoryId === categoryId.toString();
            if (isSelected) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        }
    }

    // Open dropdown
    function openDropdown() {
        isOpen = true;
        container.classList.add('open');
        populateDropdown(searchInput.value);
    }

    // Close dropdown
    function closeDropdown() {
        isOpen = false;
        container.classList.remove('open');
    }

    // Toggle dropdown
    function toggleDropdown() {
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    }

    // Event listeners
    toggleButton.addEventListener('click', function(e) {
        e.preventDefault();
        toggleDropdown();
    });

    searchInput.addEventListener('focus', function() {
        openDropdown();
    });

    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value;
        populateDropdown(searchTerm);

        // Clear selection if input doesn't match any category
        const matchingCategory = appState.categories ? appState.categories.find(function(cat) {
            return cat.name.toLowerCase() === searchTerm.toLowerCase();
        }) : null;

        if (!matchingCategory) {
            selectedCategoryId = null;
            hiddenInput.value = '';
        }
    });

    // Create new category functionality
    if (createNewButton) {
        createNewButton.addEventListener('click', async function() {
            const categoryName = searchInput.value.trim();
            if (!categoryName) {
                showToast('Error', 'Please enter a category name', 'error');
                return;
            }

            // Check if category already exists
            const existingCategory = appState.categories ? appState.categories.find(function(cat) {
                return cat.name.toLowerCase() === categoryName.toLowerCase();
            }) : null;

            if (existingCategory) {
                selectCategory(existingCategory.id, existingCategory.name);
                showToast('Info', 'Category already exists and has been selected', 'info');
                return;
            }

            try {
                // Create new category
                const categoriesModule = await import('./api.js');
                const newCategory = await categoriesModule.categoriesAPI.create({
                    name: categoryName,
                    description: 'Auto-created category: ' + categoryName
                });

                // Add to categories list
                if (!appState.categories) appState.categories = [];
                appState.categories.push(newCategory);

                // Select the new category
                selectCategory(newCategory.id, newCategory.name);
                showToast('Success', 'Category "' + categoryName + '" created successfully', 'success');

            } catch (error) {
                showToast('Error', 'Failed to create category', 'error');
                console.error('Error creating category:', error);
            }
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!container.contains(e.target)) {
            closeDropdown();
        }
    });

    // Handle keyboard navigation
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeDropdown();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) {
                openDropdown();
            } else {
                // Focus first dropdown item
                const firstItem = dropdownItems.querySelector('.dropdown-item:not(.no-results)');
                if (firstItem) {
                    firstItem.focus();
                }
            }
        }
    });

    // Initial population
    populateDropdown();
}

// Make functions available globally for onclick handlers
window.showAddPartModal = showAddPartModal;
window.showAddCategoryModal = showAddCategoryModal;
window.showAddTransactionModal = showAddTransactionModal;