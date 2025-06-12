package com.systemload.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class MockServerResponse {
    
    private Long timestamp;
    
    @JsonProperty("cpu")
    private CpuMetrics cpu;
    
    @JsonProperty("memory")
    private MemoryMetrics memory;
    
    @JsonProperty("disk")
    private DiskMetrics disk;
    
    @JsonProperty("network")
    private NetworkMetrics network;
    
    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CpuMetrics {
        @JsonProperty("usage_percent")
        private Double usagePercent;
        
        @JsonProperty("usage_mhz")
        private Double usageMhz;
        
        @JsonProperty("cores")
        private Integer cores;
        
        @JsonProperty("capacity_mhz")
        private Double capacityMhz;
    }
    
    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MemoryMetrics {
        @JsonProperty("usage_kb")
        private Double usageKb;
        
        @JsonProperty("capacity_kb")
        private Double capacityKb;
    }
    
    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DiskMetrics {
        @JsonProperty("read_throughput_kbs")
        private Double readThroughputKbs;
        
        @JsonProperty("write_throughput_kbs")
        private Double writeThroughputKbs;
    }
    
    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class NetworkMetrics {
        @JsonProperty("received_throughput_kbs")
        private Double receivedThroughputKbs;
        
        @JsonProperty("transmitted_throughput_kbs")
        private Double transmittedThroughputKbs;
    }
    
    public SystemMetrics toSystemMetrics() {
        SystemMetrics metrics = new SystemMetrics();
        metrics.setTimestamp(this.timestamp);
        
        if (cpu != null) {
            metrics.setCpuUsagePercent(cpu.getUsagePercent());
            metrics.setCpuUsageMhz(cpu.getUsageMhz());
            metrics.setCpuCores(cpu.getCores());
            metrics.setCpuCapacityMhz(cpu.getCapacityMhz());
        }
        
        if (memory != null) {
            metrics.setMemoryUsageKb(memory.getUsageKb());
            metrics.setMemoryCapacityKb(memory.getCapacityKb());
        }
        
        if (disk != null) {
            metrics.setDiskReadThroughputKbs(disk.getReadThroughputKbs());
            metrics.setDiskWriteThroughputKbs(disk.getWriteThroughputKbs());
        }
        
        if (network != null) {
            metrics.setNetworkReceivedThroughputKbs(network.getReceivedThroughputKbs());
            metrics.setNetworkTransmittedThroughputKbs(network.getTransmittedThroughputKbs());
        }
        
        metrics.calculateDerivedMetrics();
        
        return metrics;
    }
} 