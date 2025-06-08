# System Load AI Backend

Backend service thu thập metrics mỗi 1 giây từ mock-server và cung cấp API real-time.

## 🚀 Features

- **Auto Collection**: Thu thập metrics mỗi 1 giây từ mock-server
- **Database Storage**: Lưu trữ PostgreSQL cho persistence
- **Smart Current**: API `/current` lấy từ DB, fallback mock-server
- **AI Prediction**: Load prediction based on collected data

## 📊 API Endpoints

```http
GET /api/system-load/current[?direct=true]  # Current metrics
GET /api/system-load/latest[?limit=10]      # Latest N metrics
GET /api/system-load/history[?hours=24]     # Historical data
GET /api/system-load/predict                # AI prediction
GET /api/system-load/stats                  # Collection stats
GET /api/system-load/health                 # Health check
POST /api/system-load/collect               # Manual collect
POST /api/system-load/train                 # Train AI models
```

## 🏃‍♂️ Quick Start

```bash
# Prerequisites
docker run -d -p 5432:5432 -e POSTGRES_DB=systemload -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres postgres:13

# Run mock-server
cd ../mock-server && python app.py

# Run backend
mvn spring-boot:run
```

## ⚙️ Configuration

```yaml
metrics:
  collection:
    enabled: true
    interval: 1000 # 1 second

mock:
  server:
    url: http://localhost:8000
```

Backend sẽ tự động:

- Thu thập metrics mỗi giây
- Lưu vào database
- Serve qua REST API
- Clean up data cũ (> 30 ngày)
