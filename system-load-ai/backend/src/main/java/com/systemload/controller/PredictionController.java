package com.systemload.controller;

import com.systemload.service.AILoadPredictionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller for AI-based load predictions
 */
@Slf4j
@RestController
@RequestMapping("/api/predictions")
@CrossOrigin(origins = "*")
public class PredictionController {

    @Autowired
    private AILoadPredictionService aiLoadPredictionService;

    /**
     * Predict load for 1 hour ahead
     */
    @GetMapping("/1hour/{baseModelName}")
    public ResponseEntity<AILoadPredictionService.PredictionResult> predict1Hour(@PathVariable String baseModelName) {
        AILoadPredictionService.PredictionResult result = aiLoadPredictionService.predict1Hour(baseModelName);
        return result.isSuccess() ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }

    /**
     * Predict load for 6 hours ahead
     */
    @GetMapping("/6hours/{baseModelName}")
    public ResponseEntity<AILoadPredictionService.PredictionResult> predict6Hours(@PathVariable String baseModelName) {
        AILoadPredictionService.PredictionResult result = aiLoadPredictionService.predict6Hours(baseModelName);
        return result.isSuccess() ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }

    /**
     * Predict load for 24 hours ahead
     */
    @GetMapping("/24hours/{baseModelName}")
    public ResponseEntity<AILoadPredictionService.PredictionResult> predict24Hours(@PathVariable String baseModelName) {
        AILoadPredictionService.PredictionResult result = aiLoadPredictionService.predict24Hours(baseModelName);
        return result.isSuccess() ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }

    /**
     * Train a model with specified metric
     */
    @PostMapping("/train")
    public ResponseEntity<Map<String, Object>> trainModel(@RequestBody TrainModelRequest request) {
        boolean success = aiLoadPredictionService.trainModel(request.getMetricName(), request.getModelName());
        
        return ResponseEntity.ok(Map.of(
            "success", success,
            "message", success ? "Model trained successfully" : "Model training failed",
            "modelName", request.getModelName(),
            "metricName", request.getMetricName()
        ));
    }

    /**
     * Get available models
     */
    @GetMapping("/models")
    public ResponseEntity<Map<String, Object>> getAvailableModels() {
        List<String> models = aiLoadPredictionService.getAvailableModels();
        
        return ResponseEntity.ok(Map.of(
            "models", models,
            "count", models.size(),
            "serviceReady", aiLoadPredictionService.isServiceReady()
        ));
    }

    /**
     * Health check for prediction service
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        return ResponseEntity.ok(Map.of(
            "isConnectionHealthy", aiLoadPredictionService.isServiceReady(),
            "timestamp", System.currentTimeMillis()
        ));
    }

    /**
     * Request DTO for training
     */
    public static class TrainModelRequest {
        private String metricName;
        private String modelName;

        public TrainModelRequest() {}

        public TrainModelRequest(String metricName, String modelName) {
            this.metricName = metricName;
            this.modelName = modelName;
        }

        public String getMetricName() {
            return metricName;
        }

        public void setMetricName(String metricName) {
            this.metricName = metricName;
        }

        public String getModelName() {
            return modelName;
        }

        public void setModelName(String modelName) {
            this.modelName = modelName;
        }
    }
} 