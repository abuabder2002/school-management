package com.school.auth.service;

import com.school.auth.dto.FeatureToggleDTO;
import com.school.auth.entity.FeatureToggle;
import com.school.auth.repository.FeatureToggleRepository;
import com.school.common.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Registry of which portal modules each role can be shown, and the admin on/off switches
 * for them. A module with no stored row is enabled by default, so adding a new module to
 * the registry below never requires a data migration.
 */
@Service
@RequiredArgsConstructor
public class FeatureToggleService {

    private final FeatureToggleRepository featureToggleRepository;

    private static final Map<String, Map<String, String>> MODULE_REGISTRY = new LinkedHashMap<>();
    static {
        Map<String, String> teacher = new LinkedHashMap<>();
        teacher.put("HOMEWORK", "Homework");
        teacher.put("HOLIDAYS", "Holidays");
        teacher.put("LEAVE", "Leave");
        teacher.put("NOTIFICATIONS", "Announcements");
        MODULE_REGISTRY.put("TEACHER", teacher);

        Map<String, String> parent = new LinkedHashMap<>();
        parent.put("HOMEWORK", "Homework");
        parent.put("FEES", "Fees");
        parent.put("MARKS", "Marks");
        parent.put("BOARD_RESULTS", "Board Results");
        parent.put("LEAVE", "Leave");
        parent.put("NOTIFICATIONS", "Notifications");
        MODULE_REGISTRY.put("PARENT", parent);
    }

    public List<FeatureToggleDTO> getTogglesForRole(String role) {
        String normalizedRole = normalizeRole(role);
        Map<String, String> modules = MODULE_REGISTRY.get(normalizedRole);
        if (modules == null) {
            throw new BadRequestException("Unknown role: " + role);
        }
        List<FeatureToggle> stored = featureToggleRepository.findByRole(normalizedRole);
        Map<String, Boolean> storedByKey = new LinkedHashMap<>();
        for (FeatureToggle t : stored) {
            storedByKey.put(t.getModuleKey(), t.isEnabled());
        }
        return modules.entrySet().stream()
                .map(entry -> FeatureToggleDTO.builder()
                        .role(normalizedRole)
                        .moduleKey(entry.getKey())
                        .label(entry.getValue())
                        .enabled(storedByKey.getOrDefault(entry.getKey(), true))
                        .build())
                .toList();
    }

    public List<FeatureToggleDTO> getAllToggles() {
        return MODULE_REGISTRY.keySet().stream()
                .flatMap(role -> getTogglesForRole(role).stream())
                .toList();
    }

    public FeatureToggleDTO setToggle(String role, String moduleKey, boolean enabled) {
        String normalizedRole = normalizeRole(role);
        Map<String, String> modules = MODULE_REGISTRY.get(normalizedRole);
        if (modules == null || !modules.containsKey(moduleKey)) {
            throw new BadRequestException("Unknown module '" + moduleKey + "' for role " + role);
        }
        FeatureToggle toggle = featureToggleRepository.findByRoleAndModuleKey(normalizedRole, moduleKey)
                .orElseGet(() -> FeatureToggle.builder().role(normalizedRole).moduleKey(moduleKey).build());
        toggle.setEnabled(enabled);
        featureToggleRepository.save(toggle);
        return FeatureToggleDTO.builder()
                .role(normalizedRole)
                .moduleKey(moduleKey)
                .label(modules.get(moduleKey))
                .enabled(enabled)
                .build();
    }

    private String normalizeRole(String role) {
        if (role == null) {
            throw new BadRequestException("Role is required");
        }
        return role.trim().toUpperCase().replaceFirst("^ROLE_", "");
    }
}
