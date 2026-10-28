package com.school.notification.service;

import com.school.common.exception.ResourceNotFoundException;
import com.school.notification.dto.NotificationDTO;
import com.school.notification.entity.Notification;
import com.school.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

/**
 * Business logic for Notification management.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public static String normalizeAudience(String audience) {
        if (audience == null || audience.trim().isEmpty()) {
            return "BOTH";
        }
        String upper = audience.trim().toUpperCase();
        if (upper.startsWith("STUDENT")) {
            return "STUDENTS";
        }
        if (upper.startsWith("TEACHER")) {
            return "TEACHERS";
        }
        if ("BOTH".equals(upper)) {
            return "BOTH";
        }
        return upper;
    }

    /** Admin sends a notification to an audience */
    public NotificationDTO sendNotification(NotificationDTO dto) {
        String normalizedAudience = normalizeAudience(dto.getAudience());
        Notification notification = Notification.builder()
                .date(dto.getDate())
                .audience(normalizedAudience)
                .message(dto.getMessage())
                .status("SENT")
                .targetStudentId(dto.getTargetStudentId())
                .build();

        Notification saved = notificationRepository.save(notification);
        log.info("Notification sent to {}: {}", normalizedAudience, dto.getMessage());
        return toDTO(saved);
    }

    /** Admin edits the message of a previously sent notification. */
    public NotificationDTO updateMessage(Long id, String newMessage) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", id));
        notification.setMessage(newMessage);
        Notification saved = notificationRepository.save(notification);
        log.info("Notification {} message edited", id);
        return toDTO(saved);
    }

    /** Admin views all notification history */
    public List<NotificationDTO> getAllNotifications() {
        return notificationRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDTO)
                .toList();
    }

    /** Teachers/staff fetch notifications targeted at STAFF (or the legacy TEACHERS/BOTH values). */
    public List<NotificationDTO> getNotificationsForStaffRole() {
        return notificationRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(n -> matchesStaffAudience(n.getAudience()))
                .map(this::toDTO)
                .toList();
    }

    /**
     * Parent/Student fetch: broadcasts targeted at ALL_STUDENTS, at the student's own class
     * (or the legacy STUDENTS/BOTH values), additionally filtered to notices targeted at their
     * own child when a notification carries a specific targetStudentId.
     */
    public List<NotificationDTO> getNotificationsForStudentRole(Long studentId, String className) {
        return notificationRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(n -> matchesStudentAudience(n.getAudience(), className))
                .filter(n -> n.getTargetStudentId() == null || n.getTargetStudentId().equals(studentId))
                .map(this::toDTO)
                .toList();
    }

    /**
     * Matches the new comma-separated token format (class internal values like "Class 1", plus
     * ALL_STUDENTS/STAFF) as well as the legacy single-value STUDENTS/STUDENT/BOTH audience rows
     * from before per-class targeting existed.
     */
    private boolean matchesStudentAudience(String audience, String className) {
        if (audience == null || audience.isBlank()) return false;
        String upper = audience.trim().toUpperCase();
        if (upper.equals("STUDENTS") || upper.equals("STUDENT") || upper.equals("BOTH")) {
            return true;
        }
        List<String> tokens = Arrays.stream(audience.split(",")).map(String::trim).toList();
        if (tokens.stream().anyMatch(t -> t.equalsIgnoreCase("ALL_STUDENTS"))) {
            return true;
        }
        return className != null && tokens.stream().anyMatch(t -> t.equalsIgnoreCase(className));
    }

    /** Same idea as matchesStudentAudience, for the STAFF token / legacy TEACHERS/TEACHER/BOTH. */
    private boolean matchesStaffAudience(String audience) {
        if (audience == null || audience.isBlank()) return false;
        String upper = audience.trim().toUpperCase();
        if (upper.equals("TEACHERS") || upper.equals("TEACHER") || upper.equals("BOTH")) {
            return true;
        }
        List<String> tokens = Arrays.stream(audience.split(",")).map(String::trim).toList();
        return tokens.stream().anyMatch(t -> t.equalsIgnoreCase("STAFF"));
    }

    private NotificationDTO toDTO(Notification notification) {
        return NotificationDTO.builder()
                .id(notification.getId())
                .date(notification.getDate())
                .audience(notification.getAudience())
                .message(notification.getMessage())
                .status(notification.getStatus())
                .targetStudentId(notification.getTargetStudentId())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
