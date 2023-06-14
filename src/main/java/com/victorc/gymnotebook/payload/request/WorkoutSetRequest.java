package com.victorc.gymnotebook.payload.request;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkoutSetRequest {

	private ExerciseRequest exercise;

	private SetRequest[] sets;

	private Instant startDate;

	private Instant endDate;

	private String notes;
}
