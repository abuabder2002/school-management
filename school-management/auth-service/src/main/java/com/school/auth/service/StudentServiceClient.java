package com.school.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.school.auth.dto.StudentAuthDTO;
import com.school.common.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentServiceClient {

    @Qualifier("loadBalancedRestTemplate")
    private final RestTemplate loadBalancedRestTemplate;

    @Qualifier("restTemplate")
    private final RestTemplate directRestTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String LB_BASE = "http://STUDENT-SERVICE/api/students/verify-parent-credentials";
    private static final String DIRECT_BASE = "http://localhost:8082/api/students/verify-parent-credentials";

    public StudentAuthDTO verifyParentCredentials(String phoneNumber, String password) {
        Map<String, String> payload = new HashMap<>();
        payload.put("phoneNumber", phoneNumber);
        payload.put("password", password);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(payload, headers);

        try {
            return doVerify(loadBalancedRestTemplate, URI.create(LB_BASE), entity);
        } catch (HttpStatusCodeException httpEx) {
            handleHttpException(httpEx);
            return null; // unreachable
        } catch (Exception e1) {
            log.warn("LoadBalanced call to student-service failed ({}), falling back to direct call", e1.getMessage());
            try {
                return doVerify(directRestTemplate, URI.create(DIRECT_BASE), entity);
            } catch (HttpStatusCodeException httpEx) {
                handleHttpException(httpEx);
                return null; // unreachable
            } catch (Exception e2) {
                log.error("Direct call to student-service also failed: {}", e2.getMessage());
                throw new BadRequestException("Student service is currently unavailable. Please try again later.");
            }
        }
    }

    @SuppressWarnings("unchecked")
    private StudentAuthDTO doVerify(RestTemplate restTemplate, URI uri, HttpEntity<Map<String, String>> entity) {
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                uri,
                HttpMethod.POST,
                entity,
                new ParameterizedTypeReference<Map<String, Object>>() {}
        );

        if (response.getBody() != null && response.getBody().get("data") instanceof Map) {
            Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
            Long studentId = data.get("studentId") != null ? Long.valueOf(data.get("studentId").toString()) : null;
            String studentName = data.get("studentName") != null ? data.get("studentName").toString() : "";
            String admissionNumber = data.get("admissionNumber") != null ? data.get("admissionNumber").toString() : "";
            String className = data.get("className") != null ? data.get("className").toString() : "";
            String section = data.get("section") != null ? data.get("section").toString() : "";
            String phone = data.get("phoneNumber") != null ? data.get("phoneNumber").toString() : "";
            Boolean isActive = data.get("isActive") != null ? Boolean.valueOf(data.get("isActive").toString()) : true;
            Long schoolId = data.get("schoolId") != null ? Long.valueOf(data.get("schoolId").toString()) : null;

            return StudentAuthDTO.builder()
                    .studentId(studentId)
                    .studentName(studentName)
                    .admissionNumber(admissionNumber)
                    .className(className)
                    .section(section)
                    .phoneNumber(phone)
                    .isActive(isActive)
                    .schoolId(schoolId)
                    .build();
        }

        throw new BadRequestException("Invalid credentials or response from student service");
    }

    private void handleHttpException(HttpStatusCodeException httpEx) {
        String responseBody = httpEx.getResponseBodyAsString();
        log.warn("student-service returned status {}: {}", httpEx.getStatusCode(), responseBody);
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            if (root.has("message")) {
                throw new BadRequestException(root.get("message").asText());
            }
        } catch (BadRequestException bre) {
            throw bre;
        } catch (Exception parseEx) {
            log.warn("Could not parse error response from student-service: {}", parseEx.getMessage());
        }
        throw new BadRequestException("Invalid phone number or password");
    }
}
