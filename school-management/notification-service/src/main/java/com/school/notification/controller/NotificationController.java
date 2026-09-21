package com.school.notification.controller;

import com.school.common.dto.ApiResponse;
import com.school.notification.dto.NotificationDTO;
import com.school.notification.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
public class NotificationController {

    private final NotificationService notificationService;

    /** POST /api/notifications — Send a notification to a parent */
    @PostMapping
    public ResponseEntity<ApiResponse<NotificationDTO>> sendNotification(@Valid @RequestBody NotificationDTO dto) {
        NotificationDTO sent = notificationService.sendNotification(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Notification sent", sent));
    }

    /** GET /api/notifications/parent/{parentId} — Get all notifications for a parent */
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
