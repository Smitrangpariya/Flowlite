package com.flowlite.exception;

/**
 * Custom access denied exception for FlowLite business logic.
 * Separate from Spring Security's AccessDeniedException to allow
 * different handling in the GlobalExceptionHandler.
 */
public class FlowliteAccessDeniedException extends RuntimeException {
    
    public FlowliteAccessDeniedException(String message) {
        super(message);
    }
}
