-- Initialize database for System Load AI
-- This script runs when PostgreSQL container starts for the first time

\echo 'Starting database initialization...'

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create database if it doesn't exist
-- Note: This is now handled by POSTGRES_DB environment variable
-- But we still need to set up permissions and schema

-- Connect to the database first
\c systemload;

-- Set timezone
SET timezone = 'UTC';

-- Grant permissions to admin user
GRANT ALL PRIVILEGES ON DATABASE systemload TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;

-- Create schema if needed
CREATE SCHEMA IF NOT EXISTS public;

-- Set default permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO admin;

\echo 'Database systemload initialized successfully!' 