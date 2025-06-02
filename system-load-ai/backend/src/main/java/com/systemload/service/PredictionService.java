package com.systemload.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.systemload.model.SystemMetrics;
import com.systemload.model.SystemPrediction;
import com.systemload.repository.SystemMetricsRepository;
import com.systemload.repository.SystemPredictionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PredictionService {

    private final SystemMetricsRepository metricsRepository;
    private final SystemPredictionRepository predictionRepository;
    private final MLModelService mlModelService; // Weka-based, can be used as fallback or for other models
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Value("${ml.prophet.python_executable}")
    private String pythonExecutable;

    @Value("${ml.prophet.script_path}")
    private String prophetScriptPath;

    @Scheduled(cron = "0 0 * * * *") // Run every hour
    public void generatePredictions() {
        try {
            LocalDateTime end = LocalDateTime.now();
            LocalDateTime start = end.minusDays(7); // Use 7 days of historical data
            List<SystemMetrics> historicalData = metricsRepository.findByTimestampBetween(start, end);

            if (historicalData == null || historicalData.isEmpty()) {
                log.warn("No historical data found for the last 7 days. Skipping Prophet prediction.");
                // Optionally, fall back to Weka or other models here
                // trainAndSaveWekaPredictions(historicalData, end);
                return;
            }

            // Prepare data for Prophet script (CPU usage prediction)
            List<Map<String, Object>> prophetInputData = historicalData.stream()
                    .map(metric -> {
                        Map<String, Object> map = new java.util.HashMap<>();
                        map.put("timestamp", metric.getTimestamp().toString());
                        map.put("cpuUsage", metric.getCpuUsage());
                        return map;
                    })
                    .collect(Collectors.toList());
            String jsonData = objectMapper.writeValueAsString(prophetInputData);

            log.info("Executing Prophet model script for predictions...");
            File scriptFile = new File(prophetScriptPath);
            if (!scriptFile.exists()) {
                // Attempt to resolve relative to user.dir if it's a relative path
                File projectRoot = new File(System.getProperty("user.dir"));
                // Navigate up if ml_models is not in the backend module's root
                // This assumes 'backend' and 'ml_models' are siblings in the project root
                File potentialScriptFile = new File(projectRoot.getParent(), "ml_models/scripts/" + new File(prophetScriptPath).getName());
                if (potentialScriptFile.exists()) {
                    scriptFile = potentialScriptFile;
                    log.info("Resolved Prophet script path to: {}", scriptFile.getAbsolutePath());
                } else {
                    log.error("Prophet script not found at: {} or {}", scriptFile.getAbsolutePath(), potentialScriptFile.getAbsolutePath());
                    return;
                }
            }
            
            ProcessBuilder processBuilder = new ProcessBuilder(pythonExecutable, scriptFile.getAbsolutePath(), jsonData);
            processBuilder.redirectErrorStream(true); // Merge stdout and stderr
            Process process = processBuilder.start();

            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append(System.lineSeparator());
                }
            }

            int exitCode = process.waitFor();
            log.info("Prophet script finished with exit code: {}. Output:\n{}", exitCode, output.toString());

            if (exitCode == 0 && output.length() > 0) {
                String jsonOutput = getLastNonEmptyLine(output.toString());
                 if (jsonOutput == null || jsonOutput.trim().isEmpty()) {
                    log.error("Prophet script output is empty or invalid. Full output:\n{}", output.toString());
                    return;
                }

                List<Map<String, Object>> rawPredictions = objectMapper.readValue(jsonOutput, new TypeReference<List<Map<String, Object>>>() {});
                List<SystemPrediction> predictions = rawPredictions.stream().map(rawPred -> {
                    SystemPrediction p = new SystemPrediction();
                    p.setPredictionTime(LocalDateTime.parse((String) rawPred.get("ds")));
                    p.setPredictedCpuUsage((Double) rawPred.get("yhat"));
                    // p.setConfidence(...); // You might derive confidence from yhat_lower/upper
                    p.setModelType("Prophet (CPU)");
                    p.setRecommendation(generateRecommendation(p));
                    p.setPredictedMemoryUsage(0.0); // Placeholder
                    p.setPredictedNetworkUsage(0.0); // Placeholder
                    p.setPredictedDiskUsage(0.0);  // Placeholder
                    return p;
                }).collect(Collectors.toList());

                predictionRepository.saveAll(predictions);
                log.info("{} Prophet predictions saved successfully.", predictions.size());
            } else {
                log.error("Prophet script execution failed. Exit code: {}. Full Output:\n{}", exitCode, output.toString());
                 // trainAndSaveWekaPredictions(historicalData, end); // Optional Weka fallback
            }

        } catch (Exception e) {
            log.error("Error generating predictions with Prophet model", e);
            // Fallback logic
        }
    }
    
    private String getLastNonEmptyLine(String text) {
        if (text == null || text.trim().isEmpty()) {
            return null;
        }
        String[] lines = text.trim().split("\\r?\\n");
        for (int i = lines.length - 1; i >= 0; i--) {
            if (!lines[i].trim().isEmpty()) {
                return lines[i].trim();
            }
        }
        return null; // Should not happen if text.trim() is not empty
    }

    private void trainAndSaveWekaPredictions(List<SystemMetrics> historicalData, LocalDateTime fromTime) {
        if (historicalData == null || historicalData.isEmpty()) {
            log.warn("No historical data for Weka model training.");
            return;
        }
        mlModelService.trainModel(historicalData);
        List<SystemPrediction> wekaPredictions = mlModelService.predictNext24Hours(fromTime);
        for (SystemPrediction prediction : wekaPredictions) {
            prediction.setRecommendation(generateRecommendation(prediction));
            if (prediction.getPredictedMemoryUsage() == null) prediction.setPredictedMemoryUsage(0.0);
            if (prediction.getPredictedNetworkUsage() == null) prediction.setPredictedNetworkUsage(0.0);
            if (prediction.getPredictedDiskUsage() == null) prediction.setPredictedDiskUsage(0.0);
        }
        predictionRepository.saveAll(wekaPredictions);
        log.info("{} Weka fallback predictions saved.", wekaPredictions.size());
    }

    private String generateRecommendation(SystemPrediction prediction) {
        StringBuilder recommendation = new StringBuilder();
        if (prediction.getPredictedCpuUsage() != null && prediction.getPredictedCpuUsage() > 80) {
            recommendation.append("Consider scaling CPU resources. ");
        }
        if (prediction.getPredictedMemoryUsage() != null && prediction.getPredictedMemoryUsage() > 80) {
            recommendation.append("Consider increasing memory allocation. ");
        }
        return recommendation.length() > 0 ? recommendation.toString().trim() : "No immediate action required based on CPU prediction.";
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
        if (testData == null || testData.isEmpty()) {
            log.warn("No test data for evaluation.");
            return 0.0;
        }
        return mlModelService.evaluateModel(testData);
    }
} 