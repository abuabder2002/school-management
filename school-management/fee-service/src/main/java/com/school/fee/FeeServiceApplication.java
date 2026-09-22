package com.school.fee;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class FeeServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(FeeServiceApplication.class, args);
    }
}
