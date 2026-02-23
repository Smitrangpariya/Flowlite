package com.flowlite.exception;

public class BoardLimitExceededException extends RuntimeException {
    public BoardLimitExceededException(String message) {
        super(message);
    }
}
