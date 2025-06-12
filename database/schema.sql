-- Database schema for System Load AI
-- This creates the tables that Spring Boot JPA will use

\echo 'Creating database schema...'

-- SystemMetrics table (Spring Boot JPA will create this automatically)
-- But we can define it here for reference and initial setup

-- Note: Spring Boot with JPA will auto-create tables based on @Entity classes
-- This schema is for reference and manual database setup if needed

CREATE TABLE IF NOT EXISTS system_metrics (
    id BIGSERIAL PRIMARY KEY,
    timestamp BIGINT,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- CPU metrics
    cpu_usage_percent DOUBLE PRECISION,
    cpu_usage_mhz DOUBLE PRECISION,
    cpu_cores INTEGER,
    cpu_capacity_mhz DOUBLE PRECISION,
    
    -- Memory metrics
    memory_usage_kb DOUBLE PRECISION,
    memory_capacity_kb DOUBLE PRECISION,
    memory_usage_percent DOUBLE PRECISION,
    
    -- Disk I/O metrics
    disk_read_throughput_kbs DOUBLE PRECISION,
    disk_write_throughput_kbs DOUBLE PRECISION,
    
    -- Network I/O metrics
    network_received_throughput_kbs DOUBLE PRECISION,
    network_transmitted_throughput_kbs DOUBLE PRECISION,
    
    -- Computed metrics for AI
    cpu_load_score DOUBLE PRECISION,
    io_load_score DOUBLE PRECISION,
    overall_load_score DOUBLE PRECISION
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_system_metrics_collected_at ON system_metrics(collected_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_overall_load_score ON system_metrics(overall_load_score);
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);

-- Create a view for recent metrics (last 24 hours)
CREATE OR REPLACE VIEW recent_metrics AS
SELECT *
FROM system_metrics
WHERE collected_at >= NOW() - INTERVAL '24 hours'
ORDER BY collected_at DESC;

-- Create a view for high load periods
CREATE OR REPLACE VIEW high_load_periods AS
SELECT *
FROM system_metrics
WHERE overall_load_score > 80
ORDER BY collected_at DESC;

\echo 'Database schema created successfully!' 