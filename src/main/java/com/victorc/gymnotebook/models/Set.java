package com.victorc.gymnotebook.models;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "sets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Set {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private int reps;

	private int weight;

	private int time;

	private int distance;

	private String notes;

	private boolean isDropSet;

	@ManyToOne
	@JoinColumn(name="workoutSet_id", nullable=false)
	private WorkoutSet workoutSet;

	private LocalDateTime startDate;
}
