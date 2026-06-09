package com.victorc.gymnotebook.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.victorc.gymnotebook.models.User;
import com.victorc.gymnotebook.models.Workout;

public interface WorkoutRepository extends JpaRepository<Workout, Long> {

	boolean existsByUuid(String uuid);

	@Query(value = "SELECT EXTRACT(DAY FROM w.start_date) FROM Workouts w WHERE w.user_id = :userId AND EXTRACT(MONTH FROM w.start_date) = :month AND EXTRACT(YEAR FROM w.start_date) = :year", nativeQuery = true)
	List<Integer> findWorkoutDaysByMonthAndYear(@Param("userId") Long userId, @Param("month") int month,
			@Param("year") int year);

	@Query("SELECT w FROM Workout w WHERE w.user = :user AND w.startDate >= :startOfDay AND w.startDate < :endOfDay")
	List<Workout> findWorkoutsByUserAndDateBetween(@Param("user") User user,
			@Param("startOfDay") LocalDateTime startOfDay, @Param("endOfDay") LocalDateTime endOfDay);

}
