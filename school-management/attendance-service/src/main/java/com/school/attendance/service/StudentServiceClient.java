package com.school.attendance.service;

import com.school.attendance.dto.StudentInfoDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
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

    public StudentInfoDTO getStudentById(Long id, Long schoolId) {
        if (id == null) return null;
        try {
            return fetchStudent(loadBalancedRestTemplate, URI.create(LB_BASE + "/" + id + "?schoolId=" + schoolId));
        } catch (Exception e1) {
            try {
                return fetchStudent(directRestTemplate, URI.create(DIRECT_BASE + "/" + id + "?schoolId=" + schoolId));
            } catch (Exception e2) {
                log.error("Failed to fetch student by id {}: {}", id, e2.getMessage());
                return null;
            }
        }
    }

    @SuppressWarnings("unchecked")
    private StudentInfoDTO fetchStudent(RestTemplate restTemplate, URI uri) {
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                uri,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<Map<String, Object>>() {}
        );
        if (response.getBody() != null && response.getBody().get("data") instanceof Map) {
            Map<String, Object> item = (Map<String, Object>) response.getBody().get("data");
            return mapToStudentInfo(item);
        }
        return null;
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
                List<StudentInfoDTO> result = new ArrayList<>();
                for (Map<String, Object> item : list) {
                    StudentInfoDTO dto = mapToStudentInfo(item);
                    if (dto != null) result.add(dto);
                }
                return result;
            }
        }
        return Collections.emptyList();
    }

    private StudentInfoDTO mapToStudentInfo(Map<String, Object> item) {
        if (item == null) return null;
        Long id = null;
        if (item.get("id") != null) {
            id = Long.valueOf(item.get("id").toString());
        }
        return StudentInfoDTO.builder()
                .id(id)
                .admissionNumber((String) item.get("admissionNumber"))
                .name((String) item.get("name"))
                .className((String) item.get("className"))
                .section((String) item.get("section"))
                .build();
    }
}
