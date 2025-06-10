# Quick Start Guide

## Chạy toàn bộ hệ thống

Để chạy toàn bộ hệ thống System Load AI, hãy thực hiện các bước sau:

### 1. Chuẩn bị

Đảm bảo bạn đã cài đặt:
- Docker
- Docker Compose

### 2. Chạy hệ thống

Từ thư mục gốc của dự án, chạy lệnh:

```bash
docker-compose up -d
```

Hoặc để xem logs:

```bash
docker-compose up
```

### 3. Kiểm tra trạng thái

Kiểm tra tất cả các services đang chạy:

```bash
docker-compose ps
```

### 4. Truy cập các dịch vụ

Sau khi khởi động thành công, bạn có thể truy cập:

- **Frontend (React App)**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Backend Health Check**: http://localhost:8080/actuator/health
- **Mock Server**: http://localhost:8000
- **PostgreSQL Database**: localhost:5432
  - Database: `systemload`
  - Username: `postgres`
  - Password: `postgres`
- **pgAdmin (Database Management)**: http://localhost:5050
  - Email: `admin@systemload.com`
  - Password: `admin123`

### 5. Kết nối database trong pgAdmin

Để kết nối database trong pgAdmin:
1. Truy cập http://localhost:5050
2. Đăng nhập với email/password ở trên
3. Tạo server connection mới:
   - **Host**: `database` (hoặc `systemload-postgres`)
   - **Port**: `5432`
   - **Database**: `systemload`
   - **Username**: `postgres`
   - **Password**: `postgres`

### 6. Services tùy chọn (đã comment out)

Các services sau có thể được kích hoạt bằng cách uncomment trong `docker-compose.yml`:
- **Redis Cache**: localhost:6379
- **Prometheus Monitoring**: http://localhost:9090
- **Grafana Dashboard**: http://localhost:3001

### 7. Dừng hệ thống

Để dừng tất cả services:

```bash
docker-compose down
```

Để dừng và xóa volumes (dữ liệu):

```bash
docker-compose down -v
```

### 8. Rebuild services

Nếu bạn thay đổi code và muốn rebuild:

```bash
docker-compose up --build
```

### 9. Xem logs

Xem logs của một service cụ thể:

```bash
docker-compose logs [service_name]
```

Ví dụ:
```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs database
docker-compose logs pgadmin
```

### Lưu ý

- Lần đầu chạy có thể mất vài phút để download và build các images
- Database sẽ tự động khởi tạo với schema từ `database/init-db.sql` và `database/schema.sql`
- Tất cả services được kết nối qua Docker network `systemload-network`
- Data sẽ được persist trong Docker volumes
- File `docker-compose.yml` chính đã tích hợp các services từ `database/docker-compose.yml` 