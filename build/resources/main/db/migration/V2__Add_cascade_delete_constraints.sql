-- V2__Fix_foreign_key_constraints.sql

-- Drop existing foreign key constraints that are causing the delete issue
ALTER TABLE transaction_items DROP CONSTRAINT IF EXISTS transaction_items_part_id_fkey;
ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS invoice_items_part_id_fkey;

-- Add foreign key constraints with CASCADE DELETE to automatically clean up related records
ALTER TABLE transaction_items
ADD CONSTRAINT transaction_items_part_id_fkey
FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE;

ALTER TABLE invoice_items
ADD CONSTRAINT invoice_items_part_id_fkey
FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE;

-- Also fix the transaction_items constraint name to match what's in your V1 migration
-- (Your V1 migration already has ON DELETE CASCADE for transaction_items, but let's make sure)