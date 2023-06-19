package com.victorc.gymnotebook.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.victorc.gymnotebook.models.WorkoutSet;

public interface WorkoutSetRepository  extends JpaRepository<WorkoutSet, Long> {

	Page<WorkoutSet> findByExerciseId(Long exerciseId, Pageable pageable);
	
}
