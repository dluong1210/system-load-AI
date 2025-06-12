package com.systemload.controller;

import com.systemload.model.SystemMetrics;
import com.systemload.service.MetricsCollectorService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/system-load")
public class SystemLoadController {
    
    @Autowired
    private MetricsCollectorService metricsService;
    
    @GetMapping("/current")
    public ResponseEntity<SystemMetrics> getCurrentMetrics(
            @RequestParam(defaultValue = "false") boolean direct) {
        return ResponseEntity.ok(direct ? 
            metricsService.fetchCurrentMetrics() : 
            metricsService.getCurrentMetrics());
    }
    
    @GetMapping("/latest")
    public ResponseEntity<List<SystemMetrics>> getLatestMetrics(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(metricsService.getLatestNMetrics(limit));
    }
    
    @GetMapping("/history")
    public ResponseEntity<List<SystemMetrics>> getHistoricalMetrics(
            @RequestParam(defaultValue = "24") int hours) {
        return ResponseEntity.ok(metricsService.getRecentMetrics(hours));
    }

    @PostMapping("/collect")
    public ResponseEntity<SystemMetrics> collectMetrics() {
        return ResponseEntity.ok(metricsService.collectAndStoreMetrics());
    }
    
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(
            @RequestParam(defaultValue = "24") int hours) {
        Map<String, Object> stats = metricsService.getCollectionStats();
        stats.put("averageLoad", metricsService.getAverageLoadScore(hours));
        return ResponseEntity.ok(stats);
    }
    
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
            "isConnectionHealthy", metricsService.isConnectionHealthy(),
            "timestamp", System.currentTimeMillis()
        ));
    }
} 