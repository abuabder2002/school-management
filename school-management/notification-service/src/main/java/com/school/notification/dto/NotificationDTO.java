package com.school.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for Notification create/update and response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {

    private Long id;

    @NotNull(message = "Parent ID is required")
    private Long parentId;

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Message is required")
    private String message;

    private LocalDateTime createdAt;

    private boolean read;
}
