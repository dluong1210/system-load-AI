# System Load AI - ML Models Service

FastAPI-based machine learning service sử dụng Facebook Prophet cho time series prediction với multi-model approach.

## 🚀 Overview

- **FastAPI Service**: REST API cho model training và predictions (Port 8010)
- **Facebook Prophet**: Primary ML framework cho time series forecasting  
- **Multi-Model Training**: Automatic 1h/6h/24h specialized models
- **Model Persistence**: JSON serialization với metadata tracking
- **LSTM Support**: PyTorch LSTM models cho advanced scenarios
- **Docker Ready**: Complete containerization với health checks

## 🏗️ Project Structure

```
ml_models/
├── main.py                    
├── requirements.txt           
├── Dockerfile                 
├── docker-compose.yml         
├── scripts/
│   ├── prophet_model.py       
│   └── __init__.py
├── notebook/
└── checkpoints/              # Trained model storage
    ├── *.json                # Prophet model files
    └── *.meta.json           # Model metadata
```

## 🤖 ML Technologies

### Primary: Facebook Prophet

- **Time Series Forecasting**: Specialized cho system metrics
- **Logistic Growth**: With configurable floor/cap values
- **Seasonality**: Daily + weekly patterns
- **Multi-Horizon**: 1h, 6h, 24h specialized models

### Secondary: PyTorch LSTM

- **MultistepLSTM**: 2-layer LSTM architecture
- **4 Features**: CPU%, Memory%, Network Score, Disk Score
- **60-step prediction**: Optimized cho hourly data
- **Retraining**: Incremental learning capabilities

## 📊 FastAPI Service

### Core Endpoints

```http
GET  /                         # Service info
GET  /health                   # Health check
GET  /models                   # List trained models
POST /train                    # Train single model
POST /train_multi_models       # Train 1h/6h/24h models
POST /predict                  # Make predictions
GET  /models/{name}/info       # Model metadata
DELETE /models/{name}          # Delete model
```

### Multi-Model Training

Tự động tạo 3 specialized models:

```python
# Model Configurations
{
    "_1h": {
        "hours_back": 3,
        "sample_interval": 60,      # 60 seconds
        "optimal_for": "Short-term predictions"
    },
    "_6h": {
        "hours_back": 18, 
        "sample_interval": 360,     # 6 minutes
        "optimal_for": "Medium-term planning"
    },
    "_24h": {
        "hours_back": 72,
        "sample_interval": 1440,    # 24 minutes  
        "optimal_for": "Long-term trends"
    }
}
```

## 🛠️ Development

### Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Start FastAPI service
python main.py

# Service available at http://localhost:8010
```

### Docker Development

```bash
# Build container
docker build -t ml-models .

# Run with docker-compose
docker-compose up -d

# Health check
curl http://localhost:8010/health
```

## 📋 Dependencies

**Core Libraries** (`requirements.txt`):
```
prophet          # Facebook Prophet for time series
pandas           # Data manipulation
numpy            # Numerical computing
fastapi          # Web framework
uvicorn          # ASGI server
```

**Additional Libraries** (notebooks):
- `torch` - PyTorch for LSTM models
- `matplotlib` - Visualization
- `jupyter` - Interactive development

## 🔌 API Usage Examples

### 1. Train Multi-Models

```bash
curl -X POST http://localhost:8010/train_multi_models \
  -H "Content-Type: application/json" \
  -d '{
    "csv_filepath": "../data/metrics.csv",
    "metric_name": "cpu_usage_percent", 
    "base_model_name": "cpu_model",
    "cap_value": 100.0,
    "floor_value": 0.0
  }'
```

**Response**: Creates `cpu_model_1h`, `cpu_model_6h`, `cpu_model_24h`

### 2. Make Predictions

```bash
curl -X POST http://localhost:8010/predict \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "cpu_model_1h",
    "future_periods_seconds": 3600,
    "freq_seconds": "S"
  }'
```

### 3. List Available Models

```bash
curl http://localhost:8010/models

