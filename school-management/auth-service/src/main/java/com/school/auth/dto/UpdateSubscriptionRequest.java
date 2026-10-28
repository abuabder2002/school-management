package com.school.auth.dto;

import com.school.auth.entity.School;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateSubscriptionRequest {
    private LocalDate subscriptionStart;
    private LocalDate subscriptionEnd;
    private School.PlanType planType;
    private Boolean active;
}
