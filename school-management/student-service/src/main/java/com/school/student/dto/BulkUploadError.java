package com.school.student.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Detailed error record for a row in a bulk student upload.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkUploadError {
    private int row;
    private String studentName;
    private String admissionNumber;
    private String errorType;
    private String errorMessage;
    private Integer duplicateWithRow;
    private String errorFields;
}
