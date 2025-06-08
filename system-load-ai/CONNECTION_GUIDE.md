# Hướng dẫn kết nối Frontend và Backend

## Tổng quan

Hệ thống bao gồm 3 thành phần chính:

- **Backend**: Spring Boot API (Port 8080)
- **Frontend**: React + Vite (Port 3000)
- **Mock Server**: Python server tạo dữ liệu giả (Port 8000)
- **Database**: PostgreSQL + Redis

## Cách chạy hệ thống

### 1. Khởi động Database

```bash
cd database
docker-compose up -d
```

### 2. Khởi động Mock Server (tùy chọn)

```bash
cd mock-server
python app.py
```

### 3. Khởi động Backend

```bash
cd backend
# Sử dụng Maven
mvn spring-boot:run
# Hoặc sử dụng script
./run-backend.bat
```

### 4. Khởi động Frontend

```bash
cd frontend
npm install
npm run dev
```

## Endpoints API

### Backend (http://localhost:8080/api/system-load)

| Method | Endpoint            | Mô tả                               |
| ------ | ------------------- | ----------------------------------- |
| GET    | `/current`          | Lấy metrics hiện tại từ mock server |
| POST   | `/collect`          | Thu thập và lưu metrics             |
| GET    | `/history?hours=24` | Lấy lịch sử metrics                 |
| GET    | `/predict`          | Dự đoán tải hệ thống                |
| POST   | `/train`            | Huấn luyện AI models                |
| GET    | `/stats?hours=24`   | Thống kê hệ thống                   |
| GET    | `/health`           | Kiểm tra health                     |

### Frontend (http://localhost:3000)

Frontend có proxy được cấu hình để tự động chuyển tiếp requests `/api/*` tới backend.

## Test kết nối

### Sử dụng component SystemConnection

1. Mở browser và truy cập `http://localhost:3000`
2. Import và sử dụng component `SystemConnection`:

```tsx
import SystemConnection from "./components/SystemConnection";

function App() {
  return (
    <div className="App">
      <SystemConnection />
    </div>
  );
}
```

### Test bằng cURL

```bash
# Test backend health
curl http://localhost:8080/api/system-load/health

# Test current metrics
curl http://localhost:8080/api/system-load/current

# Test collect metrics
curl -X POST http://localhost:8080/api/system-load/collect
```

## Cấu hình

### Frontend API Configuration

File: `frontend/src/services/api.ts`

```typescript
const API_BASE_URL = "http://localhost:8080/api";
```

### Vite Proxy Configuration

File: `frontend/vite.config.ts`

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true,
    secure: false,
  }
}
```

## Troubleshooting

### Lỗi kết nối Database

- Kiểm tra Docker containers: `docker ps`
- Khởi động lại database: `cd database && docker-compose restart`

### Lỗi kết nối Mock Server

- Backend sẽ hoạt động mà không cần mock server (sẽ có warning logs)
- Có thể tạo mock data trong database thay vì dùng mock server

### Frontend không kết nối được Backend

1. Kiểm tra backend đang chạy trên port 8080
2. Kiểm tra proxy configuration trong `vite.config.ts`
3. Mở Developer Tools để xem network requests

### CORS Issues

- Backend đã cấu hình `@CrossOrigin(origins = "*")`
- Nếu vẫn có lỗi, thêm cấu hình CORS global:

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:3000")
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowCredentials(true);
    }
}
```

## Monitoring

### Health Check Endpoints

- Backend: `http://localhost:8080/api/system-load/health`
- Actuator: `http://localhost:8080/actuator/health`

### Logs

- Backend logs: `backend/logs/system-load-ai.log`
- Frontend: Developer Console
- Database: Docker logs `docker logs <container_id>`

## Development Tips

1. **Hot Reload**: Cả frontend và backend đều hỗ trợ hot reload
2. **API Testing**: Sử dụng component `SystemConnection` để test nhanh
3. **Database**: Sử dụng pgAdmin hoặc database tools để xem dữ liệu
4. **Monitoring**: Kiểm tra `/actuator/metrics` cho Prometheus metrics
