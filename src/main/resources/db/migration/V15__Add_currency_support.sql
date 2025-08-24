-- Add currency support to transactions and invoices
-- Default to USD for existing records

-- Add currency column to transactions
ALTER TABLE transactions 
ADD COLUMN currency VARCHAR(10) DEFAULT 'USD' NOT NULL;

-- Add currency column to invoices  
ALTER TABLE invoices
ADD COLUMN currency VARCHAR(10) DEFAULT 'USD' NOT NULL;