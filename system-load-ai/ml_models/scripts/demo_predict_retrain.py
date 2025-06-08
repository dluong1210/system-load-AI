"""
Demo script showing how to use predict and retrain functions for LSTM model
"""

import torch
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from train_lstm import (
    MultistepLSTM, 
    MultistepDataset,
    predict_future_metrics,
    retrain_model_with_new_data,
    load_model_for_prediction,
    calculate_network_load_score,
    calculate_disk_load_score
)

def prepare_input_data_for_prediction(df, input_window=60):
    """
    Prepare input data for prediction from raw DataFrame
    
    Args:
        df: DataFrame with system metrics
        input_window: Length of input sequence
    
    Returns:
        input_tensor: Tensor ready for prediction
    """
    # Calculate total throughput
    df['Total Network Throughput [KB/s]'] = df['Network received throughput [KB/s]'] + df['Network transmitted throughput [KB/s]']
    df['Total Disk Throughput [KB/s]'] = df['Disk read throughput [KB/s]'] + df['Disk write throughput [KB/s]']

    # Calculate load scores
    disk_throughput = df['Total Disk Throughput [KB/s]'].apply(calculate_disk_load_score)
    network_throughput = df['Total Network Throughput [KB/s]'].apply(calculate_network_load_score)

    # Calculate memory usage percentage
    memory_usage = df['Memory usage [KB]'] / df['Memory capacity provisioned [KB]'] * 100
    cpu_usage = df['CPU usage [%]']

    # Convert to tensors
    memory_usage = torch.tensor(memory_usage.values, dtype=torch.float32).unsqueeze(1)
    cpu_usage = torch.tensor(cpu_usage.values, dtype=torch.float32).unsqueeze(1)
    disk_throughput = torch.tensor(disk_throughput.values, dtype=torch.float32).unsqueeze(1)
    network_throughput = torch.tensor(network_throughput.values, dtype=torch.float32).unsqueeze(1)
    
    data = torch.cat([cpu_usage, memory_usage, network_throughput, disk_throughput], dim=1)  # shape (N, 4)
    
    # Take the last input_window points for prediction
    if len(data) >= input_window:
        input_tensor = data[-input_window:]  # Shape: (input_window, 4)
    else:
        print(f"Warning: Not enough data points. Need {input_window}, got {len(data)}")
        # Pad with zeros if not enough data
        padding = torch.zeros(input_window - len(data), 4)
        input_tensor = torch.cat([padding, data], dim=0)
    
    return input_tensor

def demo_prediction():
    """
    Demo function showing how to make predictions with trained model
    """
    print("=== PREDICTION DEMO ===")
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # Model parameters
    model_path = '../pytorch_lstm_system_load_model_multioutput.pth'
    data_path = '../../data/mock-metrics/2.csv'
    
    # Load model
    model = load_model_for_prediction(model_path, device)
    if model is None:
        print("Failed to load model. Please train a model first.")
        return
    
    # Load and prepare data
    try:
        df = pd.read_csv(data_path, delimiter=';')
        df.columns = [col.strip() for col in df.columns]
        print(f"Loaded data with shape: {df.shape}")
    except Exception as e:
        print(f"Error loading data: {e}")
        return
    
    # Prepare input data (last 60 time steps)
    input_data = prepare_input_data_for_prediction(df, input_window=60)
    print(f"Input data shape: {input_data.shape}")
    
    # Make prediction
    pred_steps = 60
    predictions = predict_future_metrics(model, input_data, device, pred_steps=pred_steps)
    
    print(f"Predictions shape: {predictions.shape}")
    print(f"Predicted next {pred_steps} steps:")
    print("Features: [CPU %, Memory %, Network Score, Disk Score]")
    
    # Show some prediction samples
    for i in range(min(5, pred_steps)):
        pred_values = predictions[i].cpu().numpy()
        print(f"Step {i+1}: {pred_values}")
    
    # Plot predictions
    plot_predictions(predictions, input_data)

def demo_retrain():
    """
    Demo function showing how to retrain model with new data
    """
    print("\n=== RETRAIN DEMO ===")
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # Paths
    model_path = '../pytorch_lstm_system_load_model_multioutput.pth'
    new_data_path = '../../data/mock-metrics/2.csv'
    
    # Retrain model
    model, train_losses, val_losses = retrain_model_with_new_data(
        model_path=model_path,
        new_data_path=new_data_path,
        device=device,
        input_window=60,
        pred_steps=60,
        epochs=10,  # Use fewer epochs for demo
        batch_size=32,
        learning_rate=0.001
    )
    
    if model is not None:
        print("Retraining completed successfully!")
        
        # Plot training losses
        plt.figure(figsize=(10, 5))
        plt.plot(train_losses, label='Training Loss')
        plt.plot(val_losses, label='Validation Loss')
        plt.title('Retrain Loss History')
        plt.xlabel('Epoch')
        plt.ylabel('Loss')
        plt.legend()
        plt.grid(True)
        plt.savefig('../retrain_loss_history.png')
        plt.show()
        
        print(f"Final train loss: {train_losses[-1]:.4f}")
        print(f"Final validation loss: {val_losses[-1]:.4f}")
    else:
        print("Retraining failed!")

