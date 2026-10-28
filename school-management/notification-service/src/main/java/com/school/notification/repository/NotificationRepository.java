package com.school.notification.repository;

import com.school.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for Notification entity. Audience matching (class-level targeting, STAFF, legacy
 * single-value rows) happens in NotificationService rather than JPQL — the token-list format
 * (comma-separated class names, ALL_STUDENTS, STAFF) isn't safe to substring-match in SQL
 * (e.g. "Class 1" vs "Class 10"), and the data volume here is small enough that filtering the
 * full list in Java is simpler and correct.
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /** All notifications, newest first — for Admin history, and the base list every role filters from. */
    List<Notification> findAllByOrderByCreatedAtDesc();
}
