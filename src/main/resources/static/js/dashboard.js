// Dashboard Module
import { statsAPI, transactionsAPI } from './api.js';
import { 
    elements, 
    appState, 
    showLoading, 
    hideLoading, 
    showToast, 
    formatCurrency, 
    formatDate,
    handleError
} from './ui-utils.js';

// Load dashboard data
export async function loadDashboard() {
    try {
        showLoading();
        
        // Load inventory statistics
        const stats = await statsAPI.getInventoryStats();
        
        // Update stats cards
        updateStatsCards(stats);
        
        // Load fast moving parts
        renderFastMovingParts(stats.fastMovingParts);
        
        // Load recent transactions
        const recentTransactions = await transactionsAPI.getAll();
        renderRecentTransactions(recentTransactions.slice(0, 10));
        
    } catch (error) {
        handleError(error, 'loading dashboard');
    } finally {
        hideLoading();
    }
}

// Update statistics cards
function updateStatsCards(stats) {
    if (elements.totalParts) {
        elements.totalParts.textContent = stats.totalParts || 0;
    }
    
    if (elements.totalCategories) {
        elements.totalCategories.textContent = stats.totalCategories || 0;
    }
    
    if (elements.totalValue) {
        elements.totalValue.textContent = formatCurrency(stats.totalValue || 0);
    }
    
    if (elements.lowStockCount) {
        elements.lowStockCount.textContent = (stats.lowStockParts?.length || 0);
        
        // Add warning class if there are low stock items
        const card = elements.lowStockCount.closest('.stat-card');
        if (card) {
            card.classList.toggle('warning', (stats.lowStockParts?.length || 0) > 0);
        }
    }
}

// Render fast moving parts
function renderFastMovingParts(fastMovingParts) {
    if (!elements.fastMovingParts) return;
    
    if (!fastMovingParts || fastMovingParts.length === 0) {
        elements.fastMovingParts.innerHTML = `
            <div class="empty-state-small">
                <i class="fas fa-chart-line"></i>
                <p>No fast-moving parts data available</p>
            </div>
        `;
        return;
    }
    
    elements.fastMovingParts.innerHTML = fastMovingParts.map(part => `
        <div class="stats-item">
            <div class="stats-item-info">
                <div class="stats-item-name">${part.partName}</div>
                <div class="stats-item-details">
                    ${part.transactionCount} transactions • 
                    ${part.averagePerMonth.toFixed(1)}/month avg
                </div>
            </div>
            <div class="stats-item-value">
                <span class="quantity-out">${part.totalOutQuantity}</span>
                <span class="quantity-label">units</span>
            </div>
        </div>
    `).join('');
}

// Render recent transactions
function renderRecentTransactions(recentTransactions) {
    if (!elements.recentTransactions) return;
    
    if (!recentTransactions || recentTransactions.length === 0) {
        elements.recentTransactions.innerHTML = `
            <div class="empty-state-small">
                <i class="fas fa-exchange-alt"></i>
                <p>No recent transactions</p>
            </div>
        `;
        return;
    }
    
    elements.recentTransactions.innerHTML = recentTransactions.map(transaction => `
        <div class="stats-item">
            <div class="stats-item-info">
                <div class="stats-item-name">
                    ${transaction.partName || 'Unknown Part'}
                    <span class="transaction-type ${transaction.type.toLowerCase()}">${transaction.type}</span>
                </div>
                <div class="stats-item-details">
                    ${transaction.recipientName ? `To: ${transaction.recipientName}` : ''} • 
                    ${formatDate(transaction.transactionDate)}
                </div>
            </div>
            <div class="stats-item-value">
                <span class="quantity-badge ${transaction.type.toLowerCase()}">${transaction.quantity}</span>
                <span class="quantity-label">units</span>
            </div>
        </div>
    `).join('');
}

// Load reports data
export async function loadReports() {
    try {
        showLoading();
        
        const [inventoryStats, categoryStats] = await Promise.all([
            statsAPI.getInventoryStats(),
            statsAPI.getCategoryStats()
        ]);
        
        renderCategoryStats(categoryStats);
        renderInventoryAnalysis(inventoryStats);
        
    } catch (error) {
        handleError(error, 'loading reports');
    } finally {
        hideLoading();
    }
}

