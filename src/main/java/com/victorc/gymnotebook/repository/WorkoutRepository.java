package com.victorc.gymnotebook.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.victorc.gymnotebook.models.Workout;

public interface WorkoutRepository extends JpaRepository<Workout, Long> {

	boolean existsByUuid(String uuid);
	
}
