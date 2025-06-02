import axios from "axios";

const API_BASE_URL = "http://localhost:8080/api"; // Adjust if your backend URL is different

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// --- System Metrics API --- //
export const getSystemMetricsForTimeRange = (start: string, end: string) => {
  return apiClient.get("/metrics/range", { params: { start, end } });
};

export const getLatestSystemMetrics = (since: string) => {
  return apiClient.get("/metrics/latest", { params: { since } });
};

export const getAverageCpuUsage = (start: string, end: string) => {
  return apiClient.get("/metrics/average/cpu", { params: { start, end } });
};

export const getAverageMemoryUsage = (start: string, end: string) => {
  return apiClient.get("/metrics/average/memory", { params: { start, end } });
};

// --- Predictions API --- //
export const getFuturePredictions = () => {
  return apiClient.get("/predictions/future");
};

export const getPredictionsByTimeRange = (start: string, end: string) => {
  return apiClient.get("/predictions/range", { params: { start, end } });
};

export const getPredictionsByModel = (modelType: string) => {
  return apiClient.get(`/predictions/model/${modelType}`);
};

export const triggerPredictionGeneration = () => {
  return apiClient.post("/predictions/generate");
};

// --- Resource Optimization API --- //
export const getResourceOptimizationAnalysis = () => {
  return apiClient.get("/optimization/analysis");
};

export const getOptimizationReport = (start: string, end: string) => {
  return apiClient.get("/optimization/report", { params: { start, end } });
};

// Interface for SystemMetric (align with backend SystemMetrics.java)
export interface SystemMetric {
  id: number;
  timestamp: string; // LocalDateTime is typically serialized as ISO string
  cpuUsage: number;
  memoryUsage: number;
  networkUsage: number;
  diskUsage: number;
  hostname?: string;
  serviceName?: string;
}

// Interface for SystemPrediction (align with backend SystemPrediction.java)
export interface SystemPrediction {
  id: number;
  timestamp: string; // Time of recording the prediction
  predictionTime: string; // The future time this prediction is for
  predictedCpuUsage: number;
  predictedMemoryUsage: number;
  predictedNetworkUsage: number;
  predictedDiskUsage: number;
  modelType?: string;
  confidence?: number;
  recommendation?: string;
}

export default apiClient;
