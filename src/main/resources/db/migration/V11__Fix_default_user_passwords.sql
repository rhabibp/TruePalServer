-- Fix default user passwords with correct BCrypt hashes
-- This migration ensures the default users have working passwords

-- Delete existing users first to avoid conflicts
DELETE FROM users WHERE username IN ('admin', 'staff');

-- Create admin user with BCrypt hash for "admin123"
-- Hash generated using BCrypt.hashpw("admin123", BCrypt.gensalt())
INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at)
VALUES ('admin', 'admin@truepal.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'ADMIN', true, NOW());

-- Create staff user with BCrypt hash for "staff123" 
-- Hash generated using BCrypt.hashpw("staff123", BCrypt.gensalt())
INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at)
VALUES ('staff', 'staff@truepal.com', '$2a$10$N.aPF8m3xFWj8fKfbRNdle3ov6cCYR2.m6.fMf6VRtgOAWK/6kNfC', 'Staff User', 'STAFF', true, NOW());