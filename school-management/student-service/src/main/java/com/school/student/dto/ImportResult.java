package com.school.student.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Result of an Excel student import operation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportResult {

    private int total;
    private int imported;
    private int updated;
    private int skipped;
    private int failed;

    @Builder.Default
    private List<RowError> errors = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RowError {
        private int row;
        private String field;
        private String reason;
    }
}
