package com.school.notification.controller;

import com.school.common.dto.ApiResponse;
import com.school.notification.dto.NotificationDTO;
import com.school.notification.security.JwtDecoder;
import com.school.notification.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for Notification management.
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;
    private final JwtDecoder jwtDecoder;

    /** POST /api/notifications — Send a notification (Admin / Broadcast / Parent) */
    @PostMapping
    public ResponseEntity<ApiResponse<NotificationDTO>> sendNotification(
            @RequestHeader(value = "Authorization", required = false) String token,
            @Valid @RequestBody NotificationDTO dto) {
        NotificationDTO sent = notificationService.sendNotification(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Notification sent", sent));
    }

    /** GET /api/notifications/history — Get notification history for Admin */
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getNotificationHistory(
            @RequestHeader(value = "Authorization", required = false) String token) {
        List<NotificationDTO> history = notificationService.getAllNotifications();
        return ResponseEntity.ok(ApiResponse.success("Notification history retrieved", history));
    }

    /** GET /api/notifications — Alias for all notifications */
    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getAllNotifications() {
        List<NotificationDTO> history = notificationService.getAllNotifications();
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    /** GET /api/notifications/student — Get notifications visible to Students/Parents */
    @GetMapping("/student")
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getNotificationsForStudent(
            @RequestHeader(value = "Authorization", required = false) String token) {
        Long parentId = null;
        if (token != null) {
            String rawToken = jwtDecoder.extractRaw(token);
            if (rawToken != null && jwtDecoder.isValidToken(rawToken)) {
                parentId = jwtDecoder.getUserId(rawToken);
            }
        }
        List<NotificationDTO> notifs = notificationService.getStudentNotifications(parentId);
        return ResponseEntity.ok(ApiResponse.success("Student notifications retrieved", notifs));
    }

    /** GET /api/notifications/teacher — Get notifications visible to Teachers */
    @GetMapping("/teacher")
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getNotificationsForTeacher(
            @RequestHeader(value = "Authorization", required = false) String token) {
        List<NotificationDTO> notifs = notificationService.getTeacherNotifications();
        return ResponseEntity.ok(ApiResponse.success("Teacher notifications retrieved", notifs));
    }

    /** GET /api/notifications/parent/{parentId} — Get all notifications for a specific parent */
    @GetMapping("/parent/{parentId}")
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getNotificationsForParent(
            @PathVariable("parentId") Long parentId) {
        List<NotificationDTO> notifs = notificationService.getNotificationsForParent(parentId);
        return ResponseEntity.ok(ApiResponse.success(notifs));
    }

    /** PUT /api/notifications/{id}/read — Mark a notification as read */
    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationDTO>> markAsRead(@PathVariable("id") Long id) {
        NotificationDTO notif = notificationService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read", notif));
    }
}
