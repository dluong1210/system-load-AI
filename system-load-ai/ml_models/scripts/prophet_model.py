import pandas as pd
from prophet import Prophet
import matplotlib.pyplot as plt

def load_and_prepare_data(csv_filepath, value_column_name, cap_value=110, floor_value=0):
    try:
        df = pd.read_csv(csv_filepath, sep=';')
    except FileNotFoundError:
        print(f"Lỗi: Không tìm thấy file {csv_filepath}")
        return None
    except Exception as e:
        print(f"Lỗi khi đọc file CSV: {e}")
        return None

    if 'Timestamp' not in df.columns or value_column_name not in df.columns:
        print(f"Lỗi: File CSV phải chứa cột 'Timestamp' và '{value_column_name}'.")
        print(f"Các cột hiện có: {df.columns.tolist()}")
        return None

    df_prophet = pd.DataFrame()
    df_prophet['ds'] = pd.to_datetime(df['Timestamp'])
    df_prophet['y'] = df[value_column_name].astype(float)

    df_prophet['cap'] = cap_value
    df_prophet['floor'] = floor_value
    
    df_prophet['y'] = df_prophet['y'].clip(lower=floor_value, upper=cap_value)

    print(f"Dữ liệu đã được tải và chuẩn bị. Số điểm dữ liệu: {len(df_prophet)}")
    return df_prophet

def load_and_prepare_data_with_sampling(csv_filepath, value_column_name, hours_back, sample_interval_seconds, cap_value=110, floor_value=0):
    """
    Load and prepare data with specific time range and sampling interval
    
    Args:
        csv_filepath: Path to CSV file
        value_column_name: Column name to predict
        hours_back: Number of hours to look back from the latest data point
        sample_interval_seconds: Sampling interval in seconds
        cap_value: Maximum value cap
        floor_value: Minimum value floor
    """
    try:
        df = pd.read_csv(csv_filepath, sep=';')
    except FileNotFoundError:
        print(f"Lỗi: Không tìm thấy file {csv_filepath}")
        return None
    except Exception as e:
        print(f"Lỗi khi đọc file CSV: {e}")
        return None

    if 'Timestamp' not in df.columns or value_column_name not in df.columns:
        print(f"Lỗi: File CSV phải chứa cột 'Timestamp' và '{value_column_name}'.")
        print(f"Các cột hiện có: {df.columns.tolist()}")
        return None

    # Convert timestamp to datetime
    df['Timestamp'] = pd.to_datetime(df['Timestamp'])
    df = df.sort_values('Timestamp')
    
    # Get the latest timestamp and calculate the cutoff time
    latest_time = df['Timestamp'].max()
    cutoff_time = latest_time - pd.Timedelta(hours=hours_back)
    
    # Filter data to the specified time range
    df_filtered = df[df['Timestamp'] >= cutoff_time].copy()
    
    if len(df_filtered) == 0:
        print(f"Không có dữ liệu trong khoảng thời gian {hours_back} giờ gần nhất")
        return None
    
    # Set timestamp as index for resampling
    df_filtered = df_filtered.set_index('Timestamp')
    
    # Resample data according to the specified interval
    sample_rule = f"{sample_interval_seconds}S"
    df_resampled = df_filtered[value_column_name].resample(sample_rule).mean().dropna()
    
    # Convert to Prophet format
    df_prophet = pd.DataFrame()
    df_prophet['ds'] = df_resampled.index
    df_prophet['y'] = df_resampled.values
    
    df_prophet['cap'] = cap_value
    df_prophet['floor'] = floor_value
    
    df_prophet['y'] = df_prophet['y'].clip(lower=floor_value, upper=cap_value)
    
    print(f"Dữ liệu đã được tải và chuẩn bị với sampling {sample_interval_seconds}s trong {hours_back} giờ gần nhất. Số điểm dữ liệu: {len(df_prophet)}")
    return df_prophet

