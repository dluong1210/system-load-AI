package com.systemload;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SystemLoadAiApplication {
    public static void main(String[] args) {
        SpringApplication.run(SystemLoadAiApplication.class, args);
    }
} 