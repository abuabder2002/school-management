package com.school.notification.controller;

import com.school.common.dto.ApiResponse;
import com.school.notification.dto.NotificationDTO;
import com.school.notification.security.JwtDecoder;
import com.school.notification.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for Notification management.
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final JwtDecoder jwtDecoder;

    /**
     * POST /api/notifications — Admin sends a notification.
     * Also called service-to-service (no Authorization header) by attendance-service when a
     * teacher submits their own leave — same internal-call pattern used by the *ServiceClient
     * classes that call into student-service: the gateway requires a valid token for every
     * external /api/** request, so a request with no header at all only ever reaches this
     * service from inside the backend's own network. An internal caller supplies schoolId
     * directly in the body (it already resolved it from its own caller's JWT); an external
     * ADMIN caller has it resolved from their own token instead.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<NotificationDTO>> sendNotification(
            @Valid @RequestBody NotificationDTO dto,
            HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        Long schoolId = null;
        if (authHeader != null) {
            String token = jwtDecoder.extractRaw(authHeader);
            if (token == null || !jwtDecoder.isValidToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("Invalid or expired authentication token"));
            }
            String role = jwtDecoder.getRole(token);
            if (!"ADMIN".equals(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Only ADMIN can send notifications"));
            }
            schoolId = jwtDecoder.getSchoolId(token);
        } else if (dto.getSchoolId() != null) {
            schoolId = dto.getSchoolId();
        }
        if (schoolId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("schoolId could not be resolved."));
        }

        NotificationDTO sent = notificationService.sendNotification(dto, schoolId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Notification sent", sent));
    }

    /** PUT /api/notifications/{id} — Admin edits the message of a previously sent notification. */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<NotificationDTO>> updateNotification(
            @PathVariable("id") Long id,
            @RequestBody java.util.Map<String, String> body,
            HttpServletRequest request) {
        String token = jwtDecoder.extractRaw(request.getHeader("Authorization"));
        if (token == null || !jwtDecoder.isValidToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid or expired authentication token"));
        }
        String role = jwtDecoder.getRole(token);
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Only ADMIN can edit notifications"));
        }
        String newMessage = body.get("message");
        if (newMessage == null || newMessage.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Message is required"));
        }
        NotificationDTO updated = notificationService.updateMessage(id, newMessage.trim(), jwtDecoder.getSchoolId(token));
        return ResponseEntity.ok(ApiResponse.success("Notification updated", updated));
    }

    /** GET /api/notifications/history — Admin views all notification history */
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getHistory(HttpServletRequest request) {
        String token = jwtDecoder.extractRaw(request.getHeader("Authorization"));
        if (token == null || !jwtDecoder.isValidToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid or expired authentication token"));
        }
        String role = jwtDecoder.getRole(token);
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Only ADMIN can view notification history"));
        }

        List<NotificationDTO> history = notificationService.getAllNotifications(jwtDecoder.getSchoolId(token));
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    /**
     * GET /api/notifications/my — Students/Teachers fetch their applicable notifications.
     * className is supplied by Parent/Student portals (they already have their own child's
     * class loaded) so class-targeted broadcasts can be matched without notification-service
     * needing its own call out to student-service.
     */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getMyNotifications(
            @RequestParam(value = "className", required = false) String className,
            HttpServletRequest request) {
        String token = jwtDecoder.extractRaw(request.getHeader("Authorization"));
        if (token == null || !jwtDecoder.isValidToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid or missing authentication token"));
        }

        String role = jwtDecoder.getRole(token);
        Long schoolId = jwtDecoder.getSchoolId(token);

        if ("TEACHER".equals(role)) {
            return ResponseEntity.ok(ApiResponse.success(notificationService.getNotificationsForStaffRole(schoolId)));
        } else if ("PARENT".equals(role) || "STUDENT".equals(role)) {
            Long studentId = jwtDecoder.getStudentId(token);
            List<NotificationDTO> notifications = notificationService.getNotificationsForStudentRole(studentId, className, schoolId);
            return ResponseEntity.ok(ApiResponse.success(notifications));
        } else if ("ADMIN".equals(role)) {
            // Admin can see all
            List<NotificationDTO> all = notificationService.getAllNotifications(schoolId);
            return ResponseEntity.ok(ApiResponse.success(all));
        } else {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Unknown role"));
        }
    }
}
