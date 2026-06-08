package com.victorc.gymnotebook.payload.response;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkoutSetResponse {
	private Long id;

    private LocalDateTime startDate;

    private LocalDateTime endDate;

	private ExerciseResponse exercise;

	private List <SetResponse> sets;

    private String notes;
}
