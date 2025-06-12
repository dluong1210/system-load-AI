package com.systemload.repository;

import com.systemload.model.SystemPrediction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SystemPredictionRepository extends JpaRepository<SystemPrediction, Long> {
    
    List<SystemPrediction> findByPredictionTimeBetween(LocalDateTime start, LocalDateTime end);
    
    @Query("SELECT p FROM SystemPrediction p WHERE p.predictionTime >= ?1 ORDER BY p.predictionTime ASC")
    List<SystemPrediction> findFuturePredictions(LocalDateTime from);
    
    List<SystemPrediction> findByModelType(String modelType);
    
    @Query("SELECT p FROM SystemPrediction p WHERE p.predictionTime >= ?1 AND p.predictionTime <= ?2 AND p.modelType = ?3")
    List<SystemPrediction> findPredictionsByModelAndTimeRange(LocalDateTime start, LocalDateTime end, String modelType);
} 