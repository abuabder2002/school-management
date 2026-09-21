package com.school.common.exception;

/**
 * Thrown when request parameters or business rules are violated.
 */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
