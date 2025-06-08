import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader, Dataset
import matplotlib.pyplot as plt
import os

# Define constants
DATA_PATH = '../../data/mock_data/1.csv'
SEQUENCE_LENGTH = 60  # Number of time steps in each input sequence
# TARGET_COLUMN = 'CPU usage [%]' # No longer a single target column
SPLIT_RATIO = 0.8 # 80% for training, 20% for testing
EPOCHS = 50
BATCH_SIZE = 32
LEARNING_RATE = 0.001
MODEL_SAVE_PATH = '../pytorch_lstm_system_load_model_multioutput.pth' # New model name
PLOT_SAVE_DIR = '../../../' # Save plots in the root directory

# Ensure plot save directory exists
os.makedirs(PLOT_SAVE_DIR, exist_ok=True)

def calculate_network_load_score(total_network_throughput):
    """
    Calculate network load score based on total network throughput
    """
    # Thresholds (KB/s)
    lowThreshold = 128
    mediumThreshold = 1280
    highThreshold = 6400
    maxThreshold = 12800

    score = 0.0
    if total_network_throughput <= lowThreshold:
        score = (total_network_throughput / lowThreshold) * 25
    elif total_network_throughput <= mediumThreshold:
        score = 25 + ((total_network_throughput - lowThreshold) / (mediumThreshold - lowThreshold)) * 25
    elif total_network_throughput <= highThreshold:
        score = 50 + ((total_network_throughput - mediumThreshold) / (highThreshold - mediumThreshold)) * 25
    elif total_network_throughput <= maxThreshold:
        score = 75 + ((total_network_throughput - highThreshold) / (maxThreshold - highThreshold)) * 25
    else:
        score = 100
    return min(max(score, 0), 100)

def calculate_disk_load_score(total_disk_throughput):
    """
    Calculate disk load score based on total disk throughput
    """
    # Thresholds (KB/s)
    lowThreshold = 1024
    mediumThreshold = 10240
    highThreshold = 51200
    maxThreshold = 102400

    score = 0.0
    if total_disk_throughput <= lowThreshold:
        score = (total_disk_throughput / lowThreshold) * 25
    elif total_disk_throughput <= mediumThreshold:
        score = 25 + ((total_disk_throughput - lowThreshold) / (mediumThreshold - lowThreshold)) * 25
    elif total_disk_throughput <= highThreshold:
        score = 50 + ((total_disk_throughput - mediumThreshold) / (highThreshold - mediumThreshold)) * 25
    elif total_disk_throughput <= maxThreshold:
        score = 75 + ((total_disk_throughput - highThreshold) / (maxThreshold - highThreshold)) * 25
    else:
        score = 100
    return min(max(score, 0), 100)

class MultistepDataset(Dataset):
    """
    Dataset class for multi-step time series prediction
    """
    def __init__(self, df, input_window=60, pred_steps=60):
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
        
        self.data = torch.cat([cpu_usage, memory_usage, network_throughput, disk_throughput], dim=1)  # shape (N, 4)
        
        self.input_window = input_window
        self.pred_steps = pred_steps

    def __len__(self):
        return len(self.data) - self.input_window - self.pred_steps + 1

    def __getitem__(self, idx):
        # Get input sequence and target sequence
        x = self.data[idx : idx + self.input_window]   # (input_window, 4)
        y = self.data[idx + self.input_window : idx + self.input_window + self.pred_steps]  # (pred_steps, 4)
        return x, y

class MultistepLSTM(nn.Module):
    """
    Multi-step LSTM model for system load prediction
    """
    def __init__(self, input_size=4, hidden_size=64, num_layers=2, pred_steps=60, output_size=4):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=0.2 if num_layers > 1 else 0)
        self.fc = nn.Linear(hidden_size, pred_steps * output_size)
        self.pred_steps = pred_steps
        self.output_size = output_size

    def forward(self, x):
        out, _ = self.lstm(x)
        out = out[:, -1, :]  # Take last output
        out = self.fc(out)
        return out.view(-1, self.pred_steps, self.output_size)

