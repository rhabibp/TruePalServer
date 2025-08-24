import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface SortConfig {
    key: string | null;
    direction: 'ascending' | 'descending';
}

interface TableHeaderProps {
    columns: {
        key: string;
        label: string;
        sortable?: boolean;
        className?: string;
        width?: string;
    }[];
    sortConfig: SortConfig;
    onSort: (key: any) => void;
    className?: string;
}

export const TableHeader: React.FC<TableHeaderProps> = ({
    columns,
    sortConfig,
    onSort,
    className = ""
}) => {
    const getSortIcon = (columnKey: string) => {
        if (sortConfig.key !== columnKey) {
            return <ChevronsUpDown className="h-4 w-4 text-gray-400" />;
        }
        
        return sortConfig.direction === 'ascending' 
            ? <ChevronUp className="h-4 w-4 text-blue-600" />
            : <ChevronDown className="h-4 w-4 text-blue-600" />;
    };

    return (
        <thead className={`bg-gray-50 ${className}`}>
            <tr>
                {columns.map((column) => (
                    <th
                        key={column.key}
                        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                            column.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                        } ${column.className || ''}`}
                        style={{ width: column.width }}
                        onClick={() => column.sortable && onSort(column.key)}
                    >
                        <div className="flex items-center space-x-1">
                            <span>{column.label}</span>
                            {column.sortable && getSortIcon(column.key)}
                        </div>
                    </th>
                ))}
            </tr>
        </thead>
    );
};

export default TableHeader;