package com.victorc.gymnotebook.payload.response;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SetResponse {
	private Long id;

	private int reps;

	private int weight;

	private int time;

	private int distance;

	private String notes;

	private boolean isDropSet;

	private LocalDateTime startDate;
}