// Render category statistics
function renderCategoryStats(categoryStats) {
    if (!elements.categoryStats) return;
    
    if (!categoryStats || categoryStats.length === 0) {
        elements.categoryStats.innerHTML = `
            <div class="empty-state-small">
                <i class="fas fa-tags"></i>
                <p>No category statistics available</p>
            </div>
        `;
        return;
    }
    
    elements.categoryStats.innerHTML = categoryStats.map(stat => `
        <div class="stats-item">
            <div class="stats-item-info">
                <div class="stats-item-name">${stat.categoryName}</div>
                <div class="stats-item-details">
                    ${stat.partCount} parts • 
                    ${stat.lowStockCount > 0 ? `${stat.lowStockCount} low stock` : 'All stocked'}
                </div>
            </div>
            <div class="stats-item-value">
                ${formatCurrency(stat.totalValue)}
            </div>
        </div>
    `).join('');
}

// Render inventory analysis
function renderInventoryAnalysis(stats) {
    if (!elements.inventoryAnalysis) return;
    
    const averagePartsPerCategory = stats.totalCategories > 0 ? 
        Math.round(stats.totalParts / stats.totalCategories) : 0;
    
    const lowStockPercentage = stats.totalParts > 0 ? 
        ((stats.lowStockParts?.length || 0) / stats.totalParts * 100).toFixed(1) : 0;
    
    elements.inventoryAnalysis.innerHTML = `
        <div class="analysis-grid">
            <div class="analysis-item">
                <div class="analysis-icon">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="analysis-content">
                    <div class="analysis-title">Total Inventory Value</div>
                    <div class="analysis-value">${formatCurrency(stats.totalValue)}</div>
                    <div class="analysis-description">Current market value of all parts</div>
                </div>
            </div>
            
            <div class="analysis-item">
                <div class="analysis-icon ${(stats.lowStockParts?.length || 0) > 0 ? 'warning' : 'success'}">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="analysis-content">
                    <div class="analysis-title">Low Stock Alert</div>
                    <div class="analysis-value">${stats.lowStockParts?.length || 0} items (${lowStockPercentage}%)</div>
                    <div class="analysis-description">Parts below minimum stock level</div>
                </div>
            </div>
            
            <div class="analysis-item">
                <div class="analysis-icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="analysis-content">
                    <div class="analysis-title">Fast Moving Items</div>
                    <div class="analysis-value">${stats.fastMovingParts?.length || 0} parts</div>
                    <div class="analysis-description">High-consumption parts requiring attention</div>
                </div>
            </div>
            
            <div class="analysis-item">
                <div class="analysis-icon">
                    <i class="fas fa-balance-scale"></i>
                </div>
                <div class="analysis-content">
                    <div class="analysis-title">Average Parts per Category</div>
                    <div class="analysis-value">${averagePartsPerCategory}</div>
                    <div class="analysis-description">Distribution efficiency metric</div>
                </div>
            </div>
        </div>
        
        <div class="recommendations">
            <h4><i class="fas fa-lightbulb"></i> Recommendations</h4>
            <ul class="recommendation-list">
                ${generateRecommendations(stats)}
            </ul>
        </div>
    `;
}

// Generate recommendations based on inventory data
function generateRecommendations(stats) {
    const recommendations = [];
    
    if (stats.lowStockParts?.length > 0) {
        recommendations.push(`
            <li class="recommendation-item warning">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Urgent:</strong> ${stats.lowStockParts.length} parts are below minimum stock. 
                Consider restocking immediately.
            </li>
        `);
    }
    
    if (stats.fastMovingParts?.length > 3) {
        recommendations.push(`
            <li class="recommendation-item info">
                <i class="fas fa-chart-line"></i>
                <strong>Monitor:</strong> ${stats.fastMovingParts.length} fast-moving parts detected. 
                Review stock levels and consider bulk purchasing.
            </li>
        `);
    }
    
    if (stats.totalValue > 50000) {
        recommendations.push(`
            <li class="recommendation-item success">
                <i class="fas fa-shield-alt"></i>
                <strong>Insurance:</strong> High inventory value detected (${formatCurrency(stats.totalValue)}). 
                Ensure adequate insurance coverage.
            </li>
        `);
    }
    
    if (stats.totalCategories < 5) {
        recommendations.push(`
            <li class="recommendation-item info">
                <i class="fas fa-tags"></i>
                <strong>Organization:</strong> Consider creating more categories for better organization 
                as your inventory grows.
            </li>
        `);
    }
    
    if (recommendations.length === 0) {
        recommendations.push(`
            <li class="recommendation-item success">
                <i class="fas fa-check-circle"></i>
                <strong>Great!</strong> Your inventory appears to be well-managed. 
                Keep monitoring stock levels regularly.
            </li>
        `);
    }
    
    return recommendations.join('');
}

// Refresh dashboard data
export async function refreshDashboard() {
    await loadDashboard();
    showToast('Success', 'Dashboard data refreshed');
}