# Response
{
  "models": [
    "cpu_model_1h", "cpu_model_6h", "cpu_model_24h",
    "memory_model_1h", "overall_load_score_model_6h"
  ],
  "count": 5
}
```

## 🗄️ Model Storage

### Prophet Models

**JSON Serialization**:
```
checkpoints/
├── cpu_usage_percent_model_1h.json       # Model state
├── cpu_usage_percent_model_1h_137.meta.json  # Metadata
├── memory_usage_percent_model_6h.json
└── overall_load_score_model_24h.json
```

**Metadata Format**:
```json
{
  "model_name": "cpu_model_1h",
  "trained_at": "2024-01-01T10:00:00",
  "data_points": 137,
  "metric_name": "cpu_usage_percent",
  "cap_value": 100.0,
  "floor_value": 0.0,
  "model_type": "1h",
  "hours_back": 3,
  "sample_interval_seconds": 60
}
```

### Data Format Requirements

**CSV Input**:
```csv
Timestamp;CPU usage [%];Memory usage [KB];Network received throughput [KB/s];...
2024-01-01 10:00:00;45.2;1024000;2048;...
```

**Required Columns**:
- `Timestamp` - ISO datetime format
- Metric columns - Configurable metric names
- Semicolon separator (`;`)

## 🔬 Prophet Implementation

### Core Functions (`scripts/prophet_model.py`)

```python
# Data preparation với sampling
load_and_prepare_data_with_sampling(
    csv_filepath, metric_name,
    hours_back, sample_interval_seconds,
    cap_value, floor_value
)

# Model training
train_prophet_model(df_prophet)

# Prediction generation
make_predictions(model, future_periods_seconds, freq_seconds)
```

### Prophet Configuration

```python
Prophet(
    growth='logistic',          # Với floor/cap constraints
    daily_seasonality=True,     # Daily patterns
    weekly_seasonality=True,    # Weekly patterns  
    yearly_seasonality=False    # Disabled cho short-term data
)
```

## 📈 LSTM Alternative

### Architecture (`MultistepLSTM`)

- **Input Shape**: (batch_size, 60, 4) - 60 timesteps, 4 features
- **LSTM Layers**: 2 layers, 64 hidden units each
- **Output Shape**: (batch_size, 60, 4) - 60 future predictions
- **Features**: CPU%, Memory%, Network Score, Disk Score

### Usage Example

```python
# Training
python scripts/train_lstm.py

# Prediction
predictions = predict_future_metrics(
    model, input_data, device, pred_steps=60
)

# Retraining
model = retrain_model_with_new_data(
    'model.pth', 'new_data.csv', device
)
```

## 🐳 Docker Configuration

### Dockerfile Features

```dockerfile
FROM python:3.11-slim
# GCC for Prophet compilation
# Port 8010 exposure
# Health check via HTTP
# uvicorn auto-start
```

### Docker Compose

```yaml
services:
  ml_models:
    build: .
    ports: ["8010:8010"]
    volumes:
      - ../data:/app/data      # Data volume mount
      - ./scripts:/app/scripts # Hot reload scripts
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8010/health"]
      interval: 30s
```

## 🔧 Configuration & Integration

### Backend Integration

**Java Spring Boot connection**:
```yaml
# application.yml
ml.api.url: http://ml_modules:8010
```

**API Endpoints matching**:
- `/api/predictions/train` → `/train_multi_models`
- `/api/predictions/1hour/{model}` → `/predict`
- `/api/predictions/models` → `/models`

### Environment Variables

```bash
PYTHONUNBUFFERED=1     # Docker logging
PORT=8010              # Service port
LOG_LEVEL=INFO         # Logging level
```

## 🧪 Testing & Validation

### Health Monitoring

```bash
# Service health
curl http://localhost:8010/health

# Model validation  
curl http://localhost:8010/models/cpu_model_1h/info

# Prediction test
curl -X POST http://localhost:8010/predict -d '{"model_name":"test"}'
```

### Performance Benchmarks

- **Training Time**: ~2-5 seconds per model (depending on data size)
- **Prediction Speed**: <1 second for 1-hour forecasts
- **Memory Usage**: ~100MB base + ~10MB per trained model
- **Storage**: ~30KB per Prophet model (JSON format)

## 🔄 Workflow Integration

### Complete ML Pipeline

1. **Data Collection** → Backend thu thập metrics
2. **Model Training** → Auto-trigger qua `/train_multi_models`  
3. **Prediction** → Real-time forecasting qua `/predict`
4. **Model Management** → Lifecycle qua REST APIs
5. **Monitoring** → Health checks và metadata tracking

ML service hoạt động như independent microservice, providing enterprise-grade machine learning capabilities cho System Load AI platform!
