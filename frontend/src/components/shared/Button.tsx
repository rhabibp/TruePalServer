import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost' | 'glass';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    children: React.ReactNode;
    className?: string;
    loading?: boolean;
    icon?: React.ReactNode;
}

export function Button({
    variant = 'primary',
    size = 'md',
    children,
    className = '',
    loading = false,
    icon,
    disabled,
    ...props
}: ButtonProps) {
    const variants = {
        primary: 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 shadow-soft hover:shadow-medium focus:ring-primary-500/20',
        secondary: 'bg-white/80 backdrop-blur-sm text-secondary-700 border border-secondary-200 hover:bg-white hover:border-secondary-300 shadow-soft hover:shadow-medium focus:ring-secondary-500/20',
        danger: 'bg-gradient-to-r from-danger-500 to-danger-600 text-white hover:from-danger-600 hover:to-danger-700 shadow-soft hover:shadow-medium focus:ring-danger-500/20',
        success: 'bg-gradient-to-r from-success-500 to-success-600 text-white hover:from-success-600 hover:to-success-700 shadow-soft hover:shadow-medium focus:ring-success-500/20',
        warning: 'bg-gradient-to-r from-warning-500 to-warning-600 text-white hover:from-warning-600 hover:to-warning-700 shadow-soft hover:shadow-medium focus:ring-warning-500/20',
        ghost: 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-700 focus:ring-secondary-500/20',
        glass: 'glass text-white hover:bg-white/30 focus:ring-white/20',
    };
    
    const sizes = {
        xs: 'px-2.5 py-1.5 text-xs font-medium',
        sm: 'px-3 py-2 text-sm font-medium',
        md: 'px-4 py-2.5 text-sm font-semibold',
        lg: 'px-6 py-3 text-base font-semibold',
        xl: 'px-8 py-4 text-lg font-semibold',
    };

    const isDisabled = disabled || loading;

    return (
        <button
            className={`
                inline-flex items-center justify-center rounded-xl font-medium 
                transition-all duration-200 transform hover:scale-105 active:scale-95
                focus:outline-none focus:ring-2 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100
                ${variants[variant]} ${sizes[size]} ${className}
            `}
            disabled={isDisabled}
            {...props}
        >
            {loading && (
                <svg 
                    className="animate-spin -ml-1 mr-2 h-4 w-4" 
                    fill="none" 
                    viewBox="0 0 24 24"
                >
                    <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                    />
                    <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            )}
            {icon && !loading && (
                <span className="mr-2">{icon}</span>
            )}
            {children}
        </button>
    );
}

export default Button;