package com.systemload.repository;

import com.systemload.model.SystemMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SystemMetricsRepository extends JpaRepository<SystemMetrics, Long> {
    
    List<SystemMetrics> findByTimestampBetween(LocalDateTime start, LocalDateTime end);
    
    @Query("SELECT m FROM SystemMetrics m WHERE m.timestamp >= ?1 ORDER BY m.timestamp DESC")
    List<SystemMetrics> findLatestMetrics(LocalDateTime since);
    
    List<SystemMetrics> findByServiceName(String serviceName);
    
    @Query("SELECT AVG(m.cpuUsage) FROM SystemMetrics m WHERE m.timestamp BETWEEN ?1 AND ?2")
    Double getAverageCpuUsage(LocalDateTime start, LocalDateTime end);
    
    @Query("SELECT AVG(m.memoryUsage) FROM SystemMetrics m WHERE m.timestamp BETWEEN ?1 AND ?2")
    Double getAverageMemoryUsage(LocalDateTime start, LocalDateTime end);
} 