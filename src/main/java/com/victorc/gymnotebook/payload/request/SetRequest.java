package com.victorc.gymnotebook.payload.request;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SetRequest {

	private int reps;

	private int weight;

	private int time;

	private int distance;

	private String notes;

	private boolean isDropSet;

	private Instant startDate;
}
