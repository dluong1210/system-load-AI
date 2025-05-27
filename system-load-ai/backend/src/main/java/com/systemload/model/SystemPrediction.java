package com.systemload.model;

import lombok.Data;
import javax.persistence.*;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "system_predictions")
public class SystemPrediction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false)
    private LocalDateTime predictionTime;

    @Column(nullable = false)
    private Double predictedCpuUsage;

    @Column(nullable = false)
    private Double predictedMemoryUsage;

    @Column(nullable = false)
    private Double predictedNetworkUsage;

    @Column(nullable = false)
    private Double predictedDiskUsage;

    @Column
    private String modelType; // e.g., "LSTM", "Prophet", "XGBoost"

    @Column
    private Double confidence;

    @Column
    private String recommendation;

    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
    }
} 