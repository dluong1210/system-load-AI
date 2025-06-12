# System Load AI - Database Setup

PostgreSQL database setup với Docker cho System Load AI project, bao gồm automatic schema initialization và management tools.

## 🚀 Quick Start

### Auto Start Scripts

```bash
# Windows
start-database.bat

# Linux/Mac  
chmod +x start-database.sh && ./start-database.sh

# Manual Docker
docker-compose up -d
```

### Verify Setup

```bash
# Check services status
docker-compose ps

# Test database connection
docker exec systemload-postgres pg_isready -U postgres -d systemload

# View initialization logs
docker-compose logs postgres
```

## 🐳 Docker Services

### PostgreSQL 15 (Main Database)
- **Container**: `systemload-postgres`
- **Port**: `5432`
- **Database**: `systemload`
- **Credentials**: `postgres/postgres`
- **Health Check**: Built-in với retry logic
- **Auto-initialization**: Scripts chạy tự động lần đầu

### pgAdmin 4 (Database Management)
- **Container**: `systemload-pgadmin` 
- **Port**: `5050` → `http://localhost:5050`
- **Credentials**: `admin@systemload.com/admin123`
- **Features**: Web-based SQL editor, query builder, monitoring

## 🗄️ Database Schema

### SystemMetrics Table

Bảng chính lưu trữ system metrics với full indexing:

```sql
CREATE TABLE system_metrics (
    id BIGSERIAL PRIMARY KEY,
    timestamp BIGINT,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- CPU Metrics
    cpu_usage_percent DOUBLE PRECISION,
    cpu_usage_mhz DOUBLE PRECISION,
    cpu_cores INTEGER,
    cpu_capacity_mhz DOUBLE PRECISION,
    
    -- Memory Metrics  
    memory_usage_kb DOUBLE PRECISION,
    memory_capacity_kb DOUBLE PRECISION,
    memory_usage_percent DOUBLE PRECISION,
    
    -- I/O Throughput
    disk_read_throughput_kbs DOUBLE PRECISION,
    disk_write_throughput_kbs DOUBLE PRECISION,
    network_received_throughput_kbs DOUBLE PRECISION,
    network_transmitted_throughput_kbs DOUBLE PRECISION,
    
    -- AI Load Scores
    cpu_load_score DOUBLE PRECISION,
    io_load_score DOUBLE PRECISION,
    overall_load_score DOUBLE PRECISION
);
```

### Performance Indexes

```sql
-- Query optimization indexes
CREATE INDEX idx_system_metrics_collected_at ON system_metrics(collected_at);
CREATE INDEX idx_system_metrics_overall_load_score ON system_metrics(overall_load_score);
CREATE INDEX idx_system_metrics_timestamp ON system_metrics(timestamp);
```

### Utility Views

```sql
-- Recent metrics (last 24h)
CREATE VIEW recent_metrics AS
SELECT * FROM system_metrics 
WHERE collected_at >= NOW() - INTERVAL '24 hours'
ORDER BY collected_at DESC;

-- High load periods (>80% load)  
CREATE VIEW high_load_periods AS
SELECT * FROM system_metrics
WHERE overall_load_score > 80
ORDER BY collected_at DESC;
```

## 📁 File Structure

```
database/
├── docker-compose.yml     # Services configuration
├── init-db.sql          # Database initialization  
├── schema.sql           # Tables, indexes, views
├── README.md           # This documentation
```

## ⚙️ Configuration Details

### Environment Variables

```yaml
# PostgreSQL
POSTGRES_DB: systemload
POSTGRES_USER: postgres  
POSTGRES_PASSWORD: postgres
POSTGRES_INITDB_ARGS: "--encoding=UTF8"

# pgAdmin
PGADMIN_DEFAULT_EMAIL: admin@systemload.com
PGADMIN_DEFAULT_PASSWORD: admin123
```

### Volume Mounts

- **postgres_data**: Database persistent storage
- **pgadmin_data**: pgAdmin configuration persistence
- **init scripts**: `./init-db.sql` và `./schema.sql` auto-run

### Network

- **systemload-network**: Bridge network cho service communication
- **Health checks**: PostgreSQL readiness verification

## 🛠 Management Commands

### Service Operations

