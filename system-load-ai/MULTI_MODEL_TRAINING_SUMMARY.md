# Multi-Model Training System - Implementation Summary

## Tổng quan thay đổi

Hệ thống đã được cập nhật để train 3 model khác nhau cho mỗi metric, mỗi model được tối ưu hóa cho một khoảng thời gian dự đoán cụ thể:

### 1. Model cho dự đoán 1 giờ (`_1h`)

- **Dữ liệu training**: 3 giờ gần nhất
- **Tần suất sampling**: 60 giây
- **Mục đích**: Dự đoán ngắn hạn với độ chi tiết cao
- **Use case**: Scaling tức thì, phản ứng nhanh với spike

### 2. Model cho dự đoán 6 giờ (`_6h`)

- **Dữ liệu training**: 18 giờ gần nhất
- **Tần suất sampling**: 360 giây (6 phút)
- **Mục đích**: Dự đoán trung hạn cân bằng
- **Use case**: Lập kế hoạch capacity, scheduling workload

### 3. Model cho dự đoán 24 giờ (`_24h`)

- **Dữ liệu training**: 72 giờ gần nhất
- **Tần suất sampling**: 1440 giây (24 phút)
- **Mục đích**: Phân tích xu hướng dài hạn
- **Use case**: Lập kế hoạch hàng ngày, phát hiện anomaly

## Files đã thay đổi

### 1. `ml_models/scripts/prophet_model.py`

- **Thêm**: Hàm `load_and_prepare_data_with_sampling()`
- **Chức năng**: Load dữ liệu với khoảng thời gian và tần suất sampling tùy chỉnh
- **Tham số**:
  - `hours_back`: Số giờ lấy dữ liệu từ quá khứ
  - `sample_interval_seconds`: Khoảng cách giữa các data point (giây)

### 2. `ml_models/main.py`

- **Thêm**: Classes mới cho multi-model training
  - `MultiModelTrainingRequest`: Request cho training nhiều model
  - `MultiModelTrainingResponse`: Response chứa kết quả training
- **Thêm**: Endpoint `/train_multi_models`
- **Chức năng**: Train đồng thời 3 model với cấu hình khác nhau

### 3. `backend/src/main/java/com/systemload/service/AILoadPredictionService.java`

- **Cập nhật**: Method `trainModel()` sử dụng endpoint mới
- **Thêm**: Classes Java tương ứng cho multi-model training
- **Cập nhật**: Logic prediction để chọn đúng model cho từng horizon:
  - `predict1Hour()` → sử dụng `modelName_1h`
  - `predict6Hours()` → sử dụng `modelName_6h`
  - `predict24Hours()` → sử dụng `modelName_24h`

### 4. `backend/AI_PREDICTION_API.md`

- **Cập nhật**: Documentation giải thích hệ thống multi-model
- **Thêm**: Hướng dẫn sử dụng và troubleshooting
- **Thêm**: Giải thích lợi ích của approach mới

## Quy trình hoạt động

```
1. Train Model Request → base_name = "cpu_model"
   ↓
2. System tự động tạo 3 models:
   - cpu_model_1h (3h data, 60s interval)
   - cpu_model_6h (18h data, 360s interval)
   - cpu_model_24h (72h data, 1440s interval)
   ↓
3. Prediction Request → /1hour/cpu_model
   ↓
4. System tự động chọn cpu_model_1h
   ↓
5. Trả về kết quả dự đoán 1 giờ
```

## Lợi ích của hệ thống mới

### 1. **Độ chính xác cao hơn**

- Mỗi model được train trên dữ liệu phù hợp với horizon dự đoán
- Giảm noise từ dữ liệu không liên quan

### 2. **Performance tốt hơn**

- Dataset nhỏ hơn → train nhanh hơn
- Ít memory usage
- Response time nhanh hơn

### 3. **Tối ưu hóa cho từng use case**

- Model 1h: Phát hiện pattern ngắn hạn
- Model 6h: Cân bằng giữa chi tiết và trend
- Model 24h: Nắm bắt chu kỳ dài hạn

### 4. **Giảm overfitting**

- Dữ liệu ít hơn → model không học pattern không cần thiết
- Tập trung vào pattern liên quan đến timeframe cụ thể

## API Changes

### Training Request (OLD)

```json
{
  "metricName": "cpu_usage_percent",
  "modelName": "cpu_model"
}
```

→ Tạo 1 model: `cpu_model`

### Training Request (NEW)

```json
{
  "metricName": "cpu_usage_percent",
  "modelName": "cpu_model"
}
```

→ Tạo 3 models: `cpu_model_1h`, `cpu_model_6h`, `cpu_model_24h`

### Prediction Request (Unchanged)

```
GET /api/predictions/1hour/cpu_model
GET /api/predictions/6hours/cpu_model
GET /api/predictions/24hours/cpu_model
```

→ Tự động chọn đúng model tương ứng

## Testing và Validation

### 1. Python Syntax Check

```bash
✓ main.py - Compiled successfully
✓ prophet_model.py - Compiled successfully
```

### 2. Endpoint Validation

- `/train_multi_models` - Train 3 models đồng thời
- `/predict` - Sử dụng model phù hợp với prediction horizon

### 3. Model Naming Convention

- Base model: `metric_name`
- 1h model: `metric_name_1h`
- 6h model: `metric_name_6h`
- 24h model: `metric_name_24h`

## Hướng dẫn sử dụng

### 1. Train models cho một metric

```bash
curl -X POST http://localhost:8080/api/predictions/train \
  -H "Content-Type: application/json" \
  -d '{"metricName": "cpu_usage_percent", "modelName": "cpu_model"}'
```

### 2. Kiểm tra models đã được tạo

```bash
curl http://localhost:8080/api/predictions/models
```

→ Sẽ thấy: `cpu_model_1h`, `cpu_model_6h`, `cpu_model_24h`

### 3. Thực hiện predictions

```bash
# 1 hour prediction (sử dụng cpu_model_1h)
curl http://localhost:8080/api/predictions/1hour/cpu_model

# 6 hours prediction (sử dụng cpu_model_6h)
curl http://localhost:8080/api/predictions/6hours/cpu_model

# 24 hours prediction (sử dụng cpu_model_24h)
curl http://localhost:8080/api/predictions/24hours/cpu_model
```

## Backward Compatibility

Hệ thống mới hoàn toàn backward compatible:

- API endpoints không thay đổi
- Request/Response format không thay đổi
- Chỉ thay đổi cách train và chọn model bên trong

## Next Steps

1. **Monitor performance**: So sánh độ chính xác giữa hệ thống cũ và mới
2. **Optimize parameters**: Fine-tune sampling intervals và data ranges
3. **Add metrics**: Thêm monitoring cho từng model riêng biệt
4. **Auto-retraining**: Implement tự động retrain models định kỳ
