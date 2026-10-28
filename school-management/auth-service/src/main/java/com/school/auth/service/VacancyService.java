package com.school.auth.service;

import com.school.auth.entity.Vacancy;
import com.school.auth.repository.UserRepository;
import com.school.auth.repository.VacancyRepository;
import com.school.common.exception.BadRequestException;
import com.school.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * School-scoped CRUD for internal staff vacancies. Every operation resolves the caller's own
 * schoolId from their User row and only ever touches that school's vacancies.
 */
@Service
@RequiredArgsConstructor
public class VacancyService {

    private final VacancyRepository vacancyRepository;
    private final UserRepository userRepository;

    private Long currentActorSchoolId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = (authentication != null) ? authentication.getName() : null;
        Long schoolId = email != null
                ? userRepository.findByEmail(email).map(u -> u.getSchoolId()).orElse(null)
                : null;
        if (schoolId == null) {
            throw new BadRequestException("Could not resolve your school; please log in again.");
        }
        return schoolId;
    }

    public List<Vacancy> listForCurrentSchool() {
        return vacancyRepository.findBySchoolIdOrderByCreatedAtDesc(currentActorSchoolId());
    }

    public Vacancy create(Vacancy vacancy) {
        vacancy.setId(null);
        vacancy.setSchoolId(currentActorSchoolId());
        return vacancyRepository.save(vacancy);
    }

    public Vacancy update(Long id, Vacancy updated) {
        Vacancy existing = findOwned(id);
        existing.setTitle(updated.getTitle());
        existing.setDepartment(updated.getDepartment());
        existing.setDescription(updated.getDescription());
        if (updated.getStatus() != null) {
            existing.setStatus(updated.getStatus());
        }
        return vacancyRepository.save(existing);
    }

    public void delete(Long id) {
        Vacancy existing = findOwned(id);
        vacancyRepository.delete(existing);
    }

    private Vacancy findOwned(Long id) {
        Long schoolId = currentActorSchoolId();
        Vacancy vacancy = vacancyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vacancy", "id", id));
        if (!schoolId.equals(vacancy.getSchoolId())) {
            throw new ResourceNotFoundException("Vacancy", "id", id);
        }
        return vacancy;
    }
}
