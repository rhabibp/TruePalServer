-- Create working default users with known BCrypt hashes
-- WORKING CREDENTIALS:
-- Username: admin, Password: secret
-- Username: staff, Password: secret

-- Delete existing users to start fresh
DELETE FROM users WHERE username IN ('admin', 'staff');

-- Create admin user with password "secret"
-- Hash: $2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW (BCrypt hash for "secret")
INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at)
VALUES ('admin', 'admin@truepal.com', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'System Administrator', 'ADMIN', true, NOW());

-- Create staff user with password "secret"  
-- Hash: $2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW (BCrypt hash for "secret")
INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at)
VALUES ('staff', 'staff@truepal.com', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Staff User', 'STAFF', true, NOW());