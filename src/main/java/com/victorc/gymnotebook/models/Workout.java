package com.victorc.gymnotebook.models;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "workouts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Workout {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@OneToMany(mappedBy = "workout")
	private List <WorkoutSet> workoutSets;

	@ManyToOne
	private User user;

	private LocalDateTime startDate;

	private LocalDateTime endDate;

	private String notes;
}
