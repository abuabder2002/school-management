package com.school.notification.service;

import com.school.common.exception.ResourceNotFoundException;
import com.school.notification.dto.NotificationDTO;
import com.school.notification.entity.Notification;
import com.school.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

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
        Notification notification = Notification.builder()
                .parentId(dto.getParentId())
                .title(dto.getTitle())
                .message(dto.getMessage())
                .read(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        log.info("Notification sent to parent {}: {}", dto.getParentId(), dto.getTitle());
        return toDTO(saved);
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
                .createdAt(notification.getCreatedAt())
                .read(notification.isRead())
                .build();
    }
}
