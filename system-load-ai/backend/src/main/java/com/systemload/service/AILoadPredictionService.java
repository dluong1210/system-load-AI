package com.systemload.service;

import com.systemload.model.SystemMetrics;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.BodyInserters;
import reactor.core.publisher.Mono;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.PostConstruct;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AI Prediction Service using Python ML API for load prediction
 */
@Slf4j
@Service
public class AILoadPredictionService {
    
    @Autowired
    private MetricsCollectorService metricsCollectorService;
    
    @Value("${ml_models.api.url:http://ml_models:8010}")
    private String mlApiUrl;
    
    private WebClient webClient;
    private boolean serviceReady = false;
    
    @PostConstruct
    public void init() {
        webClient = WebClient.builder()
                .baseUrl(mlApiUrl)
                .build();
        
        checkMLServiceHealth();
        log.info("AILoadPredictionService initialized with ML API URL: {}", mlApiUrl);
    }
    
    /**
     * Check if ML service is healthy
     */
    private void checkMLServiceHealth() {
        try {
            String response = webClient.get()
                    .uri("/health")
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(5))
                    .block();
            
            serviceReady = response != null;
            log.info("ML Service health check: {}", serviceReady ? "HEALTHY" : "UNHEALTHY");
        } catch (Exception e) {
            log.warn("ML Service health check failed: {}", e.getMessage());
            serviceReady = false;
        }
    }
    
    /**
     * Train model with recent data and specific metric
     */
    public boolean trainModel(String metricName, String modelName) {
        if (!serviceReady) {
            checkMLServiceHealth();
            if (!serviceReady) {
                log.error("ML Service is not available");
                return false;
            }
        }
        
        log.info("Starting multi-model training for metric: {} with base model name: {}", metricName, modelName);
        
        try {
            // Export recent metrics to CSV for training
            String csvPath = exportMetricsToCSV(metricName);
            if (csvPath == null) {
                log.error("Failed to export metrics to CSV");
                return false;
            }
            
            MultiModelTrainingRequest request = new MultiModelTrainingRequest();
            request.csvFilepath = csvPath;
            request.metricName = metricName;
            request.baseModelName = modelName;
            request.capValue = 100.0;
            request.floorValue = 0.0;
            
            MultiModelTrainingResponse response = webClient.post()
                    .uri("/train_multi_models")
                    .body(BodyInserters.fromValue(request))
                    .retrieve()
                    .bodyToMono(MultiModelTrainingResponse.class)
                    .timeout(Duration.ofMinutes(10))
                    .block();
            
            boolean success = response != null && response.success && response.totalModels > 0;
            
            if (success && response.modelsTrained != null) {
                log.info("Multi-model training completed: SUCCESS");
                log.info("Total models trained: {}", response.totalModels);
                
                for (ModelTrainingResult result : response.modelsTrained) {
                    if (result.success) {
                        log.info("✓ Model '{}' trained successfully with {} data points", 
                                result.modelName, result.dataPoints);
                    } else {
                        log.warn("✗ Model '{}' training failed: {}", 
                                result.modelName, result.message);
                    }
                }
            } else {
                log.error("Multi-model training failed: {}", 
                        response != null ? response.message : "No response");
            }
            
            return success;
            
        } catch (Exception e) {
            log.error("Error training models: {}", e.getMessage(), e);
            return false;
        }
    }
    
    /**
     * Predict load for 1 hour ahead
     */
    public PredictionResult predict1Hour(String modelName) {
        return makePrediction(modelName + "_1h", 3600, "1 hour"); // Use 1h-specific model
    }
    
    /**
     * Predict load for 6 hours ahead
     */
    public PredictionResult predict6Hours(String modelName) {
        return makePrediction(modelName + "_6h", 21600, "6 hours"); // Use 6h-specific model
    }
    
    /**
     * Predict load for 24 hours ahead
     */
    public PredictionResult predict24Hours(String modelName) {
        return makePrediction(modelName + "_24h", 86400, "24 hours"); // Use 24h-specific model
    }
    
    /**
     * Make prediction for specified time period
     */
    private PredictionResult makePrediction(String modelName, int periodSeconds, String periodDescription) {
        if (!serviceReady) {
            checkMLServiceHealth();
            if (!serviceReady) {
                return new PredictionResult(false, "ML Service is not available", null, null, null, periodDescription);
            }
        }
        
        try {
            PredictionRequest request = new PredictionRequest();
            request.modelName = modelName;
            request.futurePeriods = 60;
            request.freqSeconds = (periodSeconds / 60) + "S";
            request.capValue = 110.0;
            request.floorValue = 0.0;
            
            log.info("Making prediction request: modelName={}, futurePeriods={}, freqSeconds={}", 
                    request.modelName, request.futurePeriods, request.freqSeconds);
            
            PredictionResponse response = webClient.post()
                    .uri("/predict")
                    .body(BodyInserters.fromValue(request))
                    .retrieve()
                    .bodyToMono(PredictionResponse.class)
                    .timeout(Duration.ofMinutes(2))
                    .block();
            
            log.info("Received prediction response: success={}, message={}, csvPath={}, finalValue={}", 
                    response != null ? response.success : "null", 
                    response != null ? response.message : "null",
                    response != null ? response.predictionCsvPath : "null",
                    response != null ? response.finalPredictedValue : "null");
            
            if (response == null || !response.success) {
                log.error("Prediction failed with response: {}", response);
                return new PredictionResult(false, 
                        "Prediction failed: " + (response != null ? response.message : "No response"), 
                        null, null, null, periodDescription);
            }
            
            // Read prediction results from CSV file
            List<Map<String, Object>> predictions = readPredictionCSV(response.predictionCsvPath);
            
            // Get final predicted value from CSV data (more reliable than ML service response)
            Double finalPredictedValue = response.finalPredictedValue;
            if (predictions != null && !predictions.isEmpty()) {
                Map<String, Object> lastPrediction = predictions.get(predictions.size() - 1);
                Object predictedValueObj = lastPrediction.get("predicted_value");
                if (predictedValueObj instanceof Double) {
                    finalPredictedValue = (Double) predictedValueObj;
                }
            }
            
            // Analyze predictions for anomalies and recommendations
            boolean isAnomaly = detectAnomalies(predictions);
            List<String> recommendations = generateRecommendations(predictions, periodDescription);
            
            log.info("Prediction completed for {}: Final value={:.2f}, Anomaly={}, Recommendations={}", 
                    periodDescription, finalPredictedValue, isAnomaly, recommendations.size());
            
            return new PredictionResult(true, "Success", finalPredictedValue, 
                    isAnomaly, recommendations, periodDescription, predictions);
            
        } catch (Exception e) {
            log.error("Error making {} prediction: {}", periodDescription, e.getMessage(), e);
            return new PredictionResult(false, "Prediction failed: " + e.getMessage(), 
                    null, null, null, periodDescription);
        }
    }
    
    /**
     * Read prediction results from CSV file
     */
    private List<Map<String, Object>> readPredictionCSV(String csvPath) {
        List<Map<String, Object>> predictions = new ArrayList<>();
        
        try {
            log.info("Attempting to read prediction CSV from path: {}", csvPath);
            
            // Check if file exists
            if (!java.nio.file.Files.exists(java.nio.file.Paths.get(csvPath))) {
                log.error("CSV file does not exist at path: {}", csvPath);
                return predictions;
            }
            
            // Check if file is readable
            if (!java.nio.file.Files.isReadable(java.nio.file.Paths.get(csvPath))) {
                log.error("CSV file is not readable at path: {}", csvPath);
                return predictions;
            }
            
            List<String> lines = java.nio.file.Files.readAllLines(java.nio.file.Paths.get(csvPath));
            log.info("Successfully read {} lines from CSV file", lines.size());
            
            if (lines.size() <= 1) {
                log.warn("No prediction data found in CSV: {} (only {} lines)", csvPath, lines.size());
                return predictions;
            }
            
            // Log the header line
            if (lines.size() > 0) {
                log.info("CSV header: {}", lines.get(0));
            }
            
            // Skip header line
            for (int i = 1; i < lines.size(); i++) {
                String line = lines.get(i);
                log.debug("Processing CSV line {}: {}", i, line);
                String[] parts = line.split(",");
                
                if (parts.length >= 4) {
                    try {
                        Map<String, Object> prediction = new HashMap<>();
                        prediction.put("timestamp", parts[0]);
                        prediction.put("predicted_value", Double.parseDouble(parts[1]));
                        prediction.put("lower_bound", Double.parseDouble(parts[2]));
                        prediction.put("upper_bound", Double.parseDouble(parts[3]));
                        predictions.add(prediction);
                    } catch (NumberFormatException e) {
                        log.warn("Failed to parse numeric values in line {}: {}", i, line);
                    }
                } else {
                    log.warn("Insufficient columns in CSV line {}: {} (expected 4, got {})", i, line, parts.length);
                }
            }
            
            log.info("Successfully parsed {} predictions from CSV: {}", predictions.size(), csvPath);
            
        } catch (Exception e) {
            log.error("Error reading prediction CSV file {}: {}", csvPath, e.getMessage(), e);
        }
        
        return predictions;
    }
    
    /**
     * Export metrics to CSV for training
     */
    private String exportMetricsToCSV(String metricName) {
        try {
            List<SystemMetrics> metrics = metricsCollectorService.getRecentMetrics(24);
            if (metrics.size() < 10) {
                log.warn("Insufficient data for training. Need at least 10 samples, got {}", metrics.size());
                return null;
            }
            
            String csvPath = "/app/data/metrics_crawled/system_metrics_" + metricName + "_" + System.currentTimeMillis() + ".csv";
            
            StringBuilder csvContent = new StringBuilder();
            csvContent.append("Timestamp;").append(metricName).append("\n"); // ML service expects Timestamp and metric_name columns
            
            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            
            for (SystemMetrics metric : metrics) {
                java.time.LocalDateTime dateTime = java.time.LocalDateTime.ofInstant(
                    java.time.Instant.ofEpochMilli(metric.getTimestamp()), 
                    java.time.ZoneId.systemDefault()
                );
                String timestamp = dateTime.format(formatter);
                Double value = getMetricValue(metric, metricName);
                if (value != null) {
                    csvContent.append(timestamp).append(";").append(value).append("\n");
                }
            }
            
            java.nio.file.Files.write(
                java.nio.file.Paths.get(csvPath), 
                csvContent.toString().getBytes()
            );
            
            log.info("CSV exported to: {} with {} records", csvPath, metrics.size());
            return csvPath;
            
        } catch (Exception e) {
            log.error("Error exporting metrics to CSV: {}", e.getMessage(), e);
            return null;
        }
    }
    
    /**
     * Get metric value by name
     */
    private Double getMetricValue(SystemMetrics metric, String metricName) {
        switch (metricName.toLowerCase()) {
            case "cpu_usage_percent":
                return metric.getCpuUsagePercent();
            case "memory_usage_percent":
                return metric.getMemoryUsagePercent();
            case "overall_load_score":
                return metric.getOverallLoadScore();
            case "cpu_load_score":
                return metric.getCpuLoadScore();
            case "io_load_score":
                return metric.getIoLoadScore();
            case "disk_read_throughput":
                return metric.getDiskReadThroughputKbs();
            case "disk_write_throughput":
                return metric.getDiskWriteThroughputKbs();
            case "network_rx_throughput":
                return metric.getNetworkReceivedThroughputKbs();
            case "network_tx_throughput":
                return metric.getNetworkTransmittedThroughputKbs();
            default:
                return metric.getOverallLoadScore();
        }
    }
    
    /**
     * Detect anomalies in predictions
     */
    private boolean detectAnomalies(List<Map<String, Object>> predictions) {
        if (predictions == null || predictions.isEmpty()) {
            return false;
        }
        
        for (Map<String, Object> prediction : predictions) {
            Double predictedValue = (Double) prediction.get("predicted_value");
            if (predictedValue != null && predictedValue > 90.0) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Generate recommendations based on predictions
     */
    private List<String> generateRecommendations(List<Map<String, Object>> predictions, String period) {
        List<String> recommendations = new ArrayList<>();
        
        if (predictions == null || predictions.isEmpty()) {
            recommendations.add("No prediction data available for analysis.");
            return recommendations;
        }
        
        // Get final predicted value
        Map<String, Object> finalPrediction = predictions.get(predictions.size() - 1);
        Double finalValue = (Double) finalPrediction.get("predicted_value");
        
        if (finalValue != null) {
            if (finalValue > 85) {
                recommendations.add(String.format("High system load predicted for %s (%.1f%%). Consider scaling up resources.", period, finalValue));
            } else if (finalValue > 70) {
                recommendations.add(String.format("Moderate system load predicted for %s (%.1f%%). Monitor resource usage closely.", period, finalValue));
            } else if (finalValue < 30) {
                recommendations.add(String.format("Low system load predicted for %s (%.1f%%). Consider scaling down to optimize costs.", period, finalValue));
            } else {
                recommendations.add(String.format("Normal system load predicted for %s (%.1f%%). Current resource allocation appears adequate.", period, finalValue));
            }
        }
        
        // Check for trends
        if (predictions.size() > 1) {
            Double firstValue = (Double) predictions.get(0).get("predicted_value");
            if (firstValue != null && finalValue != null) {
                double trend = finalValue - firstValue;
                if (trend > 20) {
                    recommendations.add("Increasing load trend detected. Prepare for potential resource scaling.");
                } else if (trend < -20) {
                    recommendations.add("Decreasing load trend detected. Resources may be over-provisioned.");
                }
            }
        }
        
        return recommendations;
    }
    
    /**
     * Get available models from ML service
     */
    public List<String> getAvailableModels() {
        if (!serviceReady) {
            checkMLServiceHealth();
            if (!serviceReady) {
                return new ArrayList<>();
            }
        }
        
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = webClient.get()
                    .uri("/models")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();
            
            if (response != null && response.containsKey("models")) {
                @SuppressWarnings("unchecked")
                List<String> models = (List<String>) response.get("models");
                return models;
            }
            
        } catch (Exception e) {
            log.error("Error fetching available models: {}", e.getMessage(), e);
        }
        
        return new ArrayList<>();
    }
    
    /**
     * Check if ML service is ready
     */
    public boolean isServiceReady() {
        return serviceReady;
    }
    
    // DTO Classes for API communication
    public static class TrainingRequest {
        @JsonProperty("csv_filepath")
        public String csvFilepath;
        
        @JsonProperty("metric_name")
        public String metricName;
        
        @JsonProperty("cap_value")
        public Double capValue = 100.0;
        
        @JsonProperty("floor_value")
        public Double floorValue = 0.0;
        
        @JsonProperty("model_name")
        public String modelName = "default";
    }
    
    public static class MultiModelTrainingRequest {
        @JsonProperty("csv_filepath")
        public String csvFilepath;
        
        @JsonProperty("metric_name")
        public String metricName;
        
        @JsonProperty("cap_value")
        public Double capValue = 100.0;
        
        @JsonProperty("floor_value")
        public Double floorValue = 0.0;
        
        @JsonProperty("base_model_name")
        public String baseModelName = "default";
    }
    
    public static class TrainingResponse {
        public boolean success;
        public String message;
        
        @JsonProperty("model_name")
        public String modelName;
        
        @JsonProperty("data_points")
        public Integer dataPoints;
    }
    
    public static class ModelTrainingResult {
        @JsonProperty("model_name")
        public String modelName;
        public boolean success;
        public String message;
        @JsonProperty("data_points")
        public Integer dataPoints;
    }
    
    public static class MultiModelTrainingResponse {
        public boolean success;
        public String message;
        
        @JsonProperty("models_trained")
        public List<ModelTrainingResult> modelsTrained;
        
        @JsonProperty("total_models")
        public Integer totalModels;
    }
    
    public static class PredictionRequest {
        @JsonProperty("model_name")
        public String modelName = "default";
        
        @JsonProperty("future_periods_seconds")
        public Integer futurePeriods;
        
        @JsonProperty("freq_seconds")
        public String freqSeconds = "60S";
        
        @JsonProperty("cap_value")
        public Double capValue = 110.0;
        
        @JsonProperty("floor_value")
        public Double floorValue = 0.0;
    }
    
    public static class PredictionResponse {
        public boolean success;
        public String message;
        
        @JsonProperty("prediction_csv_path")
        public String predictionCsvPath;
        
        @JsonProperty("final_prediction_time")
        public String finalPredictionTime;
        
        @JsonProperty("final_predicted_value")
        public Double finalPredictedValue;
    }
    
    /**
     * Enhanced Prediction result container
     */
    public static class PredictionResult {
        private final boolean success;
        private final String message;
        private final Double predictedLoad;
        private final Boolean isAnomaly;
        private final List<String> recommendations;
        private final String predictionPeriod;
        private final List<Map<String, Object>> detailedPredictions;
        
        public PredictionResult(boolean success, String message, Double predictedLoad, Boolean isAnomaly, 
                               List<String> recommendations, String predictionPeriod) {
            this(success, message, predictedLoad, isAnomaly, recommendations, predictionPeriod, null);
        }
        
        public PredictionResult(boolean success, String message, Double predictedLoad, Boolean isAnomaly, 
                               List<String> recommendations, String predictionPeriod, List<Map<String, Object>> detailedPredictions) {
            this.success = success;
            this.message = message;
            this.predictedLoad = predictedLoad;
            this.isAnomaly = isAnomaly;
            this.recommendations = recommendations;
            this.predictionPeriod = predictionPeriod;
            this.detailedPredictions = detailedPredictions;
        }
        
        // Getters
        public boolean isSuccess() { return success; }
        public String getMessage() { return message; }
        public Double getPredictedLoad() { return predictedLoad; }
        public Boolean getIsAnomaly() { return isAnomaly; }
        public List<String> getRecommendations() { return recommendations; }
        public String getPredictionPeriod() { return predictionPeriod; }
        public List<Map<String, Object>> getDetailedPredictions() { return detailedPredictions; }
    }
} 