def load_and_preprocess_data(file_path, sequence_length, split_ratio):
    """
    Loads data from a CSV file, preprocesses it, and creates sequences for LSTM.
    Now prepares y to include all numeric features for multi-output prediction.
    """
    try:
        df = pd.read_csv(file_path, delimiter=';')
        df.columns = [col.strip() for col in df.columns]
    except FileNotFoundError:
        print(f"Error: The file {file_path} was not found.")
        return None, None, None, None, None, None, None
    except Exception as e:
        print(f"Error loading data: {e}")
        return None, None, None, None, None, None, None

    original_df_for_index = df.copy()

    if 'Timestamp' in df.columns:
        try:
            df['Timestamp'] = pd.to_datetime(df['Timestamp'], unit='ms')
            df.set_index('Timestamp', inplace=True)
            original_df_for_index = df.copy()
        except Exception as e:
            print(f"Error converting Timestamp: {e}. Proceeding without datetime index.")

    df_numeric = df.select_dtypes(include=np.number)

    # if target_column not in df_numeric.columns: # Removed single target column check
    #     print(f"Error: Target column '{target_column}' not found.")
    #     return None, None, None, None, None, None, None
    if df_numeric.empty:
        print("Error: No numeric columns found in the data.")
        return None, None, None, None, None, None, None

    df_numeric.fillna(method='ffill', inplace=True)
    df_numeric.fillna(method='bfill', inplace=True)
    if df_numeric.isnull().any().any():
        print("Warning: Dropping rows with NaNs after fill.")
        df_numeric.dropna(inplace=True)
    if df_numeric.empty:
        print("Error: DataFrame empty after preprocessing.")
        return None, None, None, None, None, None, None

    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(df_numeric)

    X, y = [], []
    # target_col_index = df_numeric.columns.get_loc(target_column) # Removed

    for i in range(sequence_length, len(scaled_data)):
        X.append(scaled_data[i-sequence_length:i]) # Input sequence
        y.append(scaled_data[i]) # Target: all features at the next time step

    X, y = np.array(X), np.array(y) # y is now (num_samples, num_features)

    if X.shape[0] == 0:
        print("Error: No sequences created.")
        return None, None, None, None, None, None, None

    split_index = int(len(X) * split_ratio)
    X_train, X_test = X[:split_index], X[split_index:]
    y_train, y_test = y[:split_index], y[split_index:]
    
    return X_train, y_train, X_test, y_test, scaler, df_numeric, original_df_for_index


class LSTMModel(nn.Module):
    def __init__(self, input_size, output_size, hidden_layer_size=50, num_layers=2):
        super().__init__()
        self.hidden_layer_size = hidden_layer_size
        self.num_layers = num_layers
        self.output_size = output_size # Number of features to predict
        
        self.lstm = nn.LSTM(input_size, hidden_layer_size, num_layers=num_layers, batch_first=True, dropout=0.2 if num_layers > 1 else 0)
        self.linear = nn.Linear(hidden_layer_size, output_size) # Output layer predicts all features

    def forward(self, input_seq):
        h0 = torch.zeros(self.num_layers, input_seq.size(0), self.hidden_layer_size).to(input_seq.device)
        c0 = torch.zeros(self.num_layers, input_seq.size(0), self.hidden_layer_size).to(input_seq.device)
        
        lstm_out, _ = self.lstm(input_seq, (h0, c0))
        predictions = self.linear(lstm_out[:, -1, :])
        return predictions

def train_epoch(model, dataloader, criterion, optimizer, device):
    """
    Train model for one epoch
    """
    model.train()
    total_loss = 0
    for x_batch, y_batch in dataloader:
        x_batch = x_batch.to(device)
        y_batch = y_batch.to(device)

        optimizer.zero_grad()
        output = model(x_batch)
        loss = criterion(output, y_batch)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * x_batch.size(0)

    return total_loss / len(dataloader.dataset)

def eval_epoch(model, dataloader, criterion, device):
    """
    Evaluate model for one epoch
    """
    model.eval()
    total_loss = 0
    with torch.no_grad():
        for x_batch, y_batch in dataloader:
            x_batch = x_batch.to(device)
            y_batch = y_batch.to(device)

            output = model(x_batch)
            loss = criterion(output, y_batch)

            total_loss += loss.item() * x_batch.size(0)

    return total_loss / len(dataloader.dataset)

