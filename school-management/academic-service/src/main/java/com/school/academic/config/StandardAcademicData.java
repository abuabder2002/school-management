package com.school.academic.config;

import java.util.Arrays;
import java.util.List;

/** The starter exams and subjects every new school is given once (see AcademicDefaultsSeeder). */
public final class StandardAcademicData {

    private StandardAcademicData() {
    }

    public static final List<String> STANDARD_EXAMS = Arrays.asList(
            "1st Mid Term",
            "2nd Mid Term",
            "3rd Mid Term",
            "Quarterly",
            "Half Yearly",
            "Annual Exam"
    );

    public static final List<String[]> STANDARD_SUBJECTS = Arrays.asList(
            new String[]{"Tamil", "TAM"},
            new String[]{"English", "ENG"},
            new String[]{"Mathematics", "MATH"},
            new String[]{"Science", "SCI"},
            new String[]{"Social Science", "SOC"},
            new String[]{"Physics", "PHY"},
            new String[]{"Chemistry", "CHE"},
            new String[]{"Biology", "BIO"},
            new String[]{"Computer Science", "CS"}
    );
}
