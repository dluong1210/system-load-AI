import pandas as pd
from prophet import Prophet
import json
import sys
import logging

# Configure logging
logging.basicConfig(stream=sys.stdout, level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def load_data(json_data_path_or_string):
    """Loads data from a JSON file path or a JSON string."""
    logging.info(f"Loading data from: {json_data_path_or_string[:100]}...") # Log snippet if string
    try:
        # Try to load as a file path first
        with open(json_data_path_or_string, 'r') as f:
            data = json.load(f)
    except (FileNotFoundError, OSError): # OSError for invalid path chars
        # If it fails, try to load as a JSON string
        logging.info("Failed to load as file, trying as JSON string.")
        try:
            data = json.loads(json_data_path_or_string)
        except json.JSONDecodeError as e:
            logging.error(f"Error decoding JSON string: {e}")
            raise
    
    df = pd.DataFrame(data)
    # Prophet expects 'ds' (datestamp) and 'y' (target value) columns
    # Assuming input JSON has 'timestamp' and 'cpuUsage' (or other metric)
    df = df.rename(columns={'timestamp': 'ds', 'cpuUsage': 'y'})
    df['ds'] = pd.to_datetime(df['ds'])
    logging.info(f"Data loaded successfully. Shape: {df.shape}")
    return df

def train_predict(df, periods=24, freq='H'):
    """Trains a Prophet model and makes future predictions."""
    if df.empty or 'ds' not in df.columns or 'y' not in df.columns:
        logging.error("DataFrame is empty or missing required 'ds' or 'y' columns.")
        return None

    logging.info("Initializing and fitting Prophet model...")
    model = Prophet()
    model.fit(df)
    
    logging.info(f"Making future predictions for {periods} periods with frequency '{freq}'...")
    future = model.make_future_dataframe(periods=periods, freq=freq)
    forecast = model.predict(future)
    
    logging.info("Prediction complete.")
    # Return relevant columns: ds, yhat, yhat_lower, yhat_upper
    return forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]

if __name__ == '__main__':
    """
    Example usage: 
    python prophet_model.py '{ "timestamp": ["2023-01-01 00:00:00", "2023-01-01 01:00:00"], "cpuUsage": [50, 55] }'
    python prophet_model.py path/to/your/data.json
    """
    if len(sys.argv) < 2:
        logging.error("Usage: python prophet_model.py <json_data_file_path_or_json_string>")
        sys.exit(1)

    input_arg = sys.argv[1]
    
    try:
        historical_df = load_data(input_arg)
        if historical_df is not None and not historical_df.empty:
            forecast_df = train_predict(historical_df, periods=24) # Predict next 24 hours
            if forecast_df is not None:
                # Output predictions as JSON to stdout
                print(forecast_df.to_json(orient='records', date_format='iso'))
        else:
            logging.error("Failed to load or process data. Aborting prediction.")

    except Exception as e:
        logging.error(f"An error occurred during the script execution: {e}", exc_info=True)
        sys.exit(1) 