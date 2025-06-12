# System Load AI Backend

Backend service sử dụng Spring Boot để thu thập metrics từ mock-server và cung cấp AI prediction với multi-model approach.

## 🚀 Overview

- **Auto Collection**: Thu thập metrics mỗi giây từ mock-server
- **Database Storage**: Lưu trữ PostgreSQL với tự động cleanup (>30 ngày)
- **AI Prediction**: Multi-model Prophet với 3 time horizons (1h, 6h, 24h)
- **REST APIs**: Real-time metrics, predictions, và analytics
- **Health Monitoring**: System health check và anomaly detection

## 🏃‍♂️ Quick Start

### Prerequisites

```bash
# 1. Start PostgreSQL
docker run -d -p 5432:5432 -e POSTGRES_DB=systemload -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres postgres:13

# 2. Start mock-server
cd ../mock-server && python app.py

# 3. Start ML service (cho AI predictions)
cd ../ml_models && python main.py
```

### Run Backend

```bash
# Build và run
mvn spring-boot:run

# Or với Docker
docker build -t system-load-backend .
docker run -p 8080:8080 system-load-backend
```

Backend tự động:
- Thu thập metrics mỗi 30 giây
- Lưu vào PostgreSQL database
- Train AI models khi có đủ data (>10 points)
- Clean up data cũ mỗi ngày 2h sáng

## 📊 API Endpoints

### Metrics Collection

```http
GET  /api/system-load/current[?direct=true]  # Current metrics
GET  /api/system-load/latest[?limit=10]      # Latest N metrics
GET  /api/system-load/history[?hours=24]     # Historical data
POST /api/system-load/collect               # Manual collect
```

### AI Predictions

```http
GET  /api/system-load/predict                # Basic prediction
GET  /api/predictions/1hour/{modelName}      # 1-hour prediction
GET  /api/predictions/6hours/{modelName}     # 6-hour prediction  
GET  /api/predictions/24hours/{modelName}    # 24-hour prediction
POST /api/predictions/train                  # Train AI models
GET  /api/predictions/models                 # List models
```

### Analytics & Health

```http
GET  /api/system-load/stats[?hours=24]       # Statistics
GET  /api/system-load/health                 # Health check
GET  /api/predictions/health                 # ML service health
```

## 🤖 AI/ML Features

### Multi-Model Training

Hệ thống tự động tạo 3 models cho mỗi metric:

- **`{model}_1h`**: Train trên 3h gần nhất, interval 60s → dự đoán 1h
- **`{model}_6h`**: Train trên 18h gần nhất, interval 6m → dự đoán 6h  
- **`{model}_24h`**: Train trên 72h gần nhất, interval 24m → dự đoán 24h

### Training Example

```bash
# Train models cho CPU (tạo cpu_model_1h, cpu_model_6h, cpu_model_24h)
curl -X POST http://localhost:8080/api/predictions/train \
  -H "Content-Type: application/json" \
  -d '{"metricName": "cpu_usage_percent", "modelName": "cpu_model"}'

# Get predictions
curl http://localhost:8080/api/predictions/1hour/cpu_model
curl http://localhost:8080/api/predictions/6hours/cpu_model  
curl http://localhost:8080/api/predictions/24hours/cpu_model
```

### Supported Metrics

- `cpu_usage_percent` - CPU usage percentage
- `memory_usage_percent` - Memory usage percentage
- `overall_load_score` - Overall system load score
- `disk_read_throughput` / `disk_write_throughput` - Disk I/O
- `network_rx_throughput` / `network_tx_throughput` - Network I/O

### Recommendations Engine

AI tự động phân tích và đưa ra khuyến nghị:

- **High Load (>85%)**: Scale up resources
- **Moderate Load (70-85%)**: Monitor closely  
- **Normal Load (30-70%)**: Current allocation adequate
- **Low Load (<30%)**: Consider scaling down
- **Anomaly Detection**: Phát hiện patterns bất thường

## ⚙️ Configuration

File: `src/main/resources/application.yml`

```yaml
# Mock server connection
mock:
  server:
    url: http://localhost:8000

# ML service connection  
ml:
  api:
    url: http://localhost:8010

# Metrics collection
metrics:
  collection:
    enabled: true
    interval: 30000 # 30 seconds

# Database
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/systemload
    username: postgres
    password: postgres
```

## 🗄️ Database Schema

```sql
CREATE TABLE system_metrics (
    id BIGSERIAL PRIMARY KEY,
    timestamp BIGINT,
    collected_at TIMESTAMP,
    
    -- CPU & Memory
    cpu_usage_percent DOUBLE PRECISION,
    memory_usage_percent DOUBLE PRECISION,
    
    -- I/O Throughput
    disk_read_throughput_kbs DOUBLE PRECISION,
    disk_write_throughput_kbs DOUBLE PRECISION,
    network_received_throughput_kbs DOUBLE PRECISION,
    network_transmitted_throughput_kbs DOUBLE PRECISION,
    
    -- Load Scores (computed for AI)
    cpu_load_score DOUBLE PRECISION,
    io_load_score DOUBLE PRECISION,
    overall_load_score DOUBLE PRECISION
);
```

## 🧪 Testing

### Basic Health Check

```bash
# Backend health
curl http://localhost:8080/api/system-load/health

# ML service health  
curl http://localhost:8080/api/predictions/health
```

### Manual Operations

```bash
# Collect metrics manually
curl -X POST http://localhost:8080/api/system-load/collect

# Get current metrics
curl http://localhost:8080/api/system-load/current

# Get prediction
curl http://localhost:8080/api/system-load/predict

# Train models manually
curl -X POST http://localhost:8080/api/system-load/train
```

### Example Response

```json
{
  "success": true,
  "data": {
    "cpuUsagePercent": 45.2,
    "memoryUsagePercent": 67.8,
    "overallLoadScore": 56.3
  },
  "prediction": {
    "predictedLoad": 75.5,
    "isAnomaly": false,
    "recommendations": [
      "Moderate system load predicted. Monitor resource usage closely."
    ]
  }
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Mock server connection failed**
   ```bash
   # Check mock server
   curl http://localhost:8000/health
   ```

2. **AI models not ready**
   - Cần ít nhất 10 data points để train
   - Chạy system 5-10 phút để collect đủ data
   - Manual train: `POST /api/system-load/train`

3. **Database connection error**
   - Kiểm tra PostgreSQL đang chạy
   - Verify connection trong `application.yml`

### Monitoring

- **Application logs**: `logs/system-load-ai.log`
- **Health check**: `http://localhost:8080/actuator/health`
- **Metrics**: `http://localhost:8080/actuator/prometheus`

```bash
# View logs
tail -f logs/system-load-ai.log
```

## 🔗 Integration

### Frontend Integration

```javascript
// Get current metrics
const response = await fetch('/api/system-load/current');
const data = await response.json();

// Get AI prediction
const prediction = await fetch('/api/system-load/predict');
const predictionData = await prediction.json();

console.log('Current load:', data.data.overallLoadScore);
console.log('Predicted load:', predictionData.prediction.predictedLoad);
console.log('Recommendations:', predictionData.prediction.recommendations);
```

### System Architecture

```
Mock Server (Python) → Backend (Java Spring Boot) → Database (PostgreSQL)
                            ↓
                     ML Service (Python Prophet)
                            ↓  
                    Frontend (React/Vue/Angular)
```

Backend hoạt động như trung tâm xử lý, kết nối tất cả các components và cung cấp unified API cho frontend.
