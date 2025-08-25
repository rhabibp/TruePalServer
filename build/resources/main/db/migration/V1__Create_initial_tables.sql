-- src/main/resources/db/migration/V1__Create_initial_tables.sql

-- This script should match your CURRENT database schema EXACTLY.
-- The table and column names/types must be the same.

-- Create categories table first (no dependencies)
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() at time zone 'utc')
);

-- Create parts table (depends on categories)
CREATE TABLE IF NOT EXISTS parts (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    part_number VARCHAR(100) NOT NULL UNIQUE,
    category_id BIGINT NOT NULL REFERENCES categories(id),
    unit_price DECIMAL(10, 2) NOT NULL,
    current_stock INT NOT NULL DEFAULT 0,
    minimum_stock INT NOT NULL DEFAULT 0,
    max_stock INT,
    location VARCHAR(100),
    supplier VARCHAR(200),
    machine_models TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() at time zone 'utc'),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() at time zone 'utc')
);

-- Create users table (no dependencies)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL
);

-- Create customers table (no dependencies)
CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    contact_name VARCHAR(200) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    contact_email VARCHAR(100),
    in_charge VARCHAR(200) NOT NULL,
    business_type VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- Create machines table (depends on customers)
CREATE TABLE IF NOT EXISTS machines (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    model VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL
);

-- Create transactions table (no dependencies)
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    recipient_name VARCHAR(200),
    reason TEXT,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    transaction_date TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() at time zone 'utc'),
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() at time zone 'utc'),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() at time zone 'utc')
);

-- Create invoices table (depends on transactions)
CREATE TABLE IF NOT EXISTS invoices (
    id BIGSERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id),
    type VARCHAR(20) NOT NULL,
    recipient_name VARCHAR(200),
    reason TEXT,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    company_name VARCHAR(200) NOT NULL DEFAULT 'True Pal Trading & Services',
    company_address VARCHAR(500) NOT NULL DEFAULT 'PO Box 82705, Doha, Qatar',
    company_phone VARCHAR(50) NOT NULL DEFAULT '+974 30199257',
    company_email VARCHAR(100) NOT NULL DEFAULT 'syedumer22@yahoo.co.uk',
    license_number VARCHAR(100) DEFAULT 'CR No: 194730',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() at time zone 'utc')
);

-- Create transaction_items table (depends on transactions and parts)
CREATE TABLE IF NOT EXISTS transaction_items (
    id              BIGSERIAL PRIMARY KEY,
    transaction_id  BIGINT      NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    part_id         BIGINT      NOT NULL REFERENCES parts(id),
    quantity        INTEGER     NOT NULL,
    unit_price      NUMERIC(10,2) NOT NULL,
    line_total      NUMERIC(10,2) NOT NULL,
    created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create invoice_items table (depends on invoices and parts)
CREATE TABLE IF NOT EXISTS invoice_items (
    id          BIGSERIAL PRIMARY KEY,
    invoice_id  BIGINT      NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    part_id     BIGINT      NOT NULL REFERENCES parts(id),
    part_name   VARCHAR(200) NOT NULL,
    part_number VARCHAR(100) NOT NULL,
    quantity    INTEGER     NOT NULL,
    unit_price  NUMERIC(10,2) NOT NULL,
    line_total  NUMERIC(10,2) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_invoices_transaction_id ON invoices(transaction_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_part_id ON transaction_items(part_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_part_id ON invoice_items(part_id);

-- Insert default admin user
INSERT INTO users (username, email, password_hash, full_name, role, is_active)
VALUES ('admin', 'admin@truepal.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjZGgzJzYzqZqGzrCS9nUiOzZcqIqW', 'System Administrator', 'ADMIN', true)
ON CONFLICT (username) DO NOTHING;