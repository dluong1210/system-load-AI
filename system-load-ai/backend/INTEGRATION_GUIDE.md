# System Load AI - Backend Integration Guide

## Tổng quan

Backend Java Spring Boot này được thiết kế để:

1. **Lấy metrics từ mock server** mỗi 30 giây
2. **Lưu trữ metrics** vào PostgreSQL database
3. **Phân tích và dự đoán** system load bằng AI (Weka ML)
4. **Cung cấp REST APIs** cho frontend và monitoring

## Kiến trúc

```
Mock Server (Python) → Backend (Java) → Database (PostgreSQL)
     ↓                       ↓               ↓
   Metrics              AI Prediction    Historical Data
```

## Setup & Chạy

### 1. Yêu cầu

- Java 11+
- PostgreSQL database
- Mock server đang chạy trên `localhost:8000`

### 2. Cấu hình Database

```sql
-- Tạo database
CREATE DATABASE systemload;

-- Tạo user (optional)
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE systemload TO postgres;
```

### 3. Chạy Backend

```bash
cd system-load-ai/backend
mvn spring-boot:run
```

## API Endpoints

### 📊 Metrics Collection

#### GET `/api/system-load/current`

Lấy metrics hiện tại từ mock server

```json
{
  "success": true,
  "data": {
    "cpuUsagePercent": 45.2,
    "memoryUsagePercent": 67.8,
    "diskReadThroughputKbs": 1024.5,
    "diskWriteThroughputKbs": 512.3,
    "networkReceivedThroughputKbs": 2048.1,
    "networkTransmittedThroughputKbs": 1536.7,
    "overallLoadScore": 56.3
  },
  "timestamp": 1703123456789
}
```

#### POST `/api/system-load/collect`

Thu thập và lưu metrics vào database

```json
{
  "success": true,
  "message": "Metrics collected and stored successfully",
  "data": {
    /* SystemMetrics object */
  }
}
```

#### GET `/api/system-load/history?hours=24`

Lấy lịch sử metrics (mặc định 24h)

```json
{
  "success": true,
  "data": [
    /* array of SystemMetrics */
  ],
  "count": 2880,
  "hours": 24
}
```

### 🤖 AI Prediction

#### GET `/api/system-load/predict`

Dự đoán system load hiện tại

```json
{
  "success": true,
  "message": "Success",
  "currentMetrics": {
    /* current metrics */
  },
  "prediction": {
    "predictedLoad": 78.5,
    "isAnomaly": false,
    "recommendations": [
      "High CPU usage detected. Consider optimizing CPU-intensive processes."
    ],
    "timestamp": 1703123456789
  }
}
```

#### POST `/api/system-load/train`

Train AI models thủ công

```json
{
  "success": true,
  "message": "AI models trained successfully",
  "modelTrained": true
}
```

### 📈 Analytics

#### GET `/api/system-load/stats?hours=24`

Thống kê system load

```json
{
  "success": true,
  "stats": {
    "averageLoad": 45.3,
    "highLoadPeriodsCount": 5,
    "totalDataPoints": 2880,
    "modelTrained": true,
    "connectionHealthy": true,
    "hoursAnalyzed": 24
  },
  "highLoadPeriods": [
    /* high load periods */
  ]
}
```

#### GET `/api/system-load/health`

Health check backend và mock server

```json
{
  "status": "healthy",
  "mockServerConnection": true,
  "aiModelsReady": true,
  "timestamp": 1703123456789
}
```

## Automatic Features

### 🔄 Scheduled Tasks

1. **Metrics Collection**: Mỗi 30 giây tự động lấy metrics từ mock server
2. **Data Cleanup**: Mỗi ngày 2h sáng xóa data cũ (>30 ngày)
3. **Model Training**: Tự động train models khi có đủ data

### 🧠 AI Features

1. **Load Prediction**: Dự đoán system load dựa trên patterns
2. **Anomaly Detection**: Phát hiện bất thường trong hệ thống
3. **Smart Recommendations**: Đưa ra khuyến nghị tối ưu hóa

## Configuration

File: `src/main/resources/application.yml`

```yaml
# Mock server configuration
mock:
  server:
    url: http://localhost:8000

# Metrics collection configuration
metrics:
  collection:
    enabled: true
    interval: 30000 # 30 seconds
```

## Database Schema

```sql
-- SystemMetrics table
CREATE TABLE system_metrics (
    id BIGSERIAL PRIMARY KEY,
    timestamp BIGINT,
    collected_at TIMESTAMP,

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
```

## Testing

### 1. Test Mock Server Connection

```bash
curl http://localhost:8080/api/system-load/health
```

### 2. Collect Metrics Manually

```bash
curl -X POST http://localhost:8080/api/system-load/collect
```

### 3. Get Prediction

```bash
curl http://localhost:8080/api/system-load/predict
```

### 4. Train Models

```bash
curl -X POST http://localhost:8080/api/system-load/train
```

## Troubleshooting

### Common Issues

1. **Mock server connection failed**

   - Đảm bảo mock server chạy trên `localhost:8000`
   - Check health: `curl http://localhost:8000/health`

2. **Database connection error**

   - Kiểm tra PostgreSQL đang chạy
   - Verify connection string trong `application.yml`

3. **AI models not trained**
   - Cần ít nhất 10 data points để train
   - Chạy system 5-10 phút để collect đủ data
   - Manual train: `POST /api/system-load/train`

### Logs

Check logs: `logs/system-load-ai.log`

```bash
tail -f logs/system-load-ai.log
```

## Monitoring

- **Prometheus metrics**: `http://localhost:8080/actuator/prometheus`
- **Health endpoint**: `http://localhost:8080/actuator/health`
- **Application info**: `http://localhost:8080/actuator/info`

## Integration với Frontend

Frontend có thể sử dụng các endpoints để:

1. Hiển thị real-time metrics
2. Show predictions và recommendations
3. Vẽ charts từ historical data
4. Display system health status

Ví dụ JavaScript:

```javascript
// Get current metrics
fetch("/api/system-load/current")
  .then((response) => response.json())
  .then((data) => {
    if (data.success) {
      console.log("Current load:", data.data.overallLoadScore);
    }
  });

// Get prediction
fetch("/api/system-load/predict")
  .then((response) => response.json())
  .then((data) => {
    if (data.success) {
      console.log("Predicted load:", data.prediction.predictedLoad);
      console.log("Recommendations:", data.prediction.recommendations);
    }
  });
```
