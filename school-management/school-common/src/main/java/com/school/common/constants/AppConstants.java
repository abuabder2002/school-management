package com.school.common.constants;

/**
 * Application-wide constants shared across microservices.
 */
public final class AppConstants {

    private AppConstants() {
        // Utility class — do not instantiate
    }

    // JWT
    public static final String JWT_HEADER = "Authorization";
    public static final String JWT_PREFIX = "Bearer ";

    // Pagination defaults
    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int DEFAULT_PAGE_NUMBER = 0;
    public static final String DEFAULT_SORT_BY = "id";
    public static final String DEFAULT_SORT_DIR = "asc";

    // Service names (as registered with Eureka)
    public static final String AUTH_SERVICE = "AUTH-SERVICE";
    public static final String STUDENT_SERVICE = "STUDENT-SERVICE";
    public static final String ACADEMIC_SERVICE = "ACADEMIC-SERVICE";
    public static final String ATTENDANCE_SERVICE = "ATTENDANCE-SERVICE";
    public static final String FEE_SERVICE = "FEE-SERVICE";
    public static final String NOTIFICATION_SERVICE = "NOTIFICATION-SERVICE";
}
