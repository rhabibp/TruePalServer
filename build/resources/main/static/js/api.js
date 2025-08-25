// API Configuration and Functions
const API_BASE_URL = 'http://127.0.0.1:8080/api';

// API utility function
async function apiCall(endpoint, options = {}) {
    try {
        const fullUrl = `${API_BASE_URL}${endpoint}`;
        const response = await fetch(fullUrl, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            return data;
        } else {
            const text = await response.text();
            // Log specifics for debugging
            console.error('[apiCall] Unexpected response type', {
                fullUrl,
                options,
                status: response.status,
                contentType,
                responseSnippet: text.substring(0,200)
            });
            throw new Error(`Unexpected response type. Status: ${response.status}. Body: ${text.substring(0,200)}`);
        }
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Categories API
export const categoriesAPI = {
    async getAll() {
        const response = await apiCall('/categories');
        return response.data || [];
    },

    async getById(id) {
        const response = await apiCall(`/categories/${id}`);
        return response.data;
    },

    async create(categoryData) {
        const response = await apiCall('/categories', {
            method: 'POST',
            body: JSON.stringify(categoryData)
        });
        return response.data;
    },

    async update(id, categoryData) {
        const response = await apiCall(`/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(categoryData)
        });
        return response.data;
    },

    async delete(id) {
        const response = await apiCall(`/categories/${id}`, {
            method: 'DELETE'
        });
        return response.data;
    }
};

// Parts API
export const partsAPI = {
    async getAll() {
        const response = await apiCall('/parts');
        return response.data || [];
    },

    async getById(id) {
        const response = await apiCall(`/parts/${id}`);
        return response.data;
    },

    async search(query) {
        const response = await apiCall(`/parts/search?q=${encodeURIComponent(query)}`);
        return response.data || [];
    },

    async getLowStock() {
        const response = await apiCall('/parts/low-stock');
        return response.data || [];
    },

    async create(partData) {
        const response = await apiCall('/parts', {
            method: 'POST',
            body: JSON.stringify(partData)
        });
        return response.data;
    },

    async update(id, partData) {
        const response = await apiCall(`/parts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(partData)
        });
        return response.data;
    },

    async delete(id) {
        const response = await apiCall(`/parts/${id}`, {
            method: 'DELETE'
        });
        return response.data;
    }
};

// Transactions API
export const transactionsAPI = {
    async getAll() {
        const response = await apiCall('/transactions');
        return response.data || [];
    },

    async getById(id) {
        const response = await apiCall(`/transactions/${id}`);
        return response.data;
    },

    async getByPartId(partId) {
        const response = await apiCall(`/transactions/part/${partId}`);
        return response.data || [];
    },

    async create(transactionData) {
        const response = await apiCall('/transactions', {
            method: 'POST',
            body: JSON.stringify(transactionData)
        });
        return response.data;
    },

    async updatePayment(id, paymentData) {
        const response = await apiCall(`/transactions/${id}/payment`, {
            method: 'PUT',
            body: JSON.stringify(paymentData)
        });
        return response.data;
    },

    async delete(id) {
        const response = await apiCall(`/transactions/${id}`, {
            method: 'DELETE'
        });
        return response.data;
    },

    async getFastMoving(limit = 10) {
        const response = await apiCall(`/transactions/fast-moving?limit=${limit}`);
        return response.data || [];
    }
};

// Invoices API
export const invoicesAPI = {
    async getAll() {
        const response = await apiCall('/invoices');
        return response.data || [];
    },

    async getById(id) {
        const response = await apiCall(`/invoices/${id}`);
        return response.data;
    },

    async getByTransactionId(transactionId) {
        const response = await apiCall(`/invoices/transaction/${transactionId}`);
        return response.data || [];
    },

    async getByNumber(invoiceNumber) {
        const response = await apiCall(`/invoices/number/${invoiceNumber}`);
        return response.data;
    },

    async delete(id) {
        const response = await apiCall(`/invoices/${id}`, {
            method: 'DELETE'
        });
        return response.data;
    },
    async downloadPDF(id) {
        const response = await fetch(`${API_BASE_URL}/invoices/${id}/pdf`);
        if (!response.ok) {
            throw new Error('Failed to generate PDF');
        }
        return await response.blob();
    },
    async getPrintData(id) {
        const response = await apiCall(`/invoices/${id}/print-data`);
        return response.data;
    },

    async getHTML(id) {
        const response = await fetch(`${API_BASE_URL}/invoices/${id}/html`);
        if (!response.ok) {
            throw new Error('Failed to fetch invoice HTML');
        }
        return await response.text();
    },


};

// Statistics API
export const statsAPI = {
    async getInventoryStats() {
        const response = await apiCall('/stats/inventory');
        return response.data;
    },

    async getCategoryStats() {
        const response = await apiCall('/stats/categories');
        return response.data || [];
    }
};
