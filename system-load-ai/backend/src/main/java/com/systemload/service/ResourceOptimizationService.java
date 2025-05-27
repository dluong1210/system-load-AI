package com.systemload.service;

import com.systemload.model.SystemPrediction;
import com.systemload.repository.SystemPredictionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResourceOptimizationService {
    
    private final SystemPredictionRepository predictionRepository;
    
    public Map<String, Object> analyzeResourceOptimization() {
        Map<String, Object> analysis = new HashMap<>();
        
        // Get predictions for the next 24 hours
        List<SystemPrediction> predictions = predictionRepository.findFuturePredictions(LocalDateTime.now());
        
        // Calculate resource optimization recommendations
        Map<String, Double> resourceUtilization = calculateResourceUtilization(predictions);
        List<String> recommendations = generateOptimizationRecommendations(resourceUtilization);
        
        analysis.put("resourceUtilization", resourceUtilization);
        analysis.put("recommendations", recommendations);
        analysis.put("timestamp", LocalDateTime.now());
        
        return analysis;
    }
    
    private Map<String, Double> calculateResourceUtilization(List<SystemPrediction> predictions) {
        Map<String, Double> utilization = new HashMap<>();
        
        double avgCpu = predictions.stream()
                .mapToDouble(SystemPrediction::getPredictedCpuUsage)
                .average()
                .orElse(0.0);
                
        double avgMemory = predictions.stream()
                .mapToDouble(SystemPrediction::getPredictedMemoryUsage)
                .average()
                .orElse(0.0);
                
        double avgNetwork = predictions.stream()
                .mapToDouble(SystemPrediction::getPredictedNetworkUsage)
                .average()
                .orElse(0.0);
                
        double avgDisk = predictions.stream()
                .mapToDouble(SystemPrediction::getPredictedDiskUsage)
                .average()
                .orElse(0.0);
        
        utilization.put("cpu", avgCpu);
        utilization.put("memory", avgMemory);
        utilization.put("network", avgNetwork);
        utilization.put("disk", avgDisk);
        
        return utilization;
    }
    
    private List<String> generateOptimizationRecommendations(Map<String, Double> utilization) {
        List<String> recommendations = new java.util.ArrayList<>();
        
        // CPU optimization
        if (utilization.get("cpu") > 80) {
            recommendations.add("High CPU utilization detected. Consider scaling horizontally or vertically.");
        } else if (utilization.get("cpu") < 20) {
            recommendations.add("Low CPU utilization. Consider reducing resources to optimize costs.");
        }
        
        // Memory optimization
        if (utilization.get("memory") > 80) {
            recommendations.add("High memory utilization. Consider increasing memory allocation or implementing caching.");
        } else if (utilization.get("memory") < 20) {
            recommendations.add("Low memory utilization. Consider reducing memory allocation.");
        }
        
        // Network optimization
        if (utilization.get("network") > 80) {
            recommendations.add("High network utilization. Consider implementing load balancing or CDN.");
        }
        
        // Disk optimization
        if (utilization.get("disk") > 80) {
            recommendations.add("High disk utilization. Consider implementing data archiving or increasing storage.");
        }
        
        return recommendations;
    }
    
    public Map<String, Object> getOptimizationReport(LocalDateTime start, LocalDateTime end) {
        Map<String, Object> report = new HashMap<>();
        
        List<SystemPrediction> predictions = predictionRepository.findByPredictionTimeBetween(start, end);
        Map<String, Double> utilization = calculateResourceUtilization(predictions);
        List<String> recommendations = generateOptimizationRecommendations(utilization);
        
        report.put("period", Map.of(
            "start", start,
            "end", end
        ));
        report.put("resourceUtilization", utilization);
        report.put("recommendations", recommendations);
        report.put("generatedAt", LocalDateTime.now());
        
        return report;
    }
} 