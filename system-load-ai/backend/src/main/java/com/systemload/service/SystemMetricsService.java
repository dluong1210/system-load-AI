package com.systemload.service;

import com.systemload.model.SystemMetrics;
import com.systemload.repository.SystemMetricsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SystemMetricsService {
    
    private final SystemMetricsRepository metricsRepository;
    
    @Scheduled(fixedRate = 60000) // Collect metrics every minute
    public void collectSystemMetrics() {
        try {
            SystemMetrics metrics = new SystemMetrics();
            
            // Get CPU usage
            com.sun.management.OperatingSystemMXBean osBean = 
                (com.sun.management.OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
            metrics.setCpuUsage(osBean.getSystemCpuLoad() * 100);
            
            // Get memory usage
            MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
            double usedMemory = memoryBean.getHeapMemoryUsage().getUsed();
            double maxMemory = memoryBean.getHeapMemoryUsage().getMax();
            metrics.setMemoryUsage((usedMemory / maxMemory) * 100);
            
            // TODO: Implement network and disk usage collection
            metrics.setNetworkUsage(0.0);
            metrics.setDiskUsage(0.0);
            
            metrics.setHostname(osBean.getName());
            metrics.setServiceName("system-load-ai");
            
            metricsRepository.save(metrics);
            log.info("System metrics collected and saved successfully");
            
        } catch (Exception e) {
            log.error("Error collecting system metrics", e);
        }
    }
    
    public List<SystemMetrics> getMetricsForTimeRange(LocalDateTime start, LocalDateTime end) {
        return metricsRepository.findByTimestampBetween(start, end);
    }
    
    public List<SystemMetrics> getLatestMetrics(LocalDateTime since) {
        return metricsRepository.findLatestMetrics(since);
    }
    
    public Double getAverageCpuUsage(LocalDateTime start, LocalDateTime end) {
        return metricsRepository.getAverageCpuUsage(start, end);
    }
    
    public Double getAverageMemoryUsage(LocalDateTime start, LocalDateTime end) {
        return metricsRepository.getAverageMemoryUsage(start, end);
    }
} 