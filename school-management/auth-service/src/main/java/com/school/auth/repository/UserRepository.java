package com.school.auth.repository;

import com.school.auth.entity.User;
import com.school.common.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for User entity.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByRole(Role role);

    Optional<User> findByRoleAndStudentId(Role role, Long studentId);

    Optional<User> findFirstByRoleAndStudentId(Role role, Long studentId);

    Optional<User> findFirstByStudentId(Long studentId);

    List<User> findBySchoolId(Long schoolId);

    Optional<User> findFirstBySchoolIdAndRole(Long schoolId, Role role);

}
