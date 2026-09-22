package com.school.student.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Result of an atomic bulk student upload operation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkUploadResult {
    private boolean success;
    private int totalRows;
    private int insertedCount;
    private int errorCount;
    @Builder.Default
    private List<BulkUploadError> errors = new ArrayList<>();
    private String errorExcelBase64;
    private String message;
}