def predict_future_metrics(model, input_data, device, pred_steps=60):
    """
    Predict future system metrics using trained model
    
    Args:
        model: Trained MultistepLSTM model
        input_data: Input sequence tensor of shape (1, input_window, 4) or (input_window, 4)
        device: Device to run inference on
        pred_steps: Number of future steps to predict
        
    Returns:
        predictions: Tensor of shape (pred_steps, 4) containing predicted metrics
    """
    model.eval()
    
    if input_data.dim() == 2:
        input_data = input_data.unsqueeze(0)  # Add batch dimension
    
    input_data = input_data.to(device)
    
    with torch.no_grad():
        predictions = model(input_data)  # Shape: (1, pred_steps, 4)
        predictions = predictions.squeeze(0)  # Remove batch dimension: (pred_steps, 4)
    
    return predictions

def retrain_model_with_new_data(model_path, new_data_path, device, 
                               input_window=60, pred_steps=60, 
                               epochs=20, batch_size=32, learning_rate=0.001):
    """
    Retrain existing model with new data
    
    Args:
        model_path: Path to existing model
        new_data_path: Path to new CSV data
        device: Device to train on
        input_window: Input sequence length
        pred_steps: Number of prediction steps
        epochs: Number of training epochs
        batch_size: Batch size for training
        learning_rate: Learning rate for optimizer
        
    Returns:
        model: Retrained model
        train_losses: List of training losses
        val_losses: List of validation losses
    """
    
    # Load new data
    try:
        df = pd.read_csv(new_data_path, delimiter=';')
        df.columns = [col.strip() for col in df.columns]
        print(f"Loaded new data with shape: {df.shape}")
    except Exception as e:
        print(f"Error loading new data: {e}")
        return None, None, None
    
    # Create dataset
    dataset = MultistepDataset(df, input_window=input_window, pred_steps=pred_steps)
    
    # Split data
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = torch.utils.data.random_split(dataset, [train_size, val_size])
    
    # Create data loaders
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    
    print(f"Train dataset size: {len(train_dataset)}")
    print(f"Validation dataset size: {len(val_dataset)}")
    
    # Load existing model or create new one
    if os.path.exists(model_path):
        try:
            model = MultistepLSTM(input_size=4, hidden_size=64, num_layers=2, 
                                pred_steps=pred_steps, output_size=4)
            model.load_state_dict(torch.load(model_path, map_location=device))
            model = model.to(device)
            print("Loaded existing model for retraining")
        except Exception as e:
            print(f"Error loading existing model: {e}")
            print("Creating new model")
            model = MultistepLSTM(input_size=4, hidden_size=64, num_layers=2, 
                                pred_steps=pred_steps, output_size=4).to(device)
    else:
        print("Creating new model")
        model = MultistepLSTM(input_size=4, hidden_size=64, num_layers=2, 
                            pred_steps=pred_steps, output_size=4).to(device)
    
    # Setup training
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
    
    train_losses = []
    val_losses = []
    
    print("Starting retraining...")
    for epoch in range(1, epochs + 1):
        train_loss = train_epoch(model, train_loader, criterion, optimizer, device)
        val_loss = eval_epoch(model, val_loader, criterion, device)
        
        train_losses.append(train_loss)
        val_losses.append(val_loss)
        
        if epoch % 5 == 0:
            print(f"Epoch {epoch}/{epochs} - Train loss: {train_loss:.4f} - Val loss: {val_loss:.4f}")
    
    # Save retrained model
    torch.save(model.state_dict(), model_path)
    print(f"Retrained model saved to {model_path}")
    
    return model, train_losses, val_losses

def load_model_for_prediction(model_path, device, input_size=4, hidden_size=64, 
                            num_layers=2, pred_steps=60, output_size=4):
    """
    Load trained model for prediction
    
    Args:
        model_path: Path to saved model
        device: Device to load model on
        Other args: Model architecture parameters
        
    Returns:
        model: Loaded model ready for prediction
    """
    try:
        model = MultistepLSTM(input_size=input_size, hidden_size=hidden_size, 
                            num_layers=num_layers, pred_steps=pred_steps, 
                            output_size=output_size)
        model.load_state_dict(torch.load(model_path, map_location=device))
        model = model.to(device)
        model.eval()
        print(f"Model loaded successfully from {model_path}")
        return model
    except Exception as e:
        print(f"Error loading model: {e}")
        return None

