package com.school.notification.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO for Notification creation, broadcast, and response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {

    private Long id;

    private Long parentId;

    private String title;

    @NotBlank(message = "Message is required")
    private String message;

    @JsonAlias({"notificationDate", "date"})
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;

    private String targetAudience;

    private String status;

    private LocalDateTime createdAt;

    private boolean read;
}
