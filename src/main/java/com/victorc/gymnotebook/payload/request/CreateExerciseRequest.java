package com.victorc.gymnotebook.payload.request;

import com.victorc.gymnotebook.models.EExerciseType;
import com.victorc.gymnotebook.models.EMuscleGroup;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateExerciseRequest {
	
	@NotBlank
    @Size(max = 200)
	private String name;

    private Long imageId;

	@Size(max = 500)
    private String description;

    @NotNull
    private EExerciseType type;

    @NotNull
    private EMuscleGroup primaryMuscleGroup;

    private EMuscleGroup secondaryMuscleGroup;
}
