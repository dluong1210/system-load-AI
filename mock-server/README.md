# System Load Mock Server

Mock server đơn giản để expose Prometheus metrics cho **server chính** scrape và lấy dữ liệu tải hệ thống giả lập.

## 🎯 Mục Đích

Mock server này được thiết kế để:

- Expose Prometheus metrics endpoint (`/metrics`)
- Server chính có thể cấu hình Prometheus để scrape metrics từ mock server này
- Cung cấp dữ liệu system load giả lập realistic dựa trên CSV data gốc

## 🚀 Tính Năng

- **Lightweight FastAPI Server**: Chỉ expose metrics endpoint
- **Prometheus Metrics**: Standard Prometheus format
- **Realistic Data**: Dựa trên patterns từ CSV data thực tế
- **Auto-refresh**: Metrics tự động update mỗi lần scrape

## 📊 Metrics Được Expose

Tất cả metrics tương ứng với cấu trúc CSV gốc:

### CPU Metrics

- `system_cpu_usage_percent` - CPU usage %
- `system_cpu_usage_mhz` - CPU usage in MHz
- `system_cpu_cores` - Number of CPU cores (4)
- `system_cpu_capacity_mhz` - CPU capacity in MHz (11703.99824)

### Memory Metrics

- `system_memory_usage_kb` - Memory usage in KB
- `system_memory_capacity_kb` - Memory capacity in KB (67108864)

### Disk I/O Metrics

- `system_disk_read_throughput_kbs` - Disk read throughput KB/s
- `system_disk_write_throughput_kbs` - Disk write throughput KB/s

### Network I/O Metrics

- `system_network_received_throughput_kbs` - Network RX throughput KB/s
- `system_network_transmitted_throughput_kbs` - Network TX throughput KB/s

### System Metrics

- `system_timestamp_ms` - Current timestamp in milliseconds
- `mock_server_uptime_seconds` - Mock server uptime

### HTTP Metrics

- `http_requests_total` - Total HTTP requests with labels
- `http_request_duration_seconds` - HTTP request duration histogram

## 🛠️ Cài Đặt và Chạy

### Phương Pháp 1: Docker (Khuyến nghị)

```bash
# Di chuyển vào thư mục mock-server
cd system-load-ai/mock-server

# Chạy mock server
docker-compose up -d mock-server

# Hoặc dùng script
./start.sh        # Linux/macOS
start.bat         # Windows
```

### Phương Pháp 2: Python Trực Tiếp

```bash
# Cài đặt dependencies
pip install -r requirements.txt

# Chạy server
python app.py
```

## 🔧 Cấu Hình Server Chính

### 1. Cập nhật Prometheus Config của Server Chính

Thêm job này vào `prometheus.yml` của server chính:

```yaml
scrape_configs:
  # System Load Mock Server
  - job_name: "system-load-mock"
    static_configs:
      - targets: ["localhost:8000"] # Thay đổi IP nếu cần
    metrics_path: "/metrics"
    scrape_interval: 5s
    scrape_timeout: 5s
```

### 2. Query Metrics từ Server Chính

Server chính có thể query metrics như:

```
# CPU usage
system_cpu_usage_percent

# Memory usage
system_memory_usage_kb

# Disk I/O
rate(system_disk_read_throughput_kbs[5m])
rate(system_disk_write_throughput_kbs[5m])

# Network I/O
rate(system_network_received_throughput_kbs[5m])
rate(system_network_transmitted_throughput_kbs[5m])
```

## 🌐 Endpoints

- **`/metrics`** - Prometheus metrics endpoint (chính)
- **`/health`** - Health check
- **`/`** - Server info
- **`/metrics/current`** - Debug metrics in JSON format

## 📊 Test Metrics

```bash
# Test Prometheus endpoint
curl http://localhost:8000/metrics

# Test health
curl http://localhost:8000/health

# Debug current metrics
curl http://localhost:8000/metrics/current
```

## 🔍 Sử Dụng trong Server Chính

### Example: Query từ Python

```python
import requests
from prometheus_client.parser import text_string_to_metric_families

# Get metrics from mock server
response = requests.get('http://localhost:8000/metrics')
metrics = text_string_to_metric_families(response.text)

for family in metrics:
    for sample in family.samples:
        print(f"{sample.name}: {sample.value}")
```

### Example: PromQL Queries

```promql
# Average CPU usage over 5 minutes
avg_over_time(system_cpu_usage_percent[5m])

# Peak memory usage
max_over_time(system_memory_usage_kb[1h])

# Network utilization rate
rate(system_network_received_throughput_kbs[5m])
```

## 🚀 Production Deployment

### Docker Compose cho Production

```yaml
services:
  mock-server:
    image: your-registry/system-load-mock:latest
    ports:
      - "8000:8000"
    restart: unless-stopped
    healthcheck:
      test:
        [
          "CMD",
          "python",
          "-c",
          "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')",
        ]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: system-load-mock
spec:
  replicas: 1
  selector:
    matchLabels:
      app: system-load-mock
  template:
    metadata:
      labels:
        app: system-load-mock
    spec:
      containers:
        - name: mock-server
          image: your-registry/system-load-mock:latest
          ports:
            - containerPort: 8000
---
apiVersion: v1
kind: Service
metadata:
  name: system-load-mock-service
spec:
  selector:
    app: system-load-mock
  ports:
    - port: 8000
      targetPort: 8000
```

## 🐛 Troubleshooting

### Check if Mock Server is Running

```bash
curl http://localhost:8000/health
```

### Check Metrics Format

```bash
curl http://localhost:8000/metrics | head -20
```

### Check Docker Logs

```bash
docker-compose logs -f mock-server
```

### Test Prometheus Scraping

```bash
# From your main server, test if it can reach mock server
curl http://mock-server-ip:8000/metrics
```

## 💡 Tips

1. **Network**: Đảm bảo server chính có thể reach được mock server
2. **Firewall**: Mở port 8000 nếu cần
3. **Monitoring**: Monitor mock server uptime với `mock_server_uptime_seconds`
4. **Load**: Mock server rất nhẹ, có thể chạy trên resource thấp

---

**Mock server sẵn sàng cho server chính scrape! 🎯**