```bash
# Start all services
docker-compose up -d

# Stop services
docker-compose down

# Restart specific service
docker-compose restart postgres

# View real-time logs
docker-compose logs -f postgres

# Scale services (if needed)
docker-compose up -d --scale postgres=1
```

### Database Operations

```bash
# Connect to database
docker exec -it systemload-postgres psql -U postgres -d systemload

# Run SQL file
docker exec -i systemload-postgres psql -U postgres -d systemload < query.sql

# Backup database
docker exec systemload-postgres pg_dump -U postgres systemload > backup.sql

# Restore database  
docker exec -i systemload-postgres psql -U postgres systemload < backup.sql
```

### Monitoring

```bash
# Check container health
docker-compose ps
docker inspect systemload-postgres --format='{{.State.Health.Status}}'

# Monitor resource usage
docker stats systemload-postgres

# Database size and connections
docker exec systemload-postgres psql -U postgres -d systemload -c "\l+"
docker exec systemload-postgres psql -U postgres -d systemload -c "SELECT * FROM pg_stat_activity;"
```

## 🌐 Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| PostgreSQL | `localhost:5432` | Direct database connection |
| pgAdmin | `http://localhost:5050` | Web database management |
| Health Check | `docker exec ... pg_isready` | Service status verification |

### pgAdmin Connection Setup

1. Open `http://localhost:5050`
2. Login: `admin@systemload.com` / `admin123`
3. Add Server:
   - **Name**: SystemLoad Database
   - **Host**: `systemload-postgres` (container name)
   - **Port**: `5432`
   - **Database**: `systemload`
   - **Username**: `postgres`
   - **Password**: `postgres`

## 🔧 Troubleshooting

### Common Issues

#### Database Won't Start

```bash
# Check logs for errors
docker-compose logs postgres

# Verify port availability
netstat -an | findstr 5432  # Windows
lsof -i :5432              # Linux/Mac

# Clean restart
docker-compose down -v && docker-compose up -d
```

#### Connection Refused

```bash
# Wait for health check to pass
docker-compose logs postgres | grep "ready"

# Test connection
docker exec systemload-postgres pg_isready -U postgres -d systemload

# Check network connectivity
docker network ls
docker network inspect database_systemload-network
```

#### pgAdmin Issues

```bash
# Reset pgAdmin data
docker-compose down
docker volume rm database_pgadmin_data
docker-compose up -d pgadmin
```

### Performance Tuning

#### Database Configuration

Thêm vào `docker-compose.yml` nếu cần optimize:

```yaml
postgres:
  environment:
    # Memory settings
    POSTGRES_SHARED_BUFFERS: 256MB
    POSTGRES_EFFECTIVE_CACHE_SIZE: 1GB
    POSTGRES_WORK_MEM: 4MB
    
    # Connection settings  
    POSTGRES_MAX_CONNECTIONS: 100
```

#### Index Monitoring

```sql
-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats WHERE tablename = 'system_metrics';

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM system_metrics 
WHERE collected_at >= NOW() - INTERVAL '1 hour';
```

## 🚨 Backup & Recovery

### Automated Backup Script

```bash
#!/bin/bash
# backup-db.sh
DATE=$(date +%Y%m%d_%H%M%S)
docker exec systemload-postgres pg_dump -U postgres systemload > "backup_${DATE}.sql"
echo "Backup created: backup_${DATE}.sql"
```

### Disaster Recovery

```bash
# Complete reset
docker-compose down -v
docker-compose up -d

# Restore from backup
docker exec -i systemload-postgres psql -U postgres systemload < backup_file.sql
```

## 📊 Integration với Backend

Backend Spring Boot tự động:

- **Detect database**: Via JDBC connection string
- **Auto-create tables**: Spring JPA annotations
- **Run migrations**: Liquibase/Flyway support
- **Connection pooling**: HikariCP default
- **Health monitoring**: Actuator endpoints

### Backend Configuration

```yaml
# application.yml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/systemload
    username: postgres
    password: postgres
    driver-class-name: org.postgresql.Driver
  
  jpa:
    hibernate:
      ddl-auto: update  # Auto-create/update tables
    show-sql: true     # Debug SQL queries
    database-platform: org.hibernate.dialect.PostgreSQLDialect
```

Database setup hoàn toàn automated - chỉ cần `docker-compose up -d` và ready để use!
