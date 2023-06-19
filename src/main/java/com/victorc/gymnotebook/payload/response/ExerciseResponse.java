package com.victorc.gymnotebook.payload.response;

import com.victorc.gymnotebook.models.EExerciseType;
import com.victorc.gymnotebook.models.EMuscleGroup;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class ExerciseResponse {
	
	public Long id;

	public String name;

	public String description;

	public Long imageId;

	public EExerciseType type;

	public EMuscleGroup primaryMuscleGroup;

	public EMuscleGroup secondaryMuscleGroup;
}
