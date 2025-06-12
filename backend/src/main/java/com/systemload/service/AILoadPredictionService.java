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
        } catch (Exception e) {
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
                return false;
            }
        }
        
        try {
            String csvPath = exportMetricsToCSV(metricName);
            if (csvPath == null) {
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
            
            return response != null && response.success && response.totalModels > 0;
            
        } catch (Exception e) {
            log.error("Error training models: {}", e.getMessage());
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
            
            PredictionResponse response = webClient.post()
                    .uri("/predict")
                    .body(BodyInserters.fromValue(request))
                    .retrieve()
                    .bodyToMono(PredictionResponse.class)
                    .timeout(Duration.ofMinutes(2))
                    .block();
            
            if (response == null || !response.success) {
                return new PredictionResult(false, 
                        "Prediction failed: " + (response != null ? response.message : "No response"), 
                        null, null, null, periodDescription);
            }
            
            List<Map<String, Object>> predictions = readPredictionCSV(response.predictionCsvPath);
            
            Double finalPredictedValue = response.finalPredictedValue;
            if (predictions != null && !predictions.isEmpty()) {
                Map<String, Object> lastPrediction = predictions.get(predictions.size() - 1);
                Object predictedValueObj = lastPrediction.get("predicted_value");
                if (predictedValueObj instanceof Double) {
                    finalPredictedValue = (Double) predictedValueObj;
                }
            }
            
            boolean isAnomaly = detectAnomalies(predictions);
            List<String> recommendations = generateRecommendations(predictions, periodDescription);
            
            return new PredictionResult(true, "Success", finalPredictedValue, 
                    isAnomaly, recommendations, periodDescription, predictions);
            
        } catch (Exception e) {
            log.error("Error making {} prediction: {}", periodDescription, e.getMessage());
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
            if (!java.nio.file.Files.exists(java.nio.file.Paths.get(csvPath))) {
                return predictions;
            }
            
            if (!java.nio.file.Files.isReadable(java.nio.file.Paths.get(csvPath))) {
                return predictions;
            }
            
            List<String> lines = java.nio.file.Files.readAllLines(java.nio.file.Paths.get(csvPath));
            
            if (lines.size() <= 1) {
                return predictions;
            }
            
            for (int i = 1; i < lines.size(); i++) {
                String line = lines.get(i);
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
                        // Skip invalid lines
                    }
                }
            }
            
        } catch (Exception e) {
            log.error("Error reading prediction CSV file {}: {}", csvPath, e.getMessage());
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
                return null;
            }
            
            String csvPath = "/app/data/metrics_crawled/system_metrics_" + metricName + "_" + System.currentTimeMillis() + ".csv";
            
            StringBuilder csvContent = new StringBuilder();
            csvContent.append("Timestamp;").append(metricName).append("\n");
            
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
            
            return csvPath;
            
        } catch (Exception e) {
            log.error("Error exporting metrics to CSV: {}", e.getMessage());
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
            case "disk_read_throughput_kbs":
                return metric.getDiskReadThroughputKbs();
            case "disk_write_throughput_kbs":
                return metric.getDiskWriteThroughputKbs();
            case "network_received_throughput_kbs":
                return metric.getNetworkReceivedThroughputKbs();
            case "network_transmitted_throughput_kbs":
                return metric.getNetworkTransmittedThroughputKbs();
            case "overall_load_score":
                return metric.getOverallLoadScore();
            default:
                return null;
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
            return recommendations;
        }
        
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
            log.error("Error fetching available models: {}", e.getMessage());
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