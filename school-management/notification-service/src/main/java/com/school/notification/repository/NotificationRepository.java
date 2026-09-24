package com.school.notification.repository;

import com.school.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

/**
 * Repository for Notification entity with audience and history queries.
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByParentIdOrderByCreatedAtDesc(Long parentId);

    long countByParentIdAndReadFalse(Long parentId);

    List<Notification> findAllByOrderByIdDesc();

    @Query("SELECT n FROM Notification n WHERE UPPER(n.targetAudience) IN :audiences OR (n.parentId IS NOT NULL AND n.parentId = :parentId) ORDER BY n.id DESC")
    List<Notification> findForStudentOrParent(@Param("audiences") Collection<String> audiences, @Param("parentId") Long parentId);

    @Query("SELECT n FROM Notification n WHERE UPPER(n.targetAudience) IN :audiences ORDER BY n.id DESC")
    List<Notification> findForAudiences(@Param("audiences") Collection<String> audiences);
}
