import React from 'react';
import { DollarSign, Banknote } from 'lucide-react';
import { useCurrency, Currency } from '../contexts/CurrencyContext';

export const CurrencySelector: React.FC = () => {
  const { currency, setCurrency } = useCurrency();

  const currencies: { value: Currency; label: string; icon: React.ElementType; flag: string }[] = [
    { value: 'USD', label: 'USD', icon: DollarSign, flag: '🇺🇸' },
    { value: 'QAR', label: 'QAR', icon: Banknote, flag: '🇶🇦' },
  ];

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-600 hidden sm:block">Currency:</span>
      <div className="flex bg-gray-100 rounded-lg p-1">
        {currencies.map((curr) => {
          const Icon = curr.icon;
          return (
            <button
              key={curr.value}
              onClick={() => setCurrency(curr.value)}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                currency === curr.value
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="text-base">{curr.flag}</span>
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{curr.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};