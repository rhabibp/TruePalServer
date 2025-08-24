import React, { createContext, useContext } from 'react';
import { PartDto } from '../types';

interface TransactionModalContextType {
    showTransactionModal: (initialPart?: PartDto) => void;
}

const TransactionModalContext = createContext<TransactionModalContextType | null>(null);

export const useTransactionModal = () => {
    const context = useContext(TransactionModalContext);
    if (!context) {
        throw new Error('useTransactionModal must be used within a TransactionModalProvider');
    }
    return context;
};

interface TransactionModalProviderProps {
    children: React.ReactNode;
    showTransactionModal: (initialPart?: PartDto) => void;
}

export const TransactionModalProvider: React.FC<TransactionModalProviderProps> = ({
    children,
    showTransactionModal
}) => {
    return (
        <TransactionModalContext.Provider value={{ showTransactionModal }}>
            {children}
        </TransactionModalContext.Provider>
    );
};

export default TransactionModalContext;