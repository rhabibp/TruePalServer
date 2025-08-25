-- Update user role enum to support ADMIN and STAFF only
-- This migration updates existing users and changes the default role

-- First, update any existing users with old roles
UPDATE users SET role = 'ADMIN' WHERE role IN ('ADMIN');
UPDATE users SET role = 'STAFF' WHERE role IN ('USER', 'MANAGER', 'STAFF');

-- Add constraint to ensure only ADMIN and STAFF roles are allowed
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_user_role;
ALTER TABLE users ADD CONSTRAINT check_user_role CHECK (role IN ('ADMIN', 'STAFF'));

-- Update the default role to STAFF
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'STAFF';

-- Ensure we have a default admin user with the correct password hash for "admin123"
INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at)
VALUES ('admin', 'admin@truepal.com', '$2a$12$LQv3c1yqBw0oRuUzxIlm/OM6l6bWVTb6C4Ofo8KYGJyLWlj6E2KoS', 'System Administrator', 'ADMIN', true, NOW())
ON CONFLICT (username) DO UPDATE SET
    password_hash = '$2a$12$LQv3c1yqBw0oRuUzxIlm/OM6l6bWVTb6C4Ofo8KYGJyLWlj6E2KoS',
    role = 'ADMIN',
    is_active = true;

-- Create a default staff user for testing
INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at)
VALUES ('staff', 'staff@truepal.com', '$2a$12$LQv3c1yqBw0oRuUzxIlm/OM6l6bWVTb6C4Ofo8KYGJyLWlj6E2KoS', 'Staff User', 'STAFF', true, NOW())
ON CONFLICT (username) DO UPDATE SET
    password_hash = '$2a$12$LQv3c1yqBw0oRuUzxIlm/OM6l6bWVTb6C4Ofo8KYGJyLWlj6E2KoS',
    role = 'STAFF',
    is_active = true;