def train_prophet_model(df_prophet):
    if df_prophet is None or len(df_prophet) < 2:
        print("Không đủ dữ liệu để huấn luyện model.")
        return None

    model = Prophet(growth='logistic', daily_seasonality=True, weekly_seasonality=True, yearly_seasonality=False)
    
    # model.add_seasonality(name='hourly', period=1/24, fourier_order=3) # Nếu có seasonality theo giờ

    try:
        model.fit(df_prophet)
        print("Model đã được huấn luyện thành công.")
        return model
    except Exception as e:
        print(f"Lỗi trong quá trình huấn luyện model: {e}")
        return None

def make_predictions(model, future_periods_seconds, freq_seconds='S', cap_value=110, floor_value=0):
    if model is None:
        return None

    future_df = model.make_future_dataframe(periods=future_periods_seconds, freq=freq_seconds)

    future_df['cap'] = cap_value
    future_df['floor'] = floor_value

    print(f"Đang thực hiện dự đoán cho {future_periods_seconds} giây tiếp theo ({future_periods_seconds/3600:.1f} giờ)...")
    try:
        forecast_df = model.predict(future_df)
        print("Dự đoán hoàn tất.")
        return forecast_df
    except Exception as e:
        print(f"Lỗi trong quá trình dự đoán: {e}")
        return None

def display_forecast_results(model, forecast_df, horizon_label, only_future=True):
    if forecast_df is None or model is None:
        print(f"Không có dữ liệu dự đoán để hiển thị cho {horizon_label}.")
        return

    if only_future:
        full_future_df_for_plot = model.make_future_dataframe(periods=len(forecast_df), freq=forecast_df['ds'].diff().min())
        full_future_df_for_plot['cap'] = forecast_df['cap'].iloc[0]
        full_future_df_for_plot['floor'] = forecast_df['floor'].iloc[0]
        full_forecast_to_plot = model.predict(full_future_df_for_plot)
        fig = model.plot(full_forecast_to_plot)

    else:
        fig = model.plot(forecast_df)

    plt.title(f"Dự đoán {horizon_label}")
    plt.ylabel("CPU Usage [%]")
    plt.xlabel("Thời gian")
    y_min_plot = 0
    y_max_plot = 120
    plt.show()

    # fig_components = model.plot_components(full_forecast_to_plot if only_future else forecast_df)
    # plt.show()


if __name__ == "__main__":
    CSV_FILEPATH = "../data/mock-metrics/2.csv"
    METRIC_TO_PREDICT = "CPU usage [%]"
    CAP_VALUE = 110.0
    FLOOR_VALUE = 0.0

    # 1. Load và chuẩn bị dữ liệu
    df_prophet_ready = load_and_prepare_data(CSV_FILEPATH, METRIC_TO_PREDICT, CAP_VALUE, FLOOR_VALUE)

    if df_prophet_ready is not None:
        prophet_model = train_prophet_model(df_prophet_ready)

        if prophet_model is not None:
            horizons_seconds = {
                "1 hours": 1 * 3600,
                "6 hours": 6 * 3600,
                "24 hours": 24 * 3600
            }
            
            freq_pred = 'S'

            all_forecasts = {}

            for label, seconds in horizons_seconds.items():
                periods_for_prediction = seconds
                if freq_pred == 'T':
                    periods_for_prediction = seconds // 60
                elif freq_pred == 'H':
                    periods_for_prediction = seconds // 3600
                
                print(f"\n--- Bắt đầu cho {label} (periods={periods_for_prediction}, freq='{freq_pred}') ---")
                forecast_data = make_predictions(prophet_model,
                                                 periods_for_prediction,
                                                 freq_seconds=freq_pred,
                                                 cap_value=CAP_VALUE,
                                                 floor_value=FLOOR_VALUE)
                if forecast_data is not None:
                    all_forecasts[label] = forecast_data
                    forecast_data['yhat'] = forecast_data['yhat'].clip(FLOOR_VALUE, CAP_VALUE)
                    
                    display_forecast_results(prophet_model, forecast_data, label, only_future=True)
                    
                    final_prediction_time = forecast_data['ds'].iloc[-1]
                    final_predicted_value = forecast_data['yhat'].iloc[-1]
                    print(f"Giá trị dự đoán tại điểm cuối của {label} ({final_prediction_time}): {final_predicted_value:.2f}%")


            # for label, df_fc in all_forecasts.items():
            #     print(f"\nForecast for {label}:")
            #     print(df_fc[['ds', 'yhat']].head())