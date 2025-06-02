package com.systemload.service;

import com.systemload.model.SystemMetrics;
import com.systemload.model.SystemPrediction;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import weka.classifiers.functions.LinearRegression;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instance;
import weka.core.Instances;
import weka.filters.Filter;
import weka.filters.unsupervised.attribute.Normalize;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class MLModelService {
    
    private LinearRegression model;
    private Instances trainingData;
    private Normalize normalizeFilter;
    
    public void trainModel(List<SystemMetrics> historicalData) {
        try {
            // Prepare training data
            ArrayList<Attribute> attributes = new ArrayList<>();
            attributes.add(new Attribute("hour"));
            attributes.add(new Attribute("dayOfWeek"));
            attributes.add(new Attribute("cpuUsage"));
            attributes.add(new Attribute("memoryUsage"));
            attributes.add(new Attribute("networkUsage"));
            attributes.add(new Attribute("diskUsage"));
            
            trainingData = new Instances("SystemMetrics", attributes, historicalData.size());
            trainingData.setClassIndex(2); // Set CPU usage as the class attribute
            
            // Convert metrics to Weka instances
            for (SystemMetrics metric : historicalData) {
                double[] values = new double[6];
                values[0] = metric.getTimestamp().getHour();
                values[1] = metric.getTimestamp().getDayOfWeek().getValue();
                values[2] = metric.getCpuUsage();
                values[3] = metric.getMemoryUsage();
                values[4] = metric.getNetworkUsage();
                values[5] = metric.getDiskUsage();
                
                trainingData.add(new DenseInstance(1.0, values));
            }
            
            // Normalize the data
            normalizeFilter = new Normalize();
            normalizeFilter.setInputFormat(trainingData);
            Instances normalizedData = Filter.useFilter(trainingData, normalizeFilter);
            
            // Train the model
            model = new LinearRegression();
            model.buildClassifier(normalizedData);
            
            log.info("ML model trained successfully");
        } catch (Exception e) {
            log.error("Error training ML model", e);
            throw new RuntimeException("Failed to train ML model", e);
        }
    }
    
    public List<SystemPrediction> predictNext24Hours(LocalDateTime from) {
        List<SystemPrediction> predictions = new ArrayList<>();
        
        try {
            for (int hour = 1; hour <= 24; hour++) {
                LocalDateTime predictionTime = from.plusHours(hour);
                
                // Create instance for prediction
                double[] values = new double[6];
                values[0] = predictionTime.getHour();
                values[1] = predictionTime.getDayOfWeek().getValue();
                values[2] = 0.0; // Placeholder for CPU usage (class attribute)
                values[3] = 0.0; // Placeholder for memory usage
                values[4] = 0.0; // Placeholder for network usage
                values[5] = 0.0; // Placeholder for disk usage
                
                Instance instance = new DenseInstance(1.0, values);
                instance.setDataset(trainingData);
                
                // Normalize the instance
                normalizeFilter.input(instance);
                Instance normalizedInstance = normalizeFilter.output();
                
                // Make prediction
                double predictedCpu = model.classifyInstance(normalizedInstance);
                
                // Create prediction object
                SystemPrediction prediction = new SystemPrediction();
                prediction.setPredictionTime(predictionTime);
                prediction.setPredictedCpuUsage(predictedCpu);
                prediction.setPredictedMemoryUsage(predictMemoryUsage(normalizedInstance));
                prediction.setPredictedNetworkUsage(predictNetworkUsage(normalizedInstance));
                prediction.setPredictedDiskUsage(predictDiskUsage(normalizedInstance));
                prediction.setModelType("LinearRegression");
                prediction.setConfidence(calculateConfidence(normalizedInstance));
                
                predictions.add(prediction);
            }
        } catch (Exception e) {
            log.error("Error generating predictions", e);
            throw new RuntimeException("Failed to generate predictions", e);
        }
        
        return predictions;
    }
    
    private double predictMemoryUsage(Instance instance) throws Exception {
        // TODO: Implement separate model for memory prediction
        return 0.0;
    }
    
    private double predictNetworkUsage(Instance instance) throws Exception {
        // TODO: Implement separate model for network prediction
        return 0.0;
    }
    
    private double predictDiskUsage(Instance instance) throws Exception {
        // TODO: Implement separate model for disk prediction
        return 0.0;
    }
    
    private double calculateConfidence(Instance instance) {
        // TODO: Implement confidence calculation based on model statistics
        return 0.8;
    }
    
    public double evaluateModel(List<SystemMetrics> testData) {
        try {
            // Convert test data to Weka instances
            Instances testInstances = new Instances(trainingData);
            for (SystemMetrics metric : testData) {
                double[] values = new double[6];
                values[0] = metric.getTimestamp().getHour();
                values[1] = metric.getTimestamp().getDayOfWeek().getValue();
                values[2] = metric.getCpuUsage();
                values[3] = metric.getMemoryUsage();
                values[4] = metric.getNetworkUsage();
                values[5] = metric.getDiskUsage();
                
                testInstances.add(new DenseInstance(1.0, values));
            }
            
            // Normalize test data
            Instances normalizedTestData = Filter.useFilter(testInstances, normalizeFilter);
            
            // Calculate error
            double totalError = 0.0;
            for (int i = 0; i < normalizedTestData.numInstances(); i++) {
                double predicted = model.classifyInstance(normalizedTestData.get(i));
                double actual = normalizedTestData.get(i).classValue();
                totalError += Math.abs(predicted - actual);
            }
            
            return 1.0 - (totalError / normalizedTestData.numInstances());
        } catch (Exception e) {
            log.error("Error evaluating model", e);
            throw new RuntimeException("Failed to evaluate model", e);
        }
    }
} 