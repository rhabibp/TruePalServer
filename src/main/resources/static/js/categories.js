// Categories Management Module
import { categoriesAPI, statsAPI } from './api.js';
import { 
    elements, 
    appState, 
    showLoading, 
    hideLoading, 
    showToast, 
    formatCurrency,
    formatDate,
    handleError,
    confirmAction
} from './ui-utils.js';

// Load categories section
export async function loadCategories() {
    try {
        showLoading();
        
        const [categories, categoryStats] = await Promise.all([
            categoriesAPI.getAll(),
            statsAPI.getCategoryStats()
        ]);
        
        appState.categories = categories;
        renderCategories(categories, categoryStats);
        
    } catch (error) {
        handleError(error, 'loading categories');
    } finally {
        hideLoading();
    }
}

// Render categories grid
function renderCategories(categories, categoryStats = []) {
    if (!elements.categoriesGrid) return;

    if (!categories || categories.length === 0) {
        elements.categoriesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tags"></i>
                <h3>No categories found</h3>
                <p>Create your first category to organize your parts inventory.</p>
                <button class="btn btn-primary" onclick="showAddCategoryModal()">
                    <i class="fas fa-plus"></i> Add First Category
                </button>
            </div>
        `;
        return;
    }

    // Create a map of category stats for quick lookup
    const statsMap = new Map();
    categoryStats.forEach(stat => {
        statsMap.set(stat.categoryId, stat);
    });

    elements.categoriesGrid.innerHTML = categories.map(category => {
        const stats = statsMap.get(category.id) || {
            partCount: 0,
            totalValue: 0,
            lowStockCount: 0
        };

        return `
            <div class="category-card" onclick="viewCategoryDetails(${category.id})">
                <div class="category-header">
                    <div class="category-info">
                        <div class="category-title">${category.name}</div>
                        <div class="category-description">${category.description || 'No description provided'}</div>
                        <div class="category-meta">
                            <span class="category-date">Created: ${formatDate(category.createdAt)}</span>
                        </div>
                    </div>
                    <div class="category-actions" onclick="event.stopPropagation()">
                        <button class="btn-icon btn-primary" onclick="editCategory(${category.id})" title="Edit Category">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-danger" onclick="deleteCategory(${category.id})" title="Delete Category">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="category-stats-grid">
                    <div class="category-stat">
                        <div class="stat-icon">
                            <i class="fas fa-cogs"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${stats.partCount}</div>
                            <div class="stat-label">Parts</div>
                        </div>
                    </div>
                    
                    <div class="category-stat">
                        <div class="stat-icon">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${formatCurrency(stats.totalValue)}</div>
                            <div class="stat-label">Total Value</div>
                        </div>
                    </div>
                    
                    <div class="category-stat ${stats.lowStockCount > 0 ? 'warning' : ''}">
                        <div class="stat-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${stats.lowStockCount}</div>
                            <div class="stat-label">Low Stock</div>
                        </div>
                    </div>
                </div>
                
                ${stats.partCount > 0 ? `
                    <div class="category-progress">
                        <div class="progress-info">
                            <span>Stock Health</span>
                            <span>${Math.round(((stats.partCount - stats.lowStockCount) / stats.partCount) * 100)}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${((stats.partCount - stats.lowStockCount) / stats.partCount) * 100}%"></div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// View category details
export async function viewCategoryDetails(categoryId) {
    try {
        showLoading();
        
        const category = await categoriesAPI.getById(categoryId);
        const categoryStats = await statsAPI.getCategoryStats();
        const stats = categoryStats.find(s => s.categoryId === categoryId) || {
            partCount: 0,
            totalValue: 0,
            lowStockCount: 0
        };
        
        // Create category details modal
        const modalHTML = `
            <div class="category-details-modal modal show">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3><i class="fas fa-tag"></i> ${category.name}</h3>
                        <span class="close" onclick="this.closest('.category-details-modal').remove()">&times;</span>
                    </div>
                    <div class="category-details-content">
                        <div class="category-overview">
                            <div class="overview-section">
                                <h4>Category Information</h4>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <label>Name:</label>
                                        <span>${category.name}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Description:</label>
                                        <span>${category.description || 'No description provided'}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Created:</label>
                                        <span>${formatDate(category.createdAt)}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Category ID:</label>
                                        <span>${category.id}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="overview-section">
                                <h4>Statistics</h4>
                                <div class="stats-overview">
                                    <div class="overview-stat">
                                        <div class="overview-stat-icon">
                                            <i class="fas fa-cogs"></i>
                                        </div>
                                        <div class="overview-stat-content">
                                            <div class="overview-stat-value">${stats.partCount}</div>
                                            <div class="overview-stat-label">Total Parts</div>
                                        </div>
                                    </div>
                                    
                                    <div class="overview-stat">
                                        <div class="overview-stat-icon">
                                            <i class="fas fa-dollar-sign"></i>
                                        </div>
                                        <div class="overview-stat-content">
                                            <div class="overview-stat-value">${formatCurrency(stats.totalValue)}</div>
                                            <div class="overview-stat-label">Total Value</div>
                                        </div>
                                    </div>
                                    
                                    <div class="overview-stat ${stats.lowStockCount > 0 ? 'warning' : 'success'}">
                                        <div class="overview-stat-icon">
                                            <i class="fas fa-exclamation-triangle"></i>
                                        </div>
                                        <div class="overview-stat-content">
                                            <div class="overview-stat-value">${stats.lowStockCount}</div>
                                            <div class="overview-stat-label">Low Stock Items</div>
                                        </div>
                                    </div>
                                    
                                    <div class="overview-stat">
                                        <div class="overview-stat-icon">
                                            <i class="fas fa-percentage"></i>
                                        </div>
                                        <div class="overview-stat-content">
                                            <div class="overview-stat-value">${stats.partCount > 0 ? Math.round(((stats.partCount - stats.lowStockCount) / stats.partCount) * 100) : 100}%</div>
                                            <div class="overview-stat-label">Stock Health</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="category-actions-section">
                            <button class="btn btn-primary" onclick="editCategory(${category.id}); this.closest('.category-details-modal').remove();">
                                <i class="fas fa-edit"></i> Edit Category
                            </button>
                            <button class="btn btn-info" onclick="viewCategoryParts(${category.id}); this.closest('.category-details-modal').remove();">
                                <i class="fas fa-cogs"></i> View Parts
                            </button>
                            ${stats.partCount === 0 ? `
                                <button class="btn btn-danger" onclick="deleteCategory(${category.id}); this.closest('.category-details-modal').remove();">
                                    <i class="fas fa-trash"></i> Delete Category
                                </button>
                            ` : `
                                <button class="btn btn-secondary" disabled title="Cannot delete category with parts">
                                    <i class="fas fa-trash"></i> Delete Category
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
    } catch (error) {
        handleError(error, 'loading category details');
    } finally {
        hideLoading();
    }
}

// View category parts
export async function viewCategoryParts(categoryId) {
    // Switch to parts section with category filter
    const { switchSection } = await import('./navigation.js');
    await switchSection('parts');
    
    // Set category filter
    if (elements.categoryFilter) {
        elements.categoryFilter.value = categoryId.toString();
        elements.categoryFilter.dispatchEvent(new Event('change'));
    }
}

// Edit category
export async function editCategory(categoryId) {
    try {
        showLoading();
        
        const category = await categoriesAPI.getById(categoryId);
        appState.currentCategory = category;
        
        // Show edit modal (will be handled by modals module)
        const { showEditCategoryModal } = await import('./modals.js');
        showEditCategoryModal(category);
        
    } catch (error) {
        handleError(error, 'loading category for editing');
    } finally {
        hideLoading();
    }
}

// Delete category
export async function deleteCategory(categoryId) {
    try {
        // Check if category has parts
        const categoryStats = await statsAPI.getCategoryStats();
        const stats = categoryStats.find(s => s.categoryId === categoryId);
        
        if (stats && stats.partCount > 0) {
            showToast('Warning', `Cannot delete category with ${stats.partCount} parts. Move or delete parts first.`, 'warning');
            return;
        }
        
        const confirmed = await confirmAction(
            'Are you sure you want to delete this category? This action cannot be undone.',
            'Delete Category'
        );
        
        if (!confirmed) return;
        
        showLoading();
        await categoriesAPI.delete(categoryId);
        showToast('Success', 'Category deleted successfully');
        
        // Refresh categories list
        await loadCategories();
        
    } catch (error) {
        handleError(error, 'deleting category');
    } finally {
        hideLoading();
    }
}

// Save category
export async function saveCategory(categoryData, isEdit = false) {
    try {
        showLoading();
        
        if (isEdit && appState.currentCategory) {
            await categoriesAPI.update(appState.currentCategory.id, categoryData);
            showToast('Success', 'Category updated successfully');
        } else {
            await categoriesAPI.create(categoryData);
            showToast('Success', 'Category created successfully');
        }
        
        // Refresh categories list
        await loadCategories();
        
        // Update categories in app state for other modules
        appState.categories = await categoriesAPI.getAll();
        
        return true;
    } catch (error) {
        handleError(error, isEdit ? 'updating category' : 'creating category');
        return false;
    } finally {
        hideLoading();
    }
}

// Make functions available globally for onclick handlers
window.viewCategoryDetails = viewCategoryDetails;
window.viewCategoryParts = viewCategoryParts;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;