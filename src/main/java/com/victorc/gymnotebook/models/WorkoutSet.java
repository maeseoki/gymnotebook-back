package com.victorc.gymnotebook.models;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "workout_sets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor

public class WorkoutSet {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne
	@JoinColumn(name="workout_id", nullable=false)
	private Workout workout;

	@ManyToOne(optional = false)
	private Exercise exercise;

	@OneToMany(mappedBy = "workoutSet")
	private List <Set> sets;

	private LocalDateTime startDate;

	private LocalDateTime endDate;

	private String notes;
}
