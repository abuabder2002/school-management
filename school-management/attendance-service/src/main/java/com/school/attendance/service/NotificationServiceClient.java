package com.school.attendance.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.time.LocalDate;
import java.util.Map;

/**
 * Fire-and-forget call into notification-service so a teacher leave submission also shows up
 * as a notification. Sent with no Authorization header, the same internal-call pattern already
 * used by the *ServiceClient classes that call into student-service: the gateway requires a
 * valid token for every external /api/** request, so an unauthenticated call only ever reaches
 * notification-service from inside the backend's own network.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceClient {

    @Qualifier("loadBalancedRestTemplate")
    private final RestTemplate loadBalancedRestTemplate;

    @Qualifier("restTemplate")
    private final RestTemplate directRestTemplate;

    private static final String LB_URI = "http://NOTIFICATION-SERVICE/api/notifications";
    private static final String DIRECT_URI = "http://localhost:8086/api/notifications";

    public void notify(String audience, String message, Long schoolId) {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("date", LocalDate.now().toString());
        body.put("audience", audience);
        body.put("message", message);
        body.put("schoolId", schoolId);
        send(body);
    }

    /** Targets a single student's parent portal (and the admin-wide STUDENTS feed) via targetStudentId. */
    public void notifyStudent(Long studentId, String message, Long schoolId) {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("date", LocalDate.now().toString());
        body.put("audience", "STUDENTS");
        body.put("message", message);
        body.put("targetStudentId", studentId);
        body.put("schoolId", schoolId);
        send(body);
    }

    private void send(Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        try {
            loadBalancedRestTemplate.postForEntity(URI.create(LB_URI), entity, Void.class);
        } catch (Exception e1) {
            try {
                directRestTemplate.postForEntity(URI.create(DIRECT_URI), entity, Void.class);
            } catch (Exception e2) {
                // Notification is a courtesy, not the source of truth — never fail the caller's request over it.
                log.warn("Could not create notification: {}", e2.getMessage());
            }
        }
    }
}
