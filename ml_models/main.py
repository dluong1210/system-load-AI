from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime
from prophet.serialize import model_to_json, model_from_json
import os
import uvicorn
import json
import logging

from scripts.prophet_model import load_and_prepare_data, load_and_prepare_data_with_sampling, train_prophet_model, make_predictions

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CHECKPOINT_DIR = "checkpoints"

def save_model(model_name: str, model: Any, metadata: dict) -> Tuple[str, str]:
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    
    model_filename = f"{model_name}.json"
    model_path = os.path.join(CHECKPOINT_DIR, model_filename)
    with open(model_path, "w") as f:
        f.write(model_to_json(model))
    
    metadata_filename = f"{model_name}_{metadata['data_points']}.meta.json" 
    metadata_path = os.path.join(CHECKPOINT_DIR, metadata_filename)
    with open(metadata_path, "w") as f:
        json.dump(metadata, f)
        
    return model_path, metadata_path

def load_model(model_name: str, only_metadata: bool = False) -> Optional[Tuple[Any, dict]]:
    model_path = os.path.join(CHECKPOINT_DIR, f"{model_name}.json")
    
    metadata_path = None
    for file in os.listdir(CHECKPOINT_DIR):
        if file.startswith(f"{model_name}_") and file.endswith(".meta.json"):
            metadata_path = os.path.join(CHECKPOINT_DIR, file)
            break
    
    if not (os.path.exists(model_path) and metadata_path and os.path.exists(metadata_path)):
        return None, None
    
    with open(metadata_path) as f:
        metadata = json.load(f)
        
    if only_metadata:
        return None, metadata

    with open(model_path) as f:
        model = model_from_json(f.read())
        
    return model, metadata

app = FastAPI(
    title="System Load Prediction API",
    description="API for training Prophet models and making system load predictions",
    version="1.0.0"
)

