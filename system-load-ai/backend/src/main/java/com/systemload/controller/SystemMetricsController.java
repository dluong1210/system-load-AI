package com.systemload.controller;

import com.systemload.model.SystemMetrics;
import com.systemload.service.SystemMetricsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/metrics")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SystemMetricsController {
    
    private final SystemMetricsService metricsService;
    
    @GetMapping("/range")
    public ResponseEntity<List<SystemMetrics>> getMetricsForTimeRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ResponseEntity.ok(metricsService.getMetricsForTimeRange(start, end));
    }
    
    @GetMapping("/latest")
    public ResponseEntity<List<SystemMetrics>> getLatestMetrics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since) {
        return ResponseEntity.ok(metricsService.getLatestMetrics(since));
    }
    
    @GetMapping("/average/cpu")
    public ResponseEntity<Double> getAverageCpuUsage(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ResponseEntity.ok(metricsService.getAverageCpuUsage(start, end));
    }
    
    @GetMapping("/average/memory")
    public ResponseEntity<Double> getAverageMemoryUsage(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ResponseEntity.ok(metricsService.getAverageMemoryUsage(start, end));
    }
} 