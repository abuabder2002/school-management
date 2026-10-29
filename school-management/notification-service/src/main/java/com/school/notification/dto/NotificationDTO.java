package com.school.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
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

    @NotNull(message = "Date is required")
    @com.fasterxml.jackson.databind.annotation.JsonDeserialize(using = MultiFormatLocalDateDeserializer.class)
    @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate date;

    @NotBlank(message = "Audience is required")
    private String audience;   // STUDENTS | TEACHERS | BOTH

    @NotBlank(message = "Message is required")
    private String message;

    private String status;

    /** Set only when this notification targets one specific student's parent/student portal */
    private Long targetStudentId;

    private LocalDateTime createdAt;

    /** Set by an internal (no-Authorization-header) caller only; an external ADMIN caller's value here is ignored in favor of their own JWT. */
    private Long schoolId;
}