def train_pytorch_model(model, train_loader, val_loader, criterion, optimizer, epochs, device):
    train_losses = []
    val_losses = []
    
    print("Starting PyTorch model training...")
    for epoch in range(epochs):
        model.train()
        epoch_train_loss = 0
        for seq, labels in train_loader:
            seq, labels = seq.to(device), labels.to(device)
            
            optimizer.zero_grad()
            y_pred = model(seq)
            loss = criterion(y_pred, labels)
            loss.backward()
            optimizer.step()
            epoch_train_loss += loss.item() * seq.size(0)
        
        epoch_train_loss /= len(train_loader.dataset)
        train_losses.append(epoch_train_loss)
        
        model.eval()
        epoch_val_loss = 0
        with torch.no_grad():
            for seq, labels in val_loader:
                seq, labels = seq.to(device), labels.to(device)
                y_pred = model(seq)
                loss = criterion(y_pred, labels)
                epoch_val_loss += loss.item() * seq.size(0)
        
        epoch_val_loss /= len(val_loader.dataset)
        val_losses.append(epoch_val_loss)
        
        print(f'Epoch {epoch+1}/{epochs}, Train Loss: {epoch_train_loss:.6f}, Val Loss: {epoch_val_loss:.6f}')
        
    print("Model training finished.")
    return train_losses, val_losses

def plot_loss_pytorch(train_losses, val_losses):
    plt.figure(figsize=(10, 5))
    plt.plot(train_losses, label='Training Loss')
    plt.plot(val_losses, label='Validation Loss')
    plt.title('Model Loss (PyTorch LSTM Multi-Output)')
    plt.ylabel('Loss (MSE)')
    plt.xlabel('Epoch')
    plt.legend(loc='upper right')
    plt.grid(True)
    plt.tight_layout()
    plot_path = os.path.join(PLOT_SAVE_DIR, 'pytorch_lstm_loss_plot_multioutput.png')
    plt.savefig(plot_path)
    print(f"Loss plot saved to {plot_path}")

# Placeholder for the new multi-output plotting function
def plot_predictions_pytorch_multioutput(original_df_with_index, y_test_actual_all_features, y_pred_actual_all_features, feature_names, sequence_length, split_ratio):
    print("Plotting for multiple features...")
    num_features = y_test_actual_all_features.shape[1]

    for i in range(num_features):
        feature_name = feature_names[i]
        plt.figure(figsize=(15, 7))

        # Indexing for plotting test data
        start_idx_for_test_plot = int((len(original_df_with_index) - sequence_length) * split_ratio) + sequence_length
        available_index_len = len(original_df_with_index.index[start_idx_for_test_plot:])
        
        y_test_single_feature = y_test_actual_all_features[:, i]
        y_pred_single_feature = y_pred_actual_all_features[:, i]

        plot_len = min(available_index_len, len(y_test_single_feature), len(y_pred_single_feature))

        test_data_index = original_df_with_index.index[start_idx_for_test_plot : start_idx_for_test_plot + plot_len]

        plt.plot(original_df_with_index.index, original_df_with_index[feature_name], label=f'Original {feature_name}', alpha=0.7)

        if plot_len > 0:
            plt.plot(test_data_index, y_test_single_feature[:plot_len], label=f'Actual Test {feature_name}', color='orange', marker='.')
            plt.plot(test_data_index, y_pred_single_feature[:plot_len], label=f'Predicted Test {feature_name}', color='green', marker='x', linestyle='--')
        else:
            print(f"Warning: Not enough data points to plot test predictions for {feature_name}. Plot_len is 0.")

        plt.title(f'{feature_name} Prediction (PyTorch LSTM Multi-Output)')
        plt.xlabel('Time' if isinstance(original_df_with_index.index, pd.DatetimeIndex) else 'Data Point Index')
        plt.ylabel(feature_name)
        plt.legend()
        plt.grid(True)
        plt.tight_layout()
        # Sanitize feature_name for filename
        safe_feature_name = "".join(c if c.isalnum() else '_' for c in feature_name)
        plot_path = os.path.join(PLOT_SAVE_DIR, f'pytorch_lstm_pred_{safe_feature_name}.png')
        plt.savefig(plot_path)
        print(f"Prediction plot for {feature_name} saved to {plot_path}")
        plt.close() # Close the figure to free memory

