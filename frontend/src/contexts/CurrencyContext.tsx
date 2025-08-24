import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Currency = 'USD' | 'QAR';

export interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (amount: number, currency?: Currency) => string;
  currencySymbol: string;
  exchangeRate: number; // QAR to USD rate (1 USD = x QAR)
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>('QAR');
  
  // Exchange rate: 1 USD = 3.64 QAR (approximate)
  const exchangeRate = 3.64;
  
  const currencySymbol = currency === 'USD' ? '$' : 'QR ';
  
  const formatPrice = (amount: number, currencyOverride?: Currency): string => {
    // Use override currency if provided, otherwise use current context currency
    const displayCurrency = currencyOverride || currency;
    
    // Backend stores amounts in the selected currency already
    // No need to convert - just format with the appropriate symbol
    const formatted = amount.toFixed(2);
    
    if (displayCurrency === 'QAR') {
      return `QR ${formatted}`;
    } else {
      return `$${formatted}`;
    }
  };

  const value: CurrencyContextType = {
    currency,
    setCurrency,
    formatPrice,
    currencySymbol,
    exchangeRate,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};