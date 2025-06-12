package com.systemload.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;

/**
 * Model representing system load metrics
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "system_metrics")
public class SystemMetrics {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "timestamp")
    private Long timestamp;
    
    @Column(name = "collected_at")
    private LocalDateTime collectedAt;
    
    // CPU Metrics
    @JsonProperty("usage_percent")
    @Column(name = "cpu_usage_percent")
    private Double cpuUsagePercent;
    
    @JsonProperty("usage_mhz")
    @Column(name = "cpu_usage_mhz")
    private Double cpuUsageMhz;
    
    @JsonProperty("cores")
    @Column(name = "cpu_cores")
    private Integer cpuCores;
    
    @JsonProperty("capacity_mhz")
    @Column(name = "cpu_capacity_mhz")
    private Double cpuCapacityMhz;
    
    // Memory Metrics
    @JsonProperty("usage_kb")
    @Column(name = "memory_usage_kb")
    private Double memoryUsageKb;
    
    @JsonProperty("capacity_kb")
    @Column(name = "memory_capacity_kb")
    private Double memoryCapacityKb;
    
    // Disk I/O Metrics
    @JsonProperty("read_throughput_kbs")
    @Column(name = "disk_read_throughput_kbs")
    private Double diskReadThroughputKbs;
    
    @JsonProperty("write_throughput_kbs")
    @Column(name = "disk_write_throughput_kbs")
    private Double diskWriteThroughputKbs;
    
    // Network I/O Metrics
    @JsonProperty("received_throughput_kbs")
    @Column(name = "network_received_throughput_kbs")
    private Double networkReceivedThroughputKbs;
    
    @JsonProperty("transmitted_throughput_kbs")
    @Column(name = "network_transmitted_throughput_kbs")
    private Double networkTransmittedThroughputKbs;
    
    // Computed fields for analysis
    @Column(name = "memory_usage_percent")
    private Double memoryUsagePercent;
    
    @Column(name = "cpu_load_score")
    private Double cpuLoadScore;
    
    @Column(name = "disk_load_score")
    private Double diskLoadScore;
    
    @Column(name = "network_load_score")
    private Double networkLoadScore;
    
    @Column(name = "io_load_score")
    private Double ioLoadScore;
    
    @Column(name = "overall_load_score")
    private Double overallLoadScore;
    
    /**
     * Calculate derived metrics after fetching data
     */
    @PostLoad
    @PrePersist
    @PreUpdate
    public void calculateDerivedMetrics() {
        if (memoryUsageKb != null && memoryCapacityKb != null && memoryCapacityKb > 0) {
            this.memoryUsagePercent = (memoryUsageKb / memoryCapacityKb) * 100;
        }
        
        // CPU Load Score (0-100)
        if (cpuUsagePercent != null) {
            this.cpuLoadScore = cpuUsagePercent;
        }
        
        // Disk Load Score calculation
        calculateDiskLoadScore();
        
        // Network Load Score calculation
        calculateNetworkLoadScore();
        
        // Combined I/O Load Score
        if (diskLoadScore != null && networkLoadScore != null) {
            this.ioLoadScore = (diskLoadScore * 0.6) + (networkLoadScore * 0.4);
        } else if (diskLoadScore != null) {
            this.ioLoadScore = diskLoadScore;
        } else if (networkLoadScore != null) {
            this.ioLoadScore = networkLoadScore;
        }
        
        // Overall Load Score (weighted average)
        if (cpuLoadScore != null && memoryUsagePercent != null && ioLoadScore != null) {
            this.overallLoadScore = (cpuLoadScore * 0.35) + (memoryUsagePercent * 0.35) + 
                                  (diskLoadScore != null ? diskLoadScore * 0.2 : 0) + 
                                  (networkLoadScore != null ? networkLoadScore * 0.1 : 0);
        }
        
        if (collectedAt == null) {
            this.collectedAt = LocalDateTime.now();
        }
    }
    
    /**
     * Calculate disk load score based on read/write throughput
     * Uses logarithmic scaling for better representation of disk activity
     */
    private void calculateDiskLoadScore() {
        if (diskReadThroughputKbs != null && diskWriteThroughputKbs != null) {
            double totalDiskThroughput = diskReadThroughputKbs + diskWriteThroughputKbs;
            
            if (totalDiskThroughput <= 0) {
                this.diskLoadScore = 0.0;
                return;
            }
            
            // Thresholds for disk activity (KB/s)
            double lowThreshold = 1024;      // 1 MB/s
            double mediumThreshold = 10240;  // 10 MB/s  
            double highThreshold = 51200;    // 50 MB/s
            double maxThreshold = 102400;    // 100 MB/s
            
            double score;
            if (totalDiskThroughput <= lowThreshold) {
                // 0-25 score for low activity
                score = (totalDiskThroughput / lowThreshold) * 25;
            } else if (totalDiskThroughput <= mediumThreshold) {
                // 25-50 score for medium activity
                score = 25 + ((totalDiskThroughput - lowThreshold) / (mediumThreshold - lowThreshold)) * 25;
            } else if (totalDiskThroughput <= highThreshold) {
                // 50-75 score for high activity
                score = 50 + ((totalDiskThroughput - mediumThreshold) / (highThreshold - mediumThreshold)) * 25;
            } else if (totalDiskThroughput <= maxThreshold) {
                // 75-100 score for very high activity
                score = 75 + ((totalDiskThroughput - highThreshold) / (maxThreshold - highThreshold)) * 25;
            } else {
                // Cap at 100 for extreme activity
                score = 100;
            }
            
            this.diskLoadScore = Math.min(Math.max(score, 0), 100);
        }
    }
    
    /**
     * Calculate network load score based on received/transmitted throughput
     * Considers both upload and download activity
     */
    private void calculateNetworkLoadScore() {
        if (networkReceivedThroughputKbs != null && networkTransmittedThroughputKbs != null) {
            double totalNetworkThroughput = networkReceivedThroughputKbs + networkTransmittedThroughputKbs;
            
            if (totalNetworkThroughput <= 0) {
                this.networkLoadScore = 0.0;
                return;
            }
            
            // Thresholds for network activity (KB/s)
            double lowThreshold = 128;       // 128 KB/s (1 Mbps)
            double mediumThreshold = 1280;   // 1.28 MB/s (10 Mbps)
            double highThreshold = 6400;     // 6.4 MB/s (50 Mbps)
            double maxThreshold = 12800;     // 12.8 MB/s (100 Mbps)
            
            double score;
            if (totalNetworkThroughput <= lowThreshold) {
                // 0-25 score for low activity
                score = (totalNetworkThroughput / lowThreshold) * 25;
            } else if (totalNetworkThroughput <= mediumThreshold) {
                // 25-50 score for medium activity
                score = 25 + ((totalNetworkThroughput - lowThreshold) / (mediumThreshold - lowThreshold)) * 25;
            } else if (totalNetworkThroughput <= highThreshold) {
                // 50-75 score for high activity
                score = 50 + ((totalNetworkThroughput - mediumThreshold) / (highThreshold - mediumThreshold)) * 25;
            } else if (totalNetworkThroughput <= maxThreshold) {
                // 75-100 score for very high activity
                score = 75 + ((totalNetworkThroughput - highThreshold) / (maxThreshold - highThreshold)) * 25;
            } else {
                // Cap at 100 for extreme activity
                score = 100;
            }
            
            // Apply asymmetric weighting if there's significant imbalance
            double receivedRatio = networkReceivedThroughputKbs / totalNetworkThroughput;
            double transmittedRatio = networkTransmittedThroughputKbs / totalNetworkThroughput;
            double imbalanceFactor = Math.abs(receivedRatio - transmittedRatio);
            
            // Increase score if there's high imbalance (indicates intensive operation)
            if (imbalanceFactor > 0.8 && totalNetworkThroughput > mediumThreshold) {
                score = Math.min(score * 1.1, 100);
            }
            
            this.networkLoadScore = Math.min(Math.max(score, 0), 100);
        }
    }
} 