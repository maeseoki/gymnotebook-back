package com.victorc.gymnotebook.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.victorc.gymnotebook.models.WorkoutSet;

public interface WorkoutSetRepository  extends JpaRepository<WorkoutSet, Long> {
	
}
