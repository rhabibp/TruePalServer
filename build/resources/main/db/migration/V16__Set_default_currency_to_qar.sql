-- Set default currency to QAR for all existing and new records
-- This makes QAR the default currency instead of USD

-- Update existing records from USD to QAR
UPDATE transactions SET currency = 'QAR' WHERE currency = 'USD';
UPDATE invoices SET currency = 'QAR' WHERE currency = 'USD';

-- Change column defaults to QAR for future records
ALTER TABLE transactions ALTER COLUMN currency SET DEFAULT 'QAR';
ALTER TABLE invoices ALTER COLUMN currency SET DEFAULT 'QAR';

-- For existing records that might be NULL (shouldn't happen but safety check)
UPDATE transactions SET currency = 'QAR' WHERE currency IS NULL;
UPDATE invoices SET currency = 'QAR' WHERE currency IS NULL;