def main_pytorch():
    print("Using PyTorch for Multi-Output LSTM model.")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    print("Loading and preprocessing data...")
    X_train_np, y_train_np, X_test_np, y_test_np, scaler, df_numeric, original_df_for_index = load_and_preprocess_data(
        DATA_PATH, SEQUENCE_LENGTH, SPLIT_RATIO # Removed TARGET_COLUMN
    )

    if X_train_np is None:
        print("Exiting due to data loading/preprocessing errors.")
        return

    # Convert to PyTorch tensors
    X_train = torch.from_numpy(X_train_np).float().to(device)
    y_train = torch.from_numpy(y_train_np).float().to(device) # y_train is now (samples, num_features)
    X_test = torch.from_numpy(X_test_np).float().to(device)
    y_test = torch.from_numpy(y_test_np).float().to(device) # y_test is now (samples, num_features)

    print(f"X_train shape: {X_train.shape}, y_train shape: {y_train.shape}")
    print(f"X_test shape: {X_test.shape}, y_test shape: {y_test.shape}")
    
    if X_train.shape[0] == 0 or X_test.shape[0] == 0:
        print("Error: Training or testing data is empty. Cannot proceed.")
        return

    train_dataset = TensorDataset(X_train, y_train)
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    val_dataset = TensorDataset(X_test, y_test)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)

    input_size = X_train.shape[2]  # Number of features in input sequence
    output_size = y_train.shape[1] # Number of features to predict
    
    model = LSTMModel(input_size=input_size, output_size=output_size, hidden_layer_size=50, num_layers=2).to(device)
    print("PyTorch LSTM Model (Multi-Output) Summary:")
    print(model)
    total_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Total trainable parameters: {total_params}")

    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)

    train_losses, val_losses = train_pytorch_model(model, train_loader, val_loader, criterion, optimizer, EPOCHS, device)

    model.eval()
    test_loss = 0
    all_predictions_scaled_list = [] # Renamed to avoid confusion
    with torch.no_grad():
        for seq, labels in val_loader:
            seq, labels = seq.to(device), labels.to(device)
            outputs = model(seq) # outputs shape: (batch_size, output_size)
            loss = criterion(outputs, labels)
            test_loss += loss.item() * seq.size(0)
            all_predictions_scaled_list.append(outputs.cpu().numpy())
    
    test_loss /= len(val_loader.dataset)
    print(f"Test Loss (MSE for all outputs combined): {test_loss:.6f}")

    predictions_scaled_np = np.concatenate(all_predictions_scaled_list) # Shape: (num_test_samples, output_size)

    # Inverse transform predictions and y_test
    # scaler was fit on df_numeric which has all the features in the correct order
    actual_predictions_all_features = scaler.inverse_transform(predictions_scaled_np)
    actual_y_test_all_features = scaler.inverse_transform(y_test.cpu().numpy())
    
    if df_numeric is not None and not df_numeric.empty and original_df_for_index is not None:
        feature_names = df_numeric.columns.tolist()
        plot_predictions_pytorch_multioutput(original_df_for_index, actual_y_test_all_features, actual_predictions_all_features, feature_names, SEQUENCE_LENGTH, SPLIT_RATIO)
        plot_loss_pytorch(train_losses, val_losses) # plot_loss is fine, just update title if needed
    else:
        print("Skipping plotting as data for plotting is not available.")

    torch.save(model.state_dict(), MODEL_SAVE_PATH)
    print(f"PyTorch Multi-Output Model saved to {MODEL_SAVE_PATH}")

if __name__ == '__main__':
    main_pytorch() 