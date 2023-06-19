package com.victorc.gymnotebook.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.victorc.gymnotebook.models.Exercise;
import com.victorc.gymnotebook.models.User;

public interface ExerciseRepository extends JpaRepository<Exercise, Long> {
	List<Exercise> findByUser(User user);

	Exercise findByIdAndUserId(Long exerciseId, Long id);
}
