package com.school.student.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO for Student create/update and response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDTO {

    private Long id;

    // Only populated by endpoints that span schools (the Super Admin cross-school student search);
    // every other response omits it, since callers already know their own schoolId from their token.
    private Long schoolId;

    @NotBlank(message = "Admission number is required")
    private String admissionNumber;

    @NotBlank(message = "Name is required")
    private String name;

    private LocalDate dateOfBirth;

    private String gender;

    private Long parentId;

    private String className;

    private String section;

    private String fatherName;

    private String motherName;

    private String guardianName;

    private String contactNumber;
    private String fatherMobileNumber;
    private String motherMobileNumber;
    private String guardianMobileNumber;

    private String address;

    private String bloodGroup;

    private LocalDate joiningDate;

    @Builder.Default
    private Boolean isActive = true;

    private String phoneNumber;

    private String photo;

    // Write-only password, not returned to frontend
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
    private String password;

    // Read-only: whether a parent portal password is currently set (never the hash itself)
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @Builder.Default
    private Boolean hasParentLogin = false;

    public void setParentLoginPhoneNumber(String parentLoginPhoneNumber) {
        if (parentLoginPhoneNumber != null && !parentLoginPhoneNumber.isBlank()) {
            this.phoneNumber = parentLoginPhoneNumber.trim();
        }
    }

    public void setParentLoginPassword(String parentLoginPassword) {
        if (parentLoginPassword != null && !parentLoginPassword.isBlank()) {
            this.password = parentLoginPassword.trim();
        }
    }
}
