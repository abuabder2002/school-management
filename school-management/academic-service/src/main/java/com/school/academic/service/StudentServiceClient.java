package com.school.academic.service;

import com.school.academic.dto.StudentInfoDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentServiceClient {

    @Qualifier("loadBalancedRestTemplate")
    private final RestTemplate loadBalancedRestTemplate;

    @Qualifier("restTemplate")
    private final RestTemplate directRestTemplate;

    private static final String LB_BASE = "http://STUDENT-SERVICE/api/students";
    private static final String DIRECT_BASE = "http://localhost:8082/api/students";

    public List<String> getDistinctClasses(Long schoolId) {
        try {
            return fetchClasses(loadBalancedRestTemplate, URI.create(LB_BASE + "/classes?schoolId=" + schoolId));
        } catch (Exception e1) {
            try {
                return fetchClasses(directRestTemplate, URI.create(DIRECT_BASE + "/classes?schoolId=" + schoolId));
            } catch (Exception e2) {
                log.error("Failed to fetch classes: {}", e2.getMessage());
                return Collections.emptyList();
            }
        }
    }

    public List<StudentInfoDTO> getActiveStudentsByClass(String className, Long schoolId) {
        String encodedClass = org.springframework.web.util.UriUtils.encodePathSegment(className, StandardCharsets.UTF_8);
        try {
            return fetchStudentsList(loadBalancedRestTemplate, URI.create(LB_BASE + "/class/" + encodedClass + "/active?schoolId=" + schoolId));
        } catch (Exception e1) {
            try {
                return fetchStudentsList(directRestTemplate, URI.create(DIRECT_BASE + "/class/" + encodedClass + "/active?schoolId=" + schoolId));
            } catch (Exception e2) {
                log.error("Failed to fetch active students for {}: {}", className, e2.getMessage());
                return Collections.emptyList();
            }
        }
    }

    public List<StudentInfoDTO> getAllStudents(Long schoolId) {
        try {
            return fetchAllStudentsPaged(loadBalancedRestTemplate, URI.create(LB_BASE + "?page=1&pageSize=10000&schoolId=" + schoolId));
        } catch (Exception e1) {
            try {
                return fetchAllStudentsPaged(directRestTemplate, URI.create(DIRECT_BASE + "?page=1&pageSize=10000&schoolId=" + schoolId));
            } catch (Exception e2) {
                log.error("Failed to fetch all students: {}", e2.getMessage());
                return Collections.emptyList();
            }
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> fetchClasses(RestTemplate restTemplate, URI uri) {
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                uri,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<Map<String, Object>>() {}
        );
        if (response.getBody() != null && response.getBody().get("data") instanceof List) {
            return (List<String>) response.getBody().get("data");
        }
        return Collections.emptyList();
    }

    @SuppressWarnings("unchecked")
    private List<StudentInfoDTO> fetchStudentsList(RestTemplate restTemplate, URI uri) {
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                uri,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<Map<String, Object>>() {}
        );
        if (response.getBody() != null && response.getBody().get("data") instanceof List) {
            List<Map<String, Object>> list = (List<Map<String, Object>>) response.getBody().get("data");
            return mapToStudentInfoList(list);
        }
        return Collections.emptyList();
    }

    @SuppressWarnings("unchecked")
    private List<StudentInfoDTO> fetchAllStudentsPaged(RestTemplate restTemplate, URI uri) {
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                uri,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<Map<String, Object>>() {}
        );
        if (response.getBody() != null && response.getBody().get("data") instanceof Map) {
            Map<String, Object> pageData = (Map<String, Object>) response.getBody().get("data");
            if (pageData.get("data") instanceof List) {
                List<Map<String, Object>> list = (List<Map<String, Object>>) pageData.get("data");
                return mapToStudentInfoList(list);
            }
        }
        return Collections.emptyList();
    }

    private List<StudentInfoDTO> mapToStudentInfoList(List<Map<String, Object>> list) {
        List<StudentInfoDTO> result = new ArrayList<>();
        for (Map<String, Object> item : list) {
            Long id = null;
            if (item.get("id") != null) {
                id = Long.valueOf(item.get("id").toString());
            }
            Boolean isActive = Boolean.TRUE;
            if (item.get("isActive") != null) {
                isActive = Boolean.valueOf(item.get("isActive").toString());
            }
            List<String> mobiles = new ArrayList<>();
            String primaryMobile = null;
            for (String key : new String[]{"fatherMobileNumber", "contactNumber", "motherMobileNumber", "guardianMobileNumber", "phoneNumber"}) {
                Object val = item.get(key);
                if (val != null && !val.toString().isBlank()) {
                    String mobile = val.toString().trim();
                    if (primaryMobile == null) primaryMobile = mobile;
                    if (!mobiles.contains(mobile)) mobiles.add(mobile);
                }
            }
            result.add(StudentInfoDTO.builder()
                    .id(id)
                    .admissionNumber((String) item.get("admissionNumber"))
                    .name((String) item.get("name"))
                    .className((String) item.get("className"))
                    .section((String) item.get("section"))
                    .isActive(isActive)
                    .contactNumber(primaryMobile)
                    .mobileNumbers(mobiles)
                    .build());
        }
        return result;
    }
}
