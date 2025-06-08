package com.systemload.service;

import com.systemload.model.SystemMetrics;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import weka.classifiers.functions.LinearRegression;
import weka.classifiers.trees.RandomForest;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instance;
import weka.core.Instances;

import javax.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;

/**
 * AI Prediction Service using Weka ML algorithms for load prediction
 */
@Slf4j
@Service
public class AILoadPredictionService {
    
    @Autowired
    private MetricsCollectorService metricsCollectorService;
    
    private LinearRegression loadPredictor;
    private RandomForest anomalyDetector;
    private Instances trainingDataset;
    private boolean modelTrained = false;
    
    @PostConstruct
    public void init() {
        initializeModels();
        log.info("AILoadPredictionService initialized");
    }
    
    /**
     * Initialize ML models
     */
    private void initializeModels() {
        // Initialize attributes for dataset
        ArrayList<Attribute> attributes = new ArrayList<>();
        attributes.add(new Attribute("cpu_usage_percent"));
        attributes.add(new Attribute("memory_usage_percent"));
        attributes.add(new Attribute("disk_read_throughput"));
        attributes.add(new Attribute("disk_write_throughput"));
        attributes.add(new Attribute("network_rx_throughput"));
        attributes.add(new Attribute("network_tx_throughput"));
        attributes.add(new Attribute("cpu_load_score"));
        attributes.add(new Attribute("io_load_score"));
        
        // Target attribute
        attributes.add(new Attribute("overall_load_score"));
        
        // Create empty dataset
        trainingDataset = new Instances("SystemLoadDataset", attributes, 0);
        trainingDataset.setClassIndex(trainingDataset.numAttributes() - 1);
        
        // Initialize models
        loadPredictor = new LinearRegression();
        anomalyDetector = new RandomForest();
        
        log.info("ML models initialized with {} attributes", attributes.size());
    }
    
    /**
     * Train models with recent data
     */
    public boolean trainModels() {
        log.info("Starting model training...");
        
        try {
            // Get training data from last 24 hours
            List<SystemMetrics> metrics = metricsCollectorService.getRecentMetrics(24);
            
            if (metrics.size() < 10) {
                log.warn("Insufficient training data. Need at least 10 samples, got {}", metrics.size());
                return false;
            }
            
            // Clear existing training data
            trainingDataset.delete();
            
            // Convert metrics to Weka instances
            for (SystemMetrics metric : metrics) {
                if (isValidMetric(metric)) {
                    Instance instance = createInstance(metric);
                    trainingDataset.add(instance);
                }
            }
            
            if (trainingDataset.numInstances() < 5) {
                log.warn("Not enough valid training instances: {}", trainingDataset.numInstances());
                return false;
            }
            
            // Train load predictor
            loadPredictor.buildClassifier(trainingDataset);
            
            // Train anomaly detector
            anomalyDetector.buildClassifier(trainingDataset);
            
            modelTrained = true;
            log.info("Models trained successfully with {} instances", trainingDataset.numInstances());
            return true;
            
        } catch (Exception e) {
            log.error("Error training models: {}", e.getMessage(), e);
            return false;
        }
    }
    
    /**
     * Predict future load score based on current metrics
     */
    public PredictionResult predictLoad(SystemMetrics currentMetrics) {
        if (!modelTrained) {
            log.warn("Models not trained yet. Training with available data...");
            if (!trainModels()) {
                return new PredictionResult(false, "Models not trained", null, null, null);
            }
        }
        
        try {
            Instance instance = createInstanceForPrediction(currentMetrics);
            
            // Predict load score
            double predictedLoad = loadPredictor.classifyInstance(instance);
            
            // Detect anomaly
            boolean isAnomaly = isAnomalyDetected(currentMetrics, predictedLoad);
            
            // Generate recommendations
            List<String> recommendations = generateRecommendations(currentMetrics, predictedLoad, isAnomaly);
            
            log.info("Prediction completed: Load={:.2f}, Anomaly={}, Recommendations={}", 
                    predictedLoad, isAnomaly, recommendations.size());
            
            return new PredictionResult(true, "Success", predictedLoad, isAnomaly, recommendations);
            
        } catch (Exception e) {
            log.error("Error making prediction: {}", e.getMessage(), e);
            return new PredictionResult(false, "Prediction failed: " + e.getMessage(), null, null, null);
        }
    }
    
