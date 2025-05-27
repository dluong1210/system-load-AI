package com.systemload.model;

import lombok.Data;
import javax.persistence.*;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "system_metrics")
public class SystemMetrics {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false)
    private Double cpuUsage;

    @Column(nullable = false)
    private Double memoryUsage;

    @Column(nullable = false)
    private Double networkUsage;

    @Column(nullable = false)
    private Double diskUsage;

    @Column
    private String hostname;

    @Column
    private String serviceName;

    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
    }
} 