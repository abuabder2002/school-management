package com.school.notification.service;

import com.school.common.exception.ResourceNotFoundException;
import com.school.notification.dto.NotificationDTO;
import com.school.notification.entity.Notification;
import com.school.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
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

    public NotificationDTO sendNotification(NotificationDTO dto) {
        String audience = dto.getTargetAudience();
        if (audience != null) {
            audience = audience.trim().toUpperCase();
        } else if (dto.getParentId() == null) {
            audience = "BOTH";
        }

        Notification notification = Notification.builder()
                .parentId(dto.getParentId())
                .title(dto.getTitle() != null && !dto.getTitle().isBlank() ? dto.getTitle() : "Notification")
                .message(dto.getMessage())
                .notificationDate(dto.getDate() != null ? dto.getDate() : LocalDate.now())
                .targetAudience(audience)
                .status(dto.getStatus() != null && !dto.getStatus().isBlank() ? dto.getStatus() : "Sent")
                .read(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        log.info("Notification created with ID {} for audience: {}", saved.getId(), saved.getTargetAudience());
        return toDTO(saved);
    }

    public List<NotificationDTO> getAllNotifications() {
        return notificationRepository.findAllByOrderByIdDesc().stream()
                .map(this::toDTO)
                .toList();
    }

    public List<NotificationDTO> getStudentNotifications(Long parentId) {
        List<String> studentAudiences = Arrays.asList("STUDENTS", "BOTH");
        if (parentId != null) {
            return notificationRepository.findForStudentOrParent(studentAudiences, parentId).stream()
                    .map(this::toDTO)
                    .toList();
        }
        return notificationRepository.findForAudiences(studentAudiences).stream()
                .map(this::toDTO)
                .toList();
    }

    public List<NotificationDTO> getTeacherNotifications() {
        List<String> teacherAudiences = Arrays.asList("TEACHERS", "BOTH");
        return notificationRepository.findForAudiences(teacherAudiences).stream()
                .map(this::toDTO)
                .toList();
    }

    public List<NotificationDTO> getNotificationsForParent(Long parentId) {
        return notificationRepository.findByParentIdOrderByCreatedAtDesc(parentId).stream()
                .map(this::toDTO)
                .toList();
    }

    public NotificationDTO markAsRead(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", id));
        notification.setRead(true);
        Notification updated = notificationRepository.save(notification);
        return toDTO(updated);
    }

    private NotificationDTO toDTO(Notification notification) {
        return NotificationDTO.builder()
                .id(notification.getId())
                .parentId(notification.getParentId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .date(notification.getNotificationDate())
                .targetAudience(notification.getTargetAudience())
                .status(notification.getStatus())
                .createdAt(notification.getCreatedAt())
                .read(notification.isRead())
                .build();
    }
}
