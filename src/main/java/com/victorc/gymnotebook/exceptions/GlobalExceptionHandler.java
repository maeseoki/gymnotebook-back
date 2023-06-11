package com.victorc.gymnotebook.exceptions;

import com.victorc.gymnotebook.payload.response.MessageResponse;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.MethodArgumentNotValidException;

@ControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<?> handleValidationExceptions(
			MethodArgumentNotValidException ex) {
		FieldError fieldError = ex.getBindingResult().getFieldError();
		String errorMessage = fieldError != null ? fieldError.getDefaultMessage() : "Error de validación";
		return ResponseEntity
				.badRequest()
				.body(new MessageResponse(errorMessage));
	}

	@ExceptionHandler(NullPointerException.class)
	public ResponseEntity<?> handleNullPointerException(
			NullPointerException ex) {
		String errorMessage = "A null value was encountered where an object was required.";
		return ResponseEntity
				.badRequest()
				.body(new MessageResponse(errorMessage));
	}

	@ExceptionHandler(ResourceNotFoundException.class)
	public ResponseEntity<?> handleResourceNotFoundException(
			ResourceNotFoundException ex) {
		String errorMessage = ex.getMessage();
		return ResponseEntity
				.status(HttpStatus.NOT_FOUND)
				.body(new MessageResponse(errorMessage));
	}

	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<?> handleIllegalArgumentException(
			IllegalArgumentException ex) {
		String errorMessage = ex.getMessage();
		return ResponseEntity
				.badRequest()
				.body(new MessageResponse(errorMessage));
	}

	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<?> handleAccessDeniedException(
			AccessDeniedException ex) {
		String errorMessage = "Access is denied.";
		return ResponseEntity
				.status(HttpStatus.FORBIDDEN)
				.body(new MessageResponse(errorMessage));
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<?> handleDataIntegrityViolationException(
			DataIntegrityViolationException ex) {
		String errorMessage = "Database error occurred.";
		return ResponseEntity
				.status(HttpStatus.CONFLICT)
				.body(new MessageResponse(errorMessage));
	}

}
