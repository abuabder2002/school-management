package com.school.auth.controller;

import com.school.auth.entity.Vacancy;
import com.school.auth.service.VacancyService;
import com.school.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin-only CRUD for internal staff vacancies, scoped to the caller's own school
 * (SecurityConfig restricts this path to ADMIN; VacancyService enforces school ownership).
 */
@RestController
@RequestMapping("/api/auth/vacancies")
@RequiredArgsConstructor
public class VacancyController {

    private final VacancyService vacancyService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Vacancy>>> list() {
        return ResponseEntity.ok(ApiResponse.success(vacancyService.listForCurrentSchool()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Vacancy>> create(@RequestBody Vacancy vacancy) {
        Vacancy created = vacancyService.create(vacancy);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Vacancy posted", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Vacancy>> update(@PathVariable("id") Long id, @RequestBody Vacancy vacancy) {
        return ResponseEntity.ok(ApiResponse.success("Vacancy updated", vacancyService.update(id, vacancy)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable("id") Long id) {
        vacancyService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Vacancy deleted", null));
    }
}
