package com.school.notification.repository;

import com.school.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for Notification entity.
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByParentIdOrderByCreatedAtDesc(Long parentId);

    long countByParentIdAndReadFalse(Long parentId);
}
