package com.victorc.gymnotebook.payload.request;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateWorkoutRequest {

	private String uuid;

	private Instant startDate;

	private WorkoutSetRequest[] workoutSets;

	private Instant endDate;

	private String notes;
}
