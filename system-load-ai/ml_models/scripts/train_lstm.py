import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
import matplotlib.pyplot as plt
import os

# Define constants
DATA_PATH = '../data/1.csv'
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