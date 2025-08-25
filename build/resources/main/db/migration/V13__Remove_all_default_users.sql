-- Remove all default users to allow fresh setup
-- This will clear the database so admin can create initial user via setup endpoint

DELETE FROM users;