allowed_origins = [
    "http://backend:8080",
    "http://localhost:8080",
    "http://127.0.0.1:8080"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

trained_models: Dict[str, int] = {}

class TrainingRequest(BaseModel):
    csv_filepath: str
    metric_name: str
    cap_value: float = 100.0
    floor_value: float = 0.0
    model_name: str = "default"

class MultiModelTrainingRequest(BaseModel):
    csv_filepath: str
    metric_name: str
    cap_value: float = 100.0
    floor_value: float = 0.0
    base_model_name: str = "default"

class PredictionRequest(BaseModel):
    model_name: str = "default"
    future_periods_seconds: int
    freq_seconds: str = "S"
    cap_value: float = 110.0
    floor_value: float = 0.0

class TrainingResponse(BaseModel):
    success: bool
    message: str
    model_name: str
    data_points: int

class MultiModelTrainingResponse(BaseModel):
    success: bool
    message: str
    models_trained: List[Dict[str, Any]]
    total_models: int

class PredictionResponse(BaseModel):
    success: bool
    message: str
    prediction_csv_path: str
    final_prediction_time: str
    final_predicted_value: float

@app.on_event("startup")
async def startup_event():
    if not os.path.exists(CHECKPOINT_DIR):
        return
        
    for file_name in [f[:-10] for f in os.listdir(CHECKPOINT_DIR) if f.endswith(".meta.json")]:
        model_name, num_data_points = "_".join(file_name.split("_")[:-1]), file_name.split("_")[-1]
        trained_models[model_name] = int(num_data_points)

@app.get("/")
async def root():
    return {"message": "System Load Prediction API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/models")
async def list_models():
    return {
        "models": list(trained_models.keys()),
        "count": len(trained_models)
    }

@app.post("/train", response_model=TrainingResponse)
async def train_model(request: TrainingRequest):
    try:
        if not os.path.exists(request.csv_filepath):
            raise HTTPException(status_code=404, detail=f"CSV file not found: {request.csv_filepath}")
        
        df_prophet = load_and_prepare_data(
            request.csv_filepath,
            request.metric_name,
            request.cap_value,
            request.floor_value
        )
        
        if df_prophet is None:
            raise HTTPException(status_code=400, detail="Failed to load and prepare data")
        
        model = train_prophet_model(df_prophet)
        
        if model is None:
            raise HTTPException(status_code=500, detail="Failed to train model")
            
        metadata = {
            "model_name": request.model_name,
            "trained_at": datetime.now().isoformat(),
            "data_points": len(df_prophet),
            "metric_name": request.metric_name,
            "cap_value": request.cap_value,
            "floor_value": request.floor_value
        }
        
        save_model(request.model_name, model, metadata)
        trained_models[request.model_name] = len(df_prophet)
        
        return TrainingResponse(
            success=True,
            message=f"Model '{request.model_name}' trained successfully",
            model_name=request.model_name,
            data_points=len(df_prophet)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@app.post("/train_multi_models", response_model=MultiModelTrainingResponse)
async def train_multi_models(request: MultiModelTrainingRequest):
    try:
        if not os.path.exists(request.csv_filepath):
            raise HTTPException(status_code=404, detail=f"CSV file not found: {request.csv_filepath}")
        
        model_configs = [
            {
                "suffix": "_1h",
                "hours_back": 3,
                "sample_interval": 60,
                "description": "1-hour prediction model"
            },
            {
                "suffix": "_6h", 
                "hours_back": 18,
                "sample_interval": 360,
                "description": "6-hour prediction model"
            },
            {
                "suffix": "_24h",
                "hours_back": 72,
                "sample_interval": 1440,
                "description": "24-hour prediction model"
            }
        ]
        
        models_trained = []
        total_success = 0
        
        for config in model_configs:
            try:
                df_prophet = load_and_prepare_data_with_sampling(
                    request.csv_filepath,
                    request.metric_name,
                    config["hours_back"],
                    config["sample_interval"],
                    request.cap_value,
                    request.floor_value
                )
                
                if df_prophet is None or len(df_prophet) < 10:
                    models_trained.append({
                        "model_name": request.base_model_name + config["suffix"],
                        "success": False,
                        "message": f"Insufficient data for {config['description']}",
                        "data_points": 0
                    })
                    continue
                
                model = train_prophet_model(df_prophet)
                
                if model is None:
                    models_trained.append({
                        "model_name": request.base_model_name + config["suffix"],
                        "success": False,
                        "message": f"Failed to train {config['description']}",
                        "data_points": len(df_prophet)
                    })
                    continue
                
                model_name = request.base_model_name + config["suffix"]
                metadata = {
                    "model_name": model_name,
                    "trained_at": datetime.now().isoformat(),
                    "data_points": len(df_prophet),
                    "metric_name": request.metric_name,
                    "cap_value": request.cap_value,
                    "floor_value": request.floor_value,
                    "model_type": config["suffix"][1:],
                    "hours_back": config["hours_back"],
                    "sample_interval_seconds": config["sample_interval"]
                }
                
                save_model(model_name, model, metadata)
                trained_models[model_name] = len(df_prophet)
                
                models_trained.append({
                    "model_name": model_name,
                    "success": True,
                    "message": f"{config['description']} trained successfully",
                    "data_points": len(df_prophet)
                })
                total_success += 1
                
            except Exception as e:
                models_trained.append({
                    "model_name": request.base_model_name + config["suffix"],
                    "success": False,
                    "message": f"Error training {config['description']}: {str(e)}",
                    "data_points": 0
                })
        
        overall_success = total_success > 0
        
        return MultiModelTrainingResponse(
            success=overall_success,
            message=f"Training completed: {total_success}/3 models trained successfully",
            models_trained=models_trained,
            total_models=total_success
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multi-model training failed: {str(e)}")

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    try:
        if request.model_name not in trained_models:
            raise HTTPException(status_code=404, detail=f"Model '{request.model_name}' not found")
        
        model, metadata = load_model(request.model_name)
        
        forecast_df = make_predictions(
            model,
            request.future_periods_seconds,
            request.freq_seconds,
            request.cap_value,
            request.floor_value
        )
        
        if forecast_df is None:
            raise HTTPException(status_code=500, detail="Prediction failed")
        
        forecast_df['yhat'] = forecast_df['yhat'].clip(request.floor_value, request.cap_value)
        
        import pandas as pd
        prediction_data = []
        for _, row in forecast_df.iterrows():
            prediction_data.append({
                "timestamp": row['ds'].isoformat(),
                "predicted_value": float(row['yhat']),
                "lower_bound": float(row['yhat_lower']),
                "upper_bound": float(row['yhat_upper'])
            })
        
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        csv_filename = f"prediction_{request.model_name}_{timestamp}.csv"
        csv_path = f"/app/data/prediction/{csv_filename}"
        
        prediction_df = pd.DataFrame(prediction_data)
        prediction_df.to_csv(csv_path, index=False)
        
        final_prediction_time = forecast_df['ds'].iloc[-1].isoformat()
        final_predicted_value = float(forecast_df['yhat'].iloc[-1])
        
        return PredictionResponse(
            success=True,
            message="Prediction completed successfully",
            prediction_csv_path=csv_path,
            final_prediction_time=final_prediction_time,
            final_predicted_value=final_predicted_value
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.delete("/models/{model_name}")
async def delete_model(model_name: str):
    if model_name not in trained_models:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")
    
    del trained_models[model_name]
    return {"message": f"Model '{model_name}' deleted successfully"}

@app.get("/models/{model_name}/info")
async def get_model_info(model_name: str):
    if model_name not in trained_models:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")
    
    _, metadata = load_model(model_name, only_metadata=True)
    
    return metadata

if __name__ == "__main__":    
    uvicorn.run(app, host="0.0.0.0", port=8010)
