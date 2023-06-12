package com.victorc.gymnotebook.payload.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class AllExercisesResponse {
	
	public Long id;

	public String name;

	public String description;

	public Long imageId;

	public String type;

	public String primaryMuscleGroup;

	public String secondaryMuscleGroup;
}
