import React from 'react';
import { Button } from './Button';

interface PaginationProps {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
    onPageChange: (page: number) => void;
}

export function Pagination({
    totalItems,
    itemsPerPage,
    currentPage,
    onPageChange,
}: PaginationProps) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    const handlePageClick = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            onPageChange(page);
        }
    };

    return (
        <div className="flex items-center justify-between py-3 bg-white px-4 md:px-6 border-t">
            <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center space-x-2">
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handlePageClick(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    Previous
                </Button>
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handlePageClick(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}

export default Pagination;