    /**
     * Create Weka instance from SystemMetrics
     */
    private Instance createInstance(SystemMetrics metrics) {
        double[] values = new double[trainingDataset.numAttributes()];
        
        values[0] = metrics.getCpuUsagePercent() != null ? metrics.getCpuUsagePercent() : 0.0;
        values[1] = metrics.getMemoryUsagePercent() != null ? metrics.getMemoryUsagePercent() : 0.0;
        values[2] = metrics.getDiskReadThroughputKbs() != null ? metrics.getDiskReadThroughputKbs() : 0.0;
        values[3] = metrics.getDiskWriteThroughputKbs() != null ? metrics.getDiskWriteThroughputKbs() : 0.0;
        values[4] = metrics.getNetworkReceivedThroughputKbs() != null ? metrics.getNetworkReceivedThroughputKbs() : 0.0;
        values[5] = metrics.getNetworkTransmittedThroughputKbs() != null ? metrics.getNetworkTransmittedThroughputKbs() : 0.0;
        values[6] = metrics.getCpuLoadScore() != null ? metrics.getCpuLoadScore() : 0.0;
        values[7] = metrics.getIoLoadScore() != null ? metrics.getIoLoadScore() : 0.0;
        values[8] = metrics.getOverallLoadScore() != null ? metrics.getOverallLoadScore() : 0.0; // Target
        
        return new DenseInstance(1.0, values);
    }
    
    /**
     * Create instance for prediction (without target value)
     */
    private Instance createInstanceForPrediction(SystemMetrics metrics) {
        Instance instance = createInstance(metrics);
        instance.setDataset(trainingDataset);
        instance.setMissing(trainingDataset.classIndex()); // Set target as missing
        return instance;
    }
    
    /**
     * Check if metric is valid for training
     */
    private boolean isValidMetric(SystemMetrics metric) {
        return metric.getCpuUsagePercent() != null && 
               metric.getMemoryUsagePercent() != null && 
               metric.getOverallLoadScore() != null &&
               metric.getCpuUsagePercent() >= 0 && metric.getCpuUsagePercent() <= 100 &&
               metric.getMemoryUsagePercent() >= 0 && metric.getMemoryUsagePercent() <= 100;
    }
    
    /**
     * Detect anomalies based on thresholds and patterns
     */
    private boolean isAnomalyDetected(SystemMetrics metrics, double predictedLoad) {
        double actualLoad = metrics.getOverallLoadScore() != null ? metrics.getOverallLoadScore() : 0.0;
        
        // Anomaly if prediction differs significantly from actual
        double loadDifference = Math.abs(predictedLoad - actualLoad);
        
        // High CPU usage anomaly
        boolean highCpuAnomaly = metrics.getCpuUsagePercent() != null && metrics.getCpuUsagePercent() > 90;
        
        // High memory usage anomaly
        boolean highMemoryAnomaly = metrics.getMemoryUsagePercent() != null && metrics.getMemoryUsagePercent() > 85;
        
        // Sudden load spike
        boolean loadSpikeAnomaly = actualLoad > 80 && loadDifference > 20;
        
        return highCpuAnomaly || highMemoryAnomaly || loadSpikeAnomaly;
    }
    
    /**
     * Generate recommendations based on predictions
     */
    private List<String> generateRecommendations(SystemMetrics metrics, double predictedLoad, boolean isAnomaly) {
        List<String> recommendations = new ArrayList<>();
        
        if (predictedLoad > 80) {
            recommendations.add("High system load predicted. Consider scaling up resources.");
        }
        
        if (metrics.getCpuUsagePercent() != null && metrics.getCpuUsagePercent() > 85) {
            recommendations.add("High CPU usage detected. Consider optimizing CPU-intensive processes.");
        }
        
        if (metrics.getMemoryUsagePercent() != null && metrics.getMemoryUsagePercent() > 80) {
            recommendations.add("High memory usage detected. Consider increasing memory allocation.");
        }
        
        if (metrics.getIoLoadScore() != null && metrics.getIoLoadScore() > 70) {
            recommendations.add("High I/O load detected. Consider optimizing disk operations or network usage.");
        }
        
        if (isAnomaly) {
            recommendations.add("Anomaly detected in system behavior. Monitor closely for potential issues.");
        }
        
        if (predictedLoad < 30) {
            recommendations.add("Low system load predicted. Consider scaling down resources to optimize costs.");
        }
        
        return recommendations;
    }
    
    /**
     * Get model training status
     */
    public boolean isModelTrained() {
        return modelTrained;
    }
    
    /**
     * Force retrain models
     */
    public boolean retrain() {
        modelTrained = false;
        return trainModels();
    }
    
    /**
     * Prediction result container
     */
    public static class PredictionResult {
        private final boolean success;
        private final String message;
        private final Double predictedLoad;
        private final Boolean isAnomaly;
        private final List<String> recommendations;
        
        public PredictionResult(boolean success, String message, Double predictedLoad, Boolean isAnomaly, List<String> recommendations) {
            this.success = success;
            this.message = message;
            this.predictedLoad = predictedLoad;
            this.isAnomaly = isAnomaly;
            this.recommendations = recommendations;
        }
        
        // Getters
        public boolean isSuccess() { return success; }
        public String getMessage() { return message; }
        public Double getPredictedLoad() { return predictedLoad; }
        public Boolean getIsAnomaly() { return isAnomaly; }
        public List<String> getRecommendations() { return recommendations; }
    }
} 