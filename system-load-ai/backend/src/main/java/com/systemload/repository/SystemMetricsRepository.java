package com.systemload.repository;

import com.systemload.model.SystemMetrics;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for SystemMetrics entity
 */
@Repository
public interface SystemMetricsRepository extends JpaRepository<SystemMetrics, Long> {
    
    /**
     * Find latest single metrics record
     */
    Optional<SystemMetrics> findTopByOrderByCollectedAtDesc();
    
    /**
     * Find latest N metrics using Pageable
     */
    @Query("SELECT sm FROM SystemMetrics sm ORDER BY sm.collectedAt DESC")
    List<SystemMetrics> findLatestNMetrics(Pageable pageable);
    
    /**
     * Find metrics for training (last N hours)
     */
    @Query("SELECT sm FROM SystemMetrics sm WHERE sm.collectedAt >= :sinceTime ORDER BY sm.collectedAt ASC")
    List<SystemMetrics> findMetricsForTraining(@Param("sinceTime") LocalDateTime sinceTime);
    
    /**
     * Get average load score in time range
     */
    @Query("SELECT AVG(sm.overallLoadScore) FROM SystemMetrics sm WHERE sm.collectedAt BETWEEN :startTime AND :endTime")
    Double getAverageLoadScore(@Param("startTime") LocalDateTime startTime, 
                              @Param("endTime") LocalDateTime endTime);
    
    /**
     * Find high load periods (load score > threshold)
     */
    @Query("SELECT sm FROM SystemMetrics sm WHERE sm.overallLoadScore > :threshold AND sm.collectedAt >= :sinceTime ORDER BY sm.collectedAt DESC")
    List<SystemMetrics> findHighLoadPeriods(@Param("threshold") Double threshold, 
                                           @Param("sinceTime") LocalDateTime sinceTime);
    
    /**
     * Delete old metrics (older than specified time) and return count
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM SystemMetrics sm WHERE sm.collectedAt < :beforeTime")
    int deleteOldMetrics(@Param("beforeTime") LocalDateTime beforeTime);
} 