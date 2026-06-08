package com.victorc.gymnotebook.exceptions;

public class ResourceNotFoundException extends RuntimeException {

	public ResourceNotFoundException(String message) {
        super(message);
    }
}
