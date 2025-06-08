# System Load AI - Database Setup

## Tổng quan

Folder này chứa tất cả các file cần thiết để setup PostgreSQL database qua Docker cho System Load AI project.

## 🐳 Docker Services

- **PostgreSQL 15**: Main database
- **pgAdmin 4**: Web-based database management tool
- **Redis 7**: Caching layer (optional)

## 🚀 Quick Start

### Windows:

```bash
start-database.bat
```

### Linux/Mac:

```bash
chmod +x start-database.sh
./start-database.sh
```

### Manual:

```bash
docker-compose up -d
```

## 📊 Service Details

| Service    | Port | Credentials                   |
| ---------- | ---- | ----------------------------- |
| PostgreSQL | 5432 | postgres/postgres             |
| pgAdmin    | 5050 | admin@systemload.com/admin123 |
| Redis      | 6379 | No auth                       |

## 🔧 Database Configuration

- **Database Name**: systemload
- **Username**: postgres
- **Password**: postgres
- **Host**: localhost
- **Port**: 5432

## 📁 Files

- `docker-compose.yml`: Docker services configuration
- `init-db.sql`: Database initialization script
- `schema.sql`: Database schema and tables
- `start-database.bat`: Windows startup script
- `start-database.sh`: Linux/Mac startup script

## 🛠 Management Commands

### Start Services

```bash
docker-compose up -d
```

### Stop Services

```bash
docker-compose down
```

### View Logs

```bash
docker-compose logs -f postgres
```

### Connect to Database

```bash
docker exec -it systemload-postgres psql -U postgres -d systemload
```

### Check Status

```bash
docker-compose ps
```

## 🌐 Web Interfaces

- **pgAdmin**: http://localhost:5050
  - Email: admin@systemload.com
  - Password: admin123

## 🔍 Troubleshooting

### Database Not Starting

```bash
# Check logs
docker-compose logs postgres

# Restart services
docker-compose down && docker-compose up -d
```

### Connection Issues

```bash
# Test connection
docker exec systemload-postgres pg_isready -U postgres -d systemload

# Check if port is open
netstat -an | findstr 5432
```

### Reset Database

```bash
# Stop and remove volumes
docker-compose down -v

# Start fresh
docker-compose up -d
```

## 📝 Notes

- Database data persists in Docker volumes
- Schema is automatically created on first startup
- Backend application will auto-create tables via JPA
- pgAdmin configuration persists between restarts
