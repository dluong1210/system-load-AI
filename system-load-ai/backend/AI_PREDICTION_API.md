# AI Load Prediction API Documentation

## Overview

The AI Load Prediction Service has been updated to use a multi-model training approach with Facebook Prophet for time series forecasting. For each metric, the system now trains 3 specialized models for different prediction horizons:

- **1-hour prediction model**: Trained on last 3 hours of data with 60-second intervals
- **6-hour prediction model**: Trained on last 18 hours of data with 360-second (6-minute) intervals
- **24-hour prediction model**: Trained on last 72 hours of data with 1440-second (24-minute) intervals

This approach optimizes each model for its specific prediction time horizon, providing more accurate forecasts.

## Model Naming Convention

When training models, the system automatically creates 3 models with suffixes:

- `{base_model_name}_1h` - For 1-hour predictions
- `{base_model_name}_6h` - For 6-hour predictions
- `{base_model_name}_24h` - For 24-hour predictions

## Configuration

Add the following to your `application.properties`:

```properties
# ML Service Configuration
ml.api.url=http://localhost:8010 || http://ml_module:8010
```

## API Endpoints

### 1. Health Check

```
GET /api/predictions/health
```

**Response:**

```json
{
  "status": "UP",
  "mlServiceReady": true,
  "timestamp": 1234567890
}
```

### 2. Get Available Models

```
GET /api/predictions/models
```

**Response:**

```json
{
  "models": [
    "cpu_model_1h",
    "cpu_model_6h",
    "cpu_model_24h",
    "memory_model_1h",
    "memory_model_6h",
    "memory_model_24h"
  ],
  "count": 6,
  "serviceReady": true
}
```

### 3. Train Models (Multi-Model Training)

```
POST /api/predictions/train
Content-Type: application/json

{
  "metricName": "cpu_usage_percent",
  "modelName": "cpu_model"
}
```

**Note**: This will automatically train 3 models: `cpu_model_1h`, `cpu_model_6h`, and `cpu_model_24h`.

**Response:**

```json
{
  "success": true,
  "message": "Model trained successfully",
  "modelName": "cpu_model",
  "metricName": "cpu_usage_percent"
}
```

### 4. Predict 1 Hour Ahead

```
GET /api/predictions/1hour/{baseModelName}
```

**Example:** `GET /api/predictions/1hour/cpu_model`

This automatically uses the `cpu_model_1h` model trained specifically for 1-hour predictions.

### 5. Predict 6 Hours Ahead

```
GET /api/predictions/6hours/{baseModelName}
```

**Example:** `GET /api/predictions/6hours/cpu_model`

This automatically uses the `cpu_model_6h` model trained specifically for 6-hour predictions.

### 6. Predict 24 Hours Ahead

```
GET /api/predictions/24hours/{baseModelName}
```

**Example:** `GET /api/predictions/24hours/cpu_model`

This automatically uses the `cpu_model_24h` model trained specifically for 24-hour predictions.

## Prediction Response Format

```json
{
  "success": true,
  "message": "Success",
  "predictedLoad": 75.5,
  "isAnomaly": false,
  "recommendations": [
    "Moderate system load predicted for 1 hour (75.5%). Monitor resource usage closely."
  ],
  "predictionPeriod": "1 hour",
  "detailedPredictions": [
    {
      "timestamp": "2024-01-01T10:00:00",
      "predicted_value": 70.2,
      "lower_bound": 65.1,
      "upper_bound": 75.3
    },
    {
      "timestamp": "2024-01-01T10:01:00",
      "predicted_value": 71.1,
      "lower_bound": 66.0,
      "upper_bound": 76.2
    }
    // ... more predictions
  ]
}
```

## Training Data Configuration

### 1-Hour Prediction Model

- **Data Range**: Last 3 hours
- **Sampling Interval**: 60 seconds
- **Optimal For**: Short-term, high-frequency predictions
- **Use Case**: Immediate resource scaling decisions

### 6-Hour Prediction Model

- **Data Range**: Last 18 hours
- **Sampling Interval**: 6 minutes (360 seconds)
- **Optimal For**: Medium-term capacity planning
- **Use Case**: Workload scheduling and resource allocation

### 24-Hour Prediction Model

- **Data Range**: Last 72 hours (3 days)
- **Sampling Interval**: 24 minutes (1440 seconds)
- **Optimal For**: Long-term trend analysis
- **Use Case**: Daily planning and anomaly detection

## Supported Metrics for Training

- `cpu_usage_percent` - CPU usage percentage
- `memory_usage_percent` - Memory usage percentage
- `overall_load_score` - Overall system load score
- `cpu_load_score` - CPU load score
- `io_load_score` - I/O load score
- `disk_read_throughput` - Disk read throughput
- `disk_write_throughput` - Disk write throughput
- `network_rx_throughput` - Network receive throughput
- `network_tx_throughput` - Network transmit throughput

## Usage Example

1. **Start the ML service** (Python module):

   ```bash
   cd ml_models
   python main.py
   ```

2. **Train models for a metric** (creates 3 models automatically):

   ```bash
   curl -X POST http://localhost:8080/api/predictions/train \
     -H "Content-Type: application/json" \
     -d '{"metricName": "cpu_usage_percent", "modelName": "cpu_model"}'
   ```

   This creates: `cpu_model_1h`, `cpu_model_6h`, `cpu_model_24h`

3. **Make predictions**:

   ```bash
   # 1 hour prediction (uses cpu_model_1h)
   curl http://localhost:8080/api/predictions/1hour/cpu_model

   # 6 hours prediction (uses cpu_model_6h)
   curl http://localhost:8080/api/predictions/6hours/cpu_model

   # 24 hours prediction (uses cpu_model_24h)
   curl http://localhost:8080/api/predictions/24hours/cpu_model
   ```

## Benefits of Multi-Model Approach

1. **Optimized Accuracy**: Each model is trained on data with the optimal time range and granularity for its prediction horizon
2. **Reduced Overfitting**: Shorter data ranges prevent long-term patterns from interfering with short-term predictions
3. **Better Performance**: Smaller, focused datasets train faster and use less memory
4. **Specialized Features**: Each model can capture patterns most relevant to its time horizon

## Error Handling

The API returns appropriate HTTP status codes:

- `200 OK` - Successful prediction
- `400 Bad Request` - Prediction failed or model not ready
- `404 Not Found` - Model not found (ensure the correct base model name is used)
- `500 Internal Server Error` - Training or prediction service error

## Troubleshooting

### Model Not Found

If you get a "Model not found" error, ensure:

1. The base model has been trained (e.g., train `cpu_model` to create `cpu_model_1h`, `cpu_model_6h`, `cpu_model_24h`)
2. The ML service is running and healthy
3. Sufficient data exists for training (at least 72 hours for 24h models)

## Recommendations Engine

The service analyzes predictions and provides recommendations based on:

- **High Load (>85%)**: Scale up resources
- **Moderate Load (70-85%)**: Monitor closely
- **Normal Load (30-70%)**: Current allocation adequate
- **Low Load (<30%)**: Consider scaling down
- **Trend Analysis**: Increasing/decreasing load patterns
- **Anomaly Detection**: Unusual patterns or spikes

## Prerequisites

1. **Java Backend**: Spring Boot application running
2. **Python ML Service**: FastAPI service with Prophet models
3. **Data**: At least 10 recent metrics for training
4. **Dependencies**: WebFlux for HTTP client communication

## Dependencies Added

```xml
<!-- WebClient for HTTP calls -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
```
