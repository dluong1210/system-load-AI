package com.systemload.controller;

import com.systemload.service.ResourceOptimizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/optimization")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ResourceOptimizationController {
    
    private final ResourceOptimizationService optimizationService;
    
    @GetMapping("/analysis")
    public ResponseEntity<Map<String, Object>> getResourceOptimizationAnalysis() {
        return ResponseEntity.ok(optimizationService.analyzeResourceOptimization());
    }
    
    @GetMapping("/report")
    public ResponseEntity<Map<String, Object>> getOptimizationReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ResponseEntity.ok(optimizationService.getOptimizationReport(start, end));
    }
} 