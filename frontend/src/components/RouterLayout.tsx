import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { TransactionModalProvider } from '../contexts/TransactionModalContext';
import { PartDto } from '../types';

export function RouterLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    // Navigate to transactions page with pre-filled part data
    const showTransactionModal = (initialPart?: PartDto) => {
        if (initialPart) {
            // Navigate to transactions page with the part data as state
            navigate('/transactions', { 
                state: { 
                    openCreateModal: true, 
                    initialPart: initialPart 
                } 
            });
        } else {
            // Navigate to transactions page without pre-filled data
            navigate('/transactions', { 
                state: { 
                    openCreateModal: true 
                } 
            });
        }
    };

    return (
        <TransactionModalProvider showTransactionModal={showTransactionModal}>
            <div className="min-h-screen bg-gray-50">
                {/* Sidebar */}
                <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

                {/* Main content */}
                <div className="md:pl-64">
                    {/* Header */}
                    <Header onMenuClick={() => setSidebarOpen(true)} />

                    {/* Page content */}
                    <main className="flex-1">
                        <Outlet />
                    </main>
                </div>
            </div>
        </TransactionModalProvider>
    );
}

export default RouterLayout;