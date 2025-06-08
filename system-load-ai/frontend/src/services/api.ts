import axios from "axios";

// Use relative path in development to leverage Vite proxy
// In production, this should be the full backend URL
const API_BASE_URL =
  process.env.NODE_ENV === "production" ? "http://localhost:8080/api" : "/api"; // This will be proxied by Vite to backend

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log(
      `Making ${config.method?.toUpperCase()} request to: ${config.baseURL}${
        config.url
      }`
    );
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
apiClient.interceptors.response.use(
  (response) => {
    console.log(`Response from ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    console.error(`Error from ${error.config?.url}:`, error.message);
    return Promise.reject(error);
  }
);

// --- System Load API (matching SystemLoadController.java) --- //

// Get current metrics from mock server
export const getCurrentMetrics = () => {
  return apiClient.get("/system-load/current");
};

// Collect and store metrics
export const collectMetrics = () => {
  return apiClient.post("/system-load/collect");
};

// Get historical metrics
export const getHistoricalMetrics = (hours: number = 24) => {
  return apiClient.get("/system-load/history", { params: { hours } });
};

// Get load prediction
export const getLoadPrediction = () => {
  return apiClient.get("/system-load/predict");
};

// Train AI models
export const trainModels = () => {
  return apiClient.post("/system-load/train");
};

// Get system statistics
export const getSystemStatistics = (hours: number = 24) => {
  return apiClient.get("/system-load/stats", { params: { hours } });
};

// Health check
export const getHealthCheck = () => {
  return apiClient.get("/system-load/health");
};

// --- Legacy API methods for backward compatibility --- //
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

export const getResourceOptimizationAnalysis = () => {
  return apiClient.get("/optimization/analysis");
};

export const getOptimizationReport = (start: string, end: string) => {
  return apiClient.get("/optimization/report", { params: { start, end } });
};

// --- Interfaces matching backend models --- //

// Interface for SystemMetrics (matching backend SystemMetrics.java)
export interface SystemMetrics {
  id: number;
  timestamp: number;
  collectedAt: string;

  // CPU Metrics
  cpuUsagePercent: number;
  cpuUsageMhz: number;
  cpuCores: number;
  cpuCapacityMhz: number;

  // Memory Metrics
  memoryUsageKb: number;
  memoryCapacityKb: number;
  memoryUsagePercent: number;

  // Disk I/O Metrics
  diskReadThroughputKbs: number;
  diskWriteThroughputKbs: number;

  // Network I/O Metrics
  networkReceivedThroughputKbs: number;
  networkTransmittedThroughputKbs: number;

  // Calculated Metrics
  cpuLoadScore: number;
  ioLoadScore: number;
  overallLoadScore: number;
  diskLoadScore: number;
  networkLoadScore: number;
}

// Interface for actual API response format (matching @JsonProperty from backend)
export interface SystemMetricsApiResponse {
  id: number;
  timestamp: number;
  collectedAt: string;

  // CPU Metrics (from @JsonProperty)
  usage_percent: number;
  usage_mhz: number;
  cores: number;
  capacity_mhz: number;

  // Memory Metrics (from @JsonProperty)
  usage_kb: number;
  capacity_kb: number;

  // Disk I/O Metrics (from @JsonProperty)
  read_throughput_kbs: number;
  write_throughput_kbs: number;

  // Network I/O Metrics (from @JsonProperty)
  received_throughput_kbs: number;
  transmitted_throughput_kbs: number;

  // Calculated Metrics (standard property names)
  memoryUsagePercent: number;
  cpuLoadScore: number;
  ioLoadScore: number;
  overallLoadScore: number;
  diskLoadScore: number;
  networkLoadScore: number;
}

// Interface for API Response
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  count?: number;
  hours?: number;
}

// Interface for Prediction Result
export interface PredictionResult {
  success: boolean;
  message: string;
  predictedLoad: number | null;
  isAnomaly: boolean | null;
  recommendations: string[] | null;
}

// Interface for System Statistics
export interface SystemStatistics {
  totalDataPoints: number;
  avgCpuUsage: number;
  avgMemoryUsage: number;
  avgLoadScore: number;
  maxLoadScore: number;
  anomalyCount: number;
  timeRange: {
    start: string;
    end: string;
  };
}

// Interface for Health Check - matching backend controller response
export interface HealthStatus {
  isConnectionHealthy: boolean;
  aiModels: boolean;
  timestamp: number;
}

// Legacy interfaces for backward compatibility
export interface SystemMetric {
  id: number;
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  networkUsage: number;
  diskUsage: number;
  hostname?: string;
  serviceName?: string;
}

export interface SystemPrediction {
  id: number;
  timestamp: string;
  predictionTime: string;
  predictedCpuUsage: number;
  predictedMemoryUsage: number;
  predictedNetworkUsage: number;
  predictedDiskUsage: number;
  modelType?: string;
  confidence?: number;
  recommendation?: string;
}

// Interface for Current Metrics API Response
export interface CurrentMetricsResponse {
  success?: boolean;
  data?: SystemMetrics;
  error?: string;
}

// Interface for Prediction API Response - matching backend controller
export interface PredictionApiResponse {
  currentMetrics: SystemMetrics;
  prediction: {
    success: boolean;
    message: string;
    predictedLoad: number | null;
    isAnomaly: boolean | null;
    recommendations: string[] | null;
  };
  error?: string;
}

// Interface for Train Models API Response - matching backend controller
export interface TrainModelsResponse {
  success: boolean;
  modelTrained: boolean;
  message?: string;
}

// Interface for Collect Metrics Response
export interface CollectMetricsResponse {
  success?: boolean;
  data?: SystemMetrics;
  error?: string;
}

export default apiClient;
