package com.school.auth.service;

import com.school.auth.dto.SchoolModuleToggleDTO;
import com.school.auth.entity.SchoolModuleToggle;
import com.school.auth.repository.SchoolModuleToggleRepository;
import com.school.common.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Registry of which admin modules a School can be given, and the Super Admin on/off switches
 * for them. Mirrors FeatureToggleService's registry+override pattern, scoped by schoolId
 * instead of role: a module with no stored row is enabled by default.
 */
@Service
@RequiredArgsConstructor
public class SchoolModuleToggleService {

    private final SchoolModuleToggleRepository toggleRepository;

    private static final Map<String, String> MODULE_REGISTRY = new LinkedHashMap<>();
    static {
        MODULE_REGISTRY.put("DASHBOARD", "Dashboard");
        MODULE_REGISTRY.put("NOTICE", "Notifications");
        MODULE_REGISTRY.put("STUDENTS", "Students");
        MODULE_REGISTRY.put("STAFF", "Staff Accounts");
        MODULE_REGISTRY.put("ACADEMICS", "Academics / Homework");
        MODULE_REGISTRY.put("ATTENDANCE", "Attendance");
        MODULE_REGISTRY.put("LEAVE_RECORDS", "Leave Records");
        MODULE_REGISTRY.put("LEAVE_REASONS", "Leave Reasons");
        MODULE_REGISTRY.put("BILLING", "Billing");
        MODULE_REGISTRY.put("MARKS", "Marks");
        MODULE_REGISTRY.put("BOARD_RESULTS", "Board Results");
        MODULE_REGISTRY.put("ID_CARDS", "ID Cards");
        MODULE_REGISTRY.put("MODULE_ACCESS", "Module Access");
    }

    public static Map<String, String> registry() {
        return MODULE_REGISTRY;
    }

    public List<SchoolModuleToggleDTO> getTogglesForSchool(Long schoolId) {
        List<SchoolModuleToggle> stored = toggleRepository.findBySchoolId(schoolId);
        Map<String, Boolean> storedByKey = new LinkedHashMap<>();
        for (SchoolModuleToggle t : stored) {
            storedByKey.put(t.getModuleKey(), t.isEnabled());
        }
        return MODULE_REGISTRY.entrySet().stream()
                .map(entry -> SchoolModuleToggleDTO.builder()
                        .schoolId(schoolId)
                        .moduleKey(entry.getKey())
                        .label(entry.getValue())
                        .enabled(storedByKey.getOrDefault(entry.getKey(), true))
                        .build())
                .toList();
    }

    public SchoolModuleToggleDTO setToggle(Long schoolId, String moduleKey, boolean enabled) {
        if (!MODULE_REGISTRY.containsKey(moduleKey)) {
            throw new BadRequestException("Unknown module: " + moduleKey);
        }
        SchoolModuleToggle toggle = toggleRepository.findBySchoolIdAndModuleKey(schoolId, moduleKey)
                .orElseGet(() -> SchoolModuleToggle.builder().schoolId(schoolId).moduleKey(moduleKey).build());
        toggle.setEnabled(enabled);
        toggleRepository.save(toggle);
        return SchoolModuleToggleDTO.builder()
                .schoolId(schoolId)
                .moduleKey(moduleKey)
                .label(MODULE_REGISTRY.get(moduleKey))
                .enabled(enabled)
                .build();
    }
}
