package com.victorc.gymnotebook.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.victorc.gymnotebook.exceptions.ResourceNotFoundException;
import com.victorc.gymnotebook.models.Exercise;
import com.victorc.gymnotebook.models.ImageData;
import com.victorc.gymnotebook.models.Set;
import com.victorc.gymnotebook.models.User;
import com.victorc.gymnotebook.models.WorkoutSet;
import com.victorc.gymnotebook.payload.response.ExerciseResponse;
import com.victorc.gymnotebook.payload.response.SetResponse;
import com.victorc.gymnotebook.payload.response.WorkoutSetResponse;
import com.victorc.gymnotebook.repository.ExerciseRepository;
import com.victorc.gymnotebook.repository.UserRepository;
import com.victorc.gymnotebook.repository.WorkoutSetRepository;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/workout-sets")
public class WorkoutSetController {

	@Autowired
	private final WorkoutSetRepository workoutSetRepository;

	@Autowired
	private final ExerciseRepository exerciseRepository;

	@Autowired
	private final UserRepository userRepository;

	public WorkoutSetController(WorkoutSetRepository workoutSetRepository, ExerciseRepository exerciseRepository,
			UserRepository userRepository) {
		this.workoutSetRepository = workoutSetRepository;
		this.exerciseRepository = exerciseRepository;
		this.userRepository = userRepository;
	}

	// Los request parameters se usan automáticamente para paginar. Por ejemplo:
	// /exercise/1?page=0&size=10. También se controlar
	// el orden con sort. Por ejemplo:
	// /exercise/1?page=0&size=10&sort=startDate,desc
	@GetMapping("/exercise/{exerciseId}")
	public ResponseEntity<?> getWorkoutSetsByExerciseId(@PathVariable Long exerciseId, Pageable pageable,
			Principal principal) {
		// Comprobamos si el ejercicio existe y pertenece al usuario
		User user = userRepository.findByUsername(principal.getName())
				.orElseThrow(() -> new ResourceNotFoundException(
						"Usuario no encontrado con nombre: " + principal.getName()));

		if (exerciseRepository.findByIdAndUserId(exerciseId, user.getId()) == null) {
			return ResponseEntity.badRequest().body("El ejercicio no existe o no pertenece al usuario");
		}

		Page<WorkoutSet> workoutSets = workoutSetRepository.findByExerciseId(exerciseId, pageable);

		Page<WorkoutSetResponse> workoutSetsResponsePage = workoutSets.map(workoutSet -> {
			WorkoutSetResponse workoutSetResponse = new WorkoutSetResponse();
			workoutSetResponse.setId(workoutSet.getId());
			workoutSetResponse.setStartDate(workoutSet.getStartDate());
			workoutSetResponse.setEndDate(workoutSet.getEndDate());
			workoutSetResponse.setNotes(workoutSet.getNotes());

			Exercise exercise = workoutSet.getExercise();
			if (exercise != null) {
				ImageData image = exercise.getImage();
				Long imageId = image != null ? image.getId() : null;

				workoutSetResponse.setExercise(new ExerciseResponse(
						exercise.getId(),
						exercise.getName(),
						exercise.getDescription(),
						imageId,
						exercise.getType(),
						exercise.getPrimaryMuscleGroup(),
						exercise.getSecondaryMuscleGroup()));
			}

			List<Set> sets = workoutSet.getSets();
			if (sets != null) {
				workoutSetResponse.setSets(sets.stream()
						.map(set -> {
							SetResponse setResponse = new SetResponse();
							setResponse.setId(set.getId());
							setResponse.setReps(set.getReps());
							setResponse.setWeight(set.getWeight());
							setResponse.setTime(set.getTime());
							setResponse.setDistance(set.getDistance());
							setResponse.setNotes(set.getNotes());
							setResponse.setDropSet(set.isDropSet());
							setResponse.setStartDate(set.getStartDate());
							return setResponse;
						})
						.collect(Collectors.toList()));
			}
			return workoutSetResponse;
		});

		return ResponseEntity.ok(workoutSetsResponsePage);
	}
}
