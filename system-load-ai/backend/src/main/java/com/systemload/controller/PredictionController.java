package com.systemload.controller;

import com.systemload.model.SystemPrediction;
import com.systemload.service.PredictionService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/predictions")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PredictionController {
    
    private final PredictionService predictionService;
    
    @GetMapping("/future")
    public ResponseEntity<List<SystemPrediction>> getFuturePredictions() {
        return ResponseEntity.ok(predictionService.getFuturePredictions());
    }
    
    @GetMapping("/range")
    public ResponseEntity<List<SystemPrediction>> getPredictionsByTimeRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ResponseEntity.ok(predictionService.getPredictionsByTimeRange(start, end));
    }
    
    @GetMapping("/model/{modelType}")
    public ResponseEntity<List<SystemPrediction>> getPredictionsByModel(
            @PathVariable String modelType) {
        return ResponseEntity.ok(predictionService.getPredictionsByModel(modelType));
    }
    
    @PostMapping("/generate")
    public ResponseEntity<Void> generatePredictions() {
        predictionService.generatePredictions();
        return ResponseEntity.ok().build();
    }
} 