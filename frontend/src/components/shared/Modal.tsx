import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'lg'
}: ModalProps) {
    if (!isOpen) return null;

    const sizeClasses = {
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-2 md:p-4">
                <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
                <div className={`relative bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]}`}>
                    <div className="flex items-center justify-between p-4 md:p-6 border-b">
                        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
                            ×
                        </button>
                    </div>
                    <div className="p-4 md:p-6">{children}</div>
                </div>
            </div>
        </div>
    );
}

export default Modal;