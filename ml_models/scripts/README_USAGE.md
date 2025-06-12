# LSTM Model Usage Guide

Hướng dẫn sử dụng các hàm predict và retrain trong LSTM model cho dự đoán system load.

## Tổng quan

File `train_lstm.py` đã được cập nhật với các tính năng mới:

1. **Hàm tính toán load scores** cho disk và network
2. **MultistepDataset** - Dataset class cho time series prediction
3. **MultistepLSTM** - Model architecture cải tiến
4. **Hàm predict** - Dự đoán metrics tương lai
5. **Hàm retrain** - Train lại model với data mới

## Các hàm chính

### 1. Hàm Predict

```python
def predict_future_metrics(model, input_data, device, pred_steps=60):
    """
    Dự đoán system metrics tương lai

    Args:
        model: Trained MultistepLSTM model
        input_data: Input sequence tensor (input_window, 4) hoặc (1, input_window, 4)
        device: Device để chạy inference
        pred_steps: Số bước tương lai cần dự đoán

    Returns:
        predictions: Tensor (pred_steps, 4) chứa predicted metrics
    """
```

**Cách sử dụng:**

```python
# Load model
model = load_model_for_prediction(model_path, device)

# Prepare input data (60 time steps gần nhất)
input_data = prepare_input_data_for_prediction(df, input_window=60)

# Predict 60 steps tương lai
predictions = predict_future_metrics(model, input_data, device, pred_steps=60)
```

### 2. Hàm Retrain

```python
def retrain_model_with_new_data(model_path, new_data_path, device,
                               input_window=60, pred_steps=60,
                               epochs=20, batch_size=32, learning_rate=0.001):
    """
    Train lại model với data mới

    Args:
        model_path: Đường dẫn model hiện tại
        new_data_path: Đường dẫn CSV data mới
        device: Device để train
        input_window: Độ dài input sequence
        pred_steps: Số bước prediction
        epochs: Số epochs training
        batch_size: Batch size
        learning_rate: Learning rate

    Returns:
        model: Model đã được retrain
        train_losses: List training losses
        val_losses: List validation losses
    """
```

**Cách sử dụng:**

```python
# Retrain với data mới
model, train_losses, val_losses = retrain_model_with_new_data(
    model_path='../pytorch_lstm_model.pth',
    new_data_path='../../data/new_metrics.csv',
    device=device,
    epochs=20
)
```

### 3. Hàm tính Load Scores

```python
def calculate_network_load_score(total_network_throughput):
    """Tính network load score từ total throughput (KB/s)"""

def calculate_disk_load_score(total_disk_throughput):
    """Tính disk load score từ total throughput (KB/s)"""
```

**Thresholds:**

- **Network**: 128 KB/s, 1.28 MB/s, 6.4 MB/s, 12.8 MB/s
- **Disk**: 1 MB/s, 10 MB/s, 50 MB/s, 100 MB/s

## Demo Script

File `demo_predict_retrain.py` cung cấp ví dụ đầy đủ về cách sử dụng:

```bash
cd ml_models/scripts
python demo_predict_retrain.py
```

### Chức năng của Demo:

1. **Demo Prediction:**

   - Load trained model
   - Chuẩn bị input data từ CSV
   - Dự đoán 60 steps tương lai
   - Visualize kết quả prediction

2. **Demo Retrain:**
   - Load existing model hoặc tạo mới
   - Train với data mới trong 10 epochs
   - Hiển thị training/validation loss
   - Save model đã retrain

## Data Format

CSV file cần có các columns:

```
Timestamp, CPU usage [%], Memory usage [KB], Memory capacity provisioned [KB],
Network received throughput [KB/s], Network transmitted throughput [KB/s],
Disk read throughput [KB/s], Disk write throughput [KB/s]
```

## Model Architecture

**MultistepLSTM**:

- Input: 4 features (CPU%, Memory%, Network Score, Disk Score)
- LSTM: 2 layers, 64 hidden units
- Output: Predict 60 future time steps cho 4 features
- Total parameters: ~66,800

## Workflow đầy đủ

### 1. Training từ đầu

```python
# Chạy script training chính
python train_lstm.py
```

### 2. Load model để predict

```python
import torch
from train_lstm import load_model_for_prediction, predict_future_metrics

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = load_model_for_prediction('model.pth', device)

# Prepare data và predict
predictions = predict_future_metrics(model, input_data, device)
```

### 3. Retrain với data mới

```python
from train_lstm import retrain_model_with_new_data

model, losses = retrain_model_with_new_data(
    'existing_model.pth',
    'new_data.csv',
    device
)
```

## Kết quả Output

### Prediction Output:

- **Shape**: (pred_steps, 4)
- **Features**: [CPU %, Memory %, Network Score, Disk Score]
- **Range**:
  - CPU, Memory: 0-100%
  - Network, Disk Scores: 0-100

### Retrain Output:

- **Trained model**: Saved to specified path
- **Training history**: Lists of losses
- **Visualizations**: Loss plots

## Tips và Best Practices

1. **Data Quality**: Đảm bảo data không có missing values
2. **Sequence Length**: 60 time steps thường optimal cho hourly data
3. **Prediction Steps**: Không nên predict quá xa (>60 steps)
4. **Retraining**: Retrain định kỳ khi có data mới
5. **Device**: Sử dụng GPU nếu có để tăng tốc độ

## Troubleshooting

### Common Issues:

1. **Model not found**: Chạy training trước khi predict
2. **Data format error**: Kiểm tra column names và separators
3. **Memory issues**: Giảm batch_size hoặc sequence_length
4. **CUDA errors**: Kiểm tra GPU compatibility

### Error Handling:

Tất cả functions đều có error handling và sẽ return None nếu gặp lỗi, kèm theo error messages chi tiết.
