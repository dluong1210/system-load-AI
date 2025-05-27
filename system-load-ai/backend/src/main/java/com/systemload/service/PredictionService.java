package com.systemload.service;

import com.systemload.model.SystemMetrics;
import com.systemload.model.SystemPrediction;
import com.systemload.repository.SystemMetricsRepository;
import com.systemload.repository.SystemPredictionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PredictionService {
    
    private final SystemMetricsRepository metricsRepository;
    private final SystemPredictionRepository predictionRepository;
    private final MLModelService mlModelService;
    
    @Scheduled(cron = "0 0 * * * *") // Run every hour
    public void generatePredictions() {
        try {
            // Get historical data for the last 7 days
            LocalDateTime end = LocalDateTime.now();
            LocalDateTime start = end.minusDays(7);
            List<SystemMetrics> historicalData = metricsRepository.findByTimestampBetween(start, end);
            
            // Train ML model
            mlModelService.trainModel(historicalData);
            
            // Generate predictions for next 24 hours
            List<SystemPrediction> predictions = mlModelService.predictNext24Hours(end);
            
            // Save predictions
            for (SystemPrediction prediction : predictions) {
                prediction.setRecommendation(generateRecommendation(prediction));
                predictionRepository.save(prediction);
            }
            
            log.info("Predictions generated successfully");
        } catch (Exception e) {
            log.error("Error generating predictions", e);
        }
    }
    
    private String generateRecommendation(SystemPrediction prediction) {
        StringBuilder recommendation = new StringBuilder();
        
        if (prediction.getPredictedCpuUsage() > 80) {
            recommendation.append("Consider scaling CPU resources. ");
        }
        if (prediction.getPredictedMemoryUsage() > 80) {
            recommendation.append("Consider increasing memory allocation. ");
        }
        if (prediction.getPredictedNetworkUsage() > 80) {
            recommendation.append("Consider optimizing network bandwidth. ");
        }
        if (prediction.getPredictedDiskUsage() > 80) {
            recommendation.append("Consider expanding storage capacity. ");
        }
        
        return recommendation.length() > 0 ? recommendation.toString() : "No immediate action required.";
    }
    
    public List<SystemPrediction> getFuturePredictions() {
        return predictionRepository.findFuturePredictions(LocalDateTime.now());
    }
    
    public List<SystemPrediction> getPredictionsByTimeRange(LocalDateTime start, LocalDateTime end) {
        return predictionRepository.findByPredictionTimeBetween(start, end);
    }
    
    public List<SystemPrediction> getPredictionsByModel(String modelType) {
        return predictionRepository.findByModelType(modelType);
    }
    
    public double evaluateModel() {
        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusDays(1);
        List<SystemMetrics> testData = metricsRepository.findByTimestampBetween(start, end);
        return mlModelService.evaluateModel(testData);
    }
} 