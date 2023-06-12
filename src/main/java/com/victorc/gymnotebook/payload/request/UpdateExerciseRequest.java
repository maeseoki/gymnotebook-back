package com.victorc.gymnotebook.payload.request;

import jakarta.validation.constraints.NotNull;

public class UpdateExerciseRequest extends CreateExerciseRequest {
	
	@NotNull
	public Long id;
}
