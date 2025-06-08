-- Initialize database for System Load AI
-- This script runs when PostgreSQL container starts for the first time

\echo 'Starting database initialization...'

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create systemload database (already created by POSTGRES_DB env var)
-- But we can add additional setup here

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE systemload TO postgres;

-- Create schema if needed
-- CREATE SCHEMA IF NOT EXISTS systemload;

-- Set timezone
SET timezone = 'UTC';

\echo 'Database systemload initialized successfully!' 