def plot_predictions(predictions, input_data):
    """
    Plot prediction results
    
    Args:
        predictions: Tensor of shape (pred_steps, 4)
        input_data: Tensor of shape (input_window, 4)
    """
    predictions = predictions.cpu().numpy()
    input_data = input_data.cpu().numpy()
    
    feature_names = ['CPU %', 'Memory %', 'Network Score', 'Disk Score']
    
    fig, axes = plt.subplots(2, 2, figsize=(15, 10))
    axes = axes.flatten()
    
    for i in range(4):
        ax = axes[i]
        
        # Plot historical data
        input_steps = list(range(-len(input_data), 0))
        ax.plot(input_steps, input_data[:, i], 'b-', label='Historical', linewidth=2)
        
        # Plot predictions
        pred_steps = list(range(0, len(predictions)))
        ax.plot(pred_steps, predictions[:, i], 'r--', label='Predicted', linewidth=2)
        
        # Add vertical line at prediction start
        ax.axvline(x=0, color='gray', linestyle=':', alpha=0.7)
        
        ax.set_title(f'{feature_names[i]} Prediction')
        ax.set_xlabel('Time Steps')
        ax.set_ylabel('Value')
        ax.legend()
        ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('../prediction_demo.png', dpi=300, bbox_inches='tight')
    plt.show()

def create_synthetic_data_for_demo():
    """
    Create synthetic data for demo if real data is not available
    """
    print("Creating synthetic data for demo...")
    
    # Generate synthetic system metrics
    n_samples = 1000
    timestamps = pd.date_range('2024-01-01', periods=n_samples, freq='1min')
    
    # Generate realistic system metrics with some patterns
    t = np.arange(n_samples)
    
    # CPU usage with daily pattern
    cpu_base = 30 + 20 * np.sin(2 * np.pi * t / 1440)  # Daily cycle
    cpu_noise = np.random.normal(0, 5, n_samples)
    cpu_usage = np.clip(cpu_base + cpu_noise, 0, 100)
    
    # Memory usage with trend
    memory_base = 40 + 0.01 * t  # Slight upward trend
    memory_noise = np.random.normal(0, 3, n_samples)
    memory_usage = np.clip(memory_base + memory_noise, 0, 100)
    
    # Network throughput
    network_received = 500 + 200 * np.sin(2 * np.pi * t / 360) + np.random.normal(0, 50, n_samples)
    network_transmitted = 400 + 150 * np.sin(2 * np.pi * t / 360) + np.random.normal(0, 40, n_samples)
    network_received = np.clip(network_received, 0, None)
    network_transmitted = np.clip(network_transmitted, 0, None)
    
    # Disk throughput
    disk_read = 100 + 50 * np.random.random(n_samples)
    disk_write = 80 + 40 * np.random.random(n_samples)
    
    # Create DataFrame
    df = pd.DataFrame({
        'Timestamp': timestamps,
        'CPU usage [%]': cpu_usage,
        'Memory capacity provisioned [KB]': [1398101] * n_samples,
        'Memory usage [KB]': memory_usage / 100 * 1398101,
        'Network received throughput [KB/s]': network_received,
        'Network transmitted throughput [KB/s]': network_transmitted,
        'Disk read throughput [KB/s]': disk_read,
        'Disk write throughput [KB/s]': disk_write
    })
    
    # Save synthetic data
    output_path = '../../data/synthetic_demo_data.csv'
    df.to_csv(output_path, sep=';', index=False)
    print(f"Synthetic data saved to {output_path}")
    
    return output_path

def main():
    """
    Main demo function
    """
    print("LSTM Model Prediction and Retrain Demo")
    print("=" * 50)
    
    # Check if real data exists, otherwise create synthetic data
    real_data_path = '../../data/mock-metrics/2.csv'
    try:
        df = pd.read_csv(real_data_path, delimiter=';')
        print(f"Using real data from {real_data_path}")
    except:
        print("Real data not found, creating synthetic data...")
        real_data_path = create_synthetic_data_for_demo()
    
    # Demo 1: Prediction
    try:
        demo_prediction()
    except Exception as e:
        print(f"Prediction demo failed: {e}")
    
    # Demo 2: Retrain
    try:
        demo_retrain()
    except Exception as e:
        print(f"Retrain demo failed: {e}")
    
    print("\nDemo completed!")

if __name__ == '__main__':
    main() 