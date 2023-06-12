package com.victorc.gymnotebook.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.victorc.gymnotebook.models.Exercise;

public interface ExerciseRepository extends JpaRepository<Exercise, Long> {
	
}
