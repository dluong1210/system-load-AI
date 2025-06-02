# AI/ML Models

This directory contains the source code and related documents for the AI/ML models.

## Technologies

- Facebook Prophet
- TensorFlow/Keras
- LSTM
- XGBoost

## Structure

- **/scripts**: Contains Python scripts for model training, evaluation, and prediction.
- **/notebooks**: Jupyter notebooks for experimentation and analysis (optional).
- **/data**: Sample data or links to data sources for training and testing.
- `requirements.txt`: Python dependencies for the ML models.

## Integration

The Python models in this directory can be integrated with the Java backend. This can be achieved by:

1.  Creating a small Python API server (e.g., using Flask or FastAPI) that the Java backend calls.
2.  Executing Python scripts directly from Java (less robust for complex interactions).
3.  Using a message queue for communication between Java and Python services.
