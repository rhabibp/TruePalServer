-- V3__Fix_foreign_key_cascade_constraints.sql
-- This migration fixes the foreign key constraints to properly support CASCADE DELETE

-- Log current state for debugging
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Current foreign key constraints before migration:';
    FOR rec IN
        SELECT tc.constraint_name, tc.table_name, kcu.column_name,
               ccu.table_name AS foreign_table_name, rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('transaction_items', 'invoice_items', 'invoices')
        ORDER BY tc.table_name, tc.constraint_name
    LOOP
        -- CORRECTED THE FORMAT STRING HERE
        RAISE NOTICE 'Constraint: % on %.% -> % (DELETE: %)',
            rec.constraint_name, rec.table_name, rec.column_name,
            rec.foreign_table_name, rec.delete_rule;
    END LOOP;
END $$;

-- Drop existing foreign key constraints if they exist
ALTER TABLE transaction_items DROP CONSTRAINT IF EXISTS transaction_items_part_id_fkey CASCADE;
ALTER TABLE transaction_items DROP CONSTRAINT IF EXISTS fk_transaction_items_part_id CASCADE;
ALTER TABLE transaction_items DROP CONSTRAINT IF EXISTS transaction_items_part_id_fkey1 CASCADE;

ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS invoice_items_part_id_fkey CASCADE;
ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS fk_invoice_items_part_id CASCADE;
ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS invoice_items_part_id_fkey1 CASCADE;

ALTER TABLE transaction_items DROP CONSTRAINT IF EXISTS transaction_items_transaction_id_fkey CASCADE;
ALTER TABLE transaction_items DROP CONSTRAINT IF EXISTS fk_transaction_items_transaction_id CASCADE;

ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_fkey CASCADE;
ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS fk_invoice_items_invoice_id CASCADE;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_transaction_id_fkey CASCADE;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS fk_invoices_transaction_id CASCADE;

-- Now recreate all foreign key constraints with proper CASCADE behavior
ALTER TABLE transaction_items
ADD CONSTRAINT transaction_items_transaction_id_fkey
FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE transaction_items
ADD CONSTRAINT transaction_items_part_id_fkey
FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE invoice_items
ADD CONSTRAINT invoice_items_invoice_id_fkey
FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE invoice_items
ADD CONSTRAINT invoice_items_part_id_fkey
FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE invoices
ADD CONSTRAINT invoices_transaction_id_fkey
FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes for better performance on foreign key columns
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_part_id ON transaction_items(part_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_part_id ON invoice_items(part_id);
CREATE INDEX IF NOT EXISTS idx_invoices_transaction_id ON invoices(transaction_id);

-- Verify the constraints are properly created and log the results
DO $$
DECLARE
    rec RECORD;
    constraint_count INTEGER := 0;
    cascade_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Verifying foreign key constraints after migration:';

    FOR rec IN
        SELECT tc.constraint_name, tc.table_name, kcu.column_name,
               ccu.table_name AS foreign_table_name, rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('transaction_items', 'invoice_items', 'invoices')
        ORDER BY tc.table_name, tc.constraint_name
    LOOP
        constraint_count := constraint_count + 1;
        IF rec.delete_rule = 'CASCADE' THEN
            cascade_count := cascade_count + 1;
        END IF;

        -- CORRECTED THE FORMAT STRING HERE AS WELL
        RAISE NOTICE 'Constraint: % on %.% -> % (DELETE: %)',
            rec.constraint_name, rec.table_name, rec.column_name,
            rec.foreign_table_name, rec.delete_rule;
    END LOOP;

    RAISE NOTICE 'Migration completed: % total constraints, % with CASCADE DELETE',
        constraint_count, cascade_count;

    -- Verify specific critical constraints
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.referential_constraints
        WHERE constraint_name = 'transaction_items_part_id_fkey'
        AND delete_rule = 'CASCADE'
    ) THEN
        RAISE EXCEPTION 'CRITICAL: transaction_items_part_id_fkey constraint not created with CASCADE';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.referential_constraints
        WHERE constraint_name = 'invoice_items_part_id_fkey'
        AND delete_rule = 'CASCADE'
    ) THEN
        RAISE EXCEPTION 'CRITICAL: invoice_items_part_id_fkey constraint not created with CASCADE';
    END IF;

    RAISE NOTICE 'SUCCESS: All critical foreign key constraints verified with CASCADE DELETE';
END $$;