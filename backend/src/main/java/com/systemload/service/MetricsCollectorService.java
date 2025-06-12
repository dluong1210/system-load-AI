package com.systemload.service;

import com.systemload.model.MockServerResponse;
import com.systemload.model.SystemMetrics;
import com.systemload.repository.SystemMetricsRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import javax.annotation.PostConstruct;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service to collect metrics from mock server
 */
@Slf4j
@Service
public class MetricsCollectorService {
    
    @Value("${mock.server.url:http://localhost:8000}")
    private String mockServerUrl;
    
    @Value("${metrics.collection.enabled:true}")
    private boolean collectionEnabled;
    
    @Autowired
    private SystemMetricsRepository repository;
    
    private WebClient webClient;
    
    @PostConstruct
    public void init() {
        this.webClient = WebClient.builder()
                .baseUrl(mockServerUrl)
                .build();
    }
    
    /**
     * Fetch current metrics from mock server
     */
    public SystemMetrics fetchCurrentMetrics() {
        try {
            MockServerResponse response = webClient.get()
                    .uri("/metrics/current")
                    .retrieve()
                    .bodyToMono(MockServerResponse.class)
                    .timeout(Duration.ofSeconds(5))
                    .block();
            
            return response != null ? response.toSystemMetrics() : null;
        } catch (Exception e) {
            log.error("Error fetching metrics: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * Get current metrics (from database if available, fallback to mock server)
     */
    public SystemMetrics getCurrentMetrics() {
        SystemMetrics latest = repository.findTopByOrderByCollectedAtDesc().orElse(null);
        
        if (latest != null && latest.getCollectedAt().isAfter(LocalDateTime.now().minusSeconds(5))) {
            return latest;
        }
        
        return null;
    }
    
    /**
     * Fetch and store metrics
     */
    public SystemMetrics collectAndStoreMetrics() {
        SystemMetrics metrics = fetchCurrentMetrics();
        return metrics != null ? repository.save(metrics) : null;
    }
    
    /**
     * Scheduled task to collect metrics every 1 second
     */
    @Scheduled(fixedRate = 1000)
    public void scheduledCollection() {
        if (collectionEnabled) {
            collectAndStoreMetrics();
        }
    }
    
    /**
     * Get recent metrics for analysis
     */
    public List<SystemMetrics> getRecentMetrics(int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        return repository.findMetricsForTraining(since);
    }
    
    /**
     * Get latest N metrics from database
     */
    public List<SystemMetrics> getLatestNMetrics(int limit) {
        return repository.findLatestNMetrics(PageRequest.of(0, limit));
    }
    
    /**
     * Get average load score in last N hours
     */
    public Double getAverageLoadScore(int hours) {
        LocalDateTime start = LocalDateTime.now().minusHours(hours);
        return repository.getAverageLoadScore(start, LocalDateTime.now());
    }
    
    /**
     * Find high load periods
     */
    public List<SystemMetrics> getHighLoadPeriods(double threshold, int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        return repository.findHighLoadPeriods(threshold, since);
    }
    
    /**
     * Health check - test connection to mock server
     */
    public boolean isConnectionHealthy() {
        try {
            String response = webClient.get()
                    .uri("/health")
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(3))
                    .block();
            
            return response != null && response.contains("healthy");
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * Get collection statistics
     */
    public Map<String, Object> getCollectionStats() {
        Map<String, Object> stats = new HashMap<>();
        
        try {
            long totalCount = repository.count();
            SystemMetrics latest = repository.findTopByOrderByCollectedAtDesc().orElse(null);
            LocalDateTime yesterday = LocalDateTime.now().minusHours(24);
            List<SystemMetrics> recent = repository.findMetricsForTraining(yesterday);
            
            stats.put("totalMetricsCount", totalCount);
            stats.put("collectionEnabled", collectionEnabled);
            stats.put("mockServerHealthy", isConnectionHealthy());
            stats.put("last24HoursCount", recent.size());
            
            if (latest != null) {
                stats.put("latestCollectionTime", latest.getCollectedAt());
                stats.put("latestMetricsId", latest.getId());
            }
        } catch (Exception e) {
            stats.put("error", e.getMessage());
        }
        
        return stats;
    }
    
    /**
     * Clean up old metrics (older than specified days)
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void cleanupOldMetrics() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(30);
        try {
            int deleted = repository.deleteOldMetrics(cutoff);
            log.info("Cleaned up {} old metrics", deleted);
        } catch (Exception e) {
            log.error("Error cleaning up: {}", e.getMessage());
        }
    }
} 