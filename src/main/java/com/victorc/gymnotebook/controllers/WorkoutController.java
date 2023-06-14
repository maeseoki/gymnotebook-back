package com.victorc.gymnotebook.controllers;

import java.security.Principal;
import java.time.ZoneId;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.victorc.gymnotebook.exceptions.ResourceNotFoundException;
import com.victorc.gymnotebook.models.Exercise;
import com.victorc.gymnotebook.models.Set;
import com.victorc.gymnotebook.models.User;
import com.victorc.gymnotebook.models.Workout;
import com.victorc.gymnotebook.models.WorkoutSet;
import com.victorc.gymnotebook.payload.request.CreateWorkoutRequest;
import com.victorc.gymnotebook.payload.request.SetRequest;
import com.victorc.gymnotebook.payload.request.WorkoutSetRequest;
import com.victorc.gymnotebook.repository.ExerciseRepository;
import com.victorc.gymnotebook.repository.SetRepository;
import com.victorc.gymnotebook.repository.UserRepository;
import com.victorc.gymnotebook.repository.WorkoutRepository;
import com.victorc.gymnotebook.repository.WorkoutSetRepository;

import jakarta.validation.Valid;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/workout")
public class WorkoutController {

	@Autowired
	private final WorkoutRepository workoutRepository;

	@Autowired
	private final ExerciseRepository exerciseRepository;

	@Autowired
	private final WorkoutSetRepository workoutSetRepository;

	@Autowired
	private final SetRepository setRepository;

	@Autowired
	private final UserRepository userRepository;

	public WorkoutController(WorkoutRepository workoutRepository, ExerciseRepository exerciseRepository,
			WorkoutSetRepository workoutSetRepository, SetRepository setRepository, UserRepository userRepository) {
		this.workoutRepository = workoutRepository;
		this.exerciseRepository = exerciseRepository;
		this.workoutSetRepository = workoutSetRepository;
		this.setRepository = setRepository;
		this.userRepository = userRepository;
	}

	@PostMapping
	public ResponseEntity<?> createWorkout(@Valid @RequestBody CreateWorkoutRequest createWorkoutRequest,
			Principal principal) {
		// Recuperamos el usuario
		User user = userRepository.findByUsername(principal.getName())
				.orElseThrow(() -> new ResourceNotFoundException(
						"Usuario no encontrado con nombre: " + principal.getName()));
		
		// Comprobamos que el UUID del workout recibido no existe, y devolvemos un 409 Conflict si existe
		if (workoutRepository.existsByUuid(createWorkoutRequest.getUuid())) {
			return ResponseEntity.status(409).body("Ya existe un workout con el UUID: " + createWorkoutRequest.getUuid());
		}

		// Creamos el workout
		Workout workout = new Workout();
		workout.setUuid(createWorkoutRequest.getUuid());
		workout.setStartDate(createWorkoutRequest.getStartDate().atZone(ZoneId.systemDefault()).toLocalDateTime());
		workout.setEndDate(createWorkoutRequest.getEndDate().atZone(ZoneId.systemDefault()).toLocalDateTime());
		workout.setNotes(createWorkoutRequest.getNotes());
		workout.setUser(user);
		workout = workoutRepository.save(workout);

		// Recorremos los workoutSets
		for (WorkoutSetRequest workoutSetRequest : createWorkoutRequest.getWorkoutSets()) {

			// Recuperamos el ejercicio
			Exercise exercise = exerciseRepository.findById(workoutSetRequest.getExercise().getId())
					.orElseThrow(() -> new ResourceNotFoundException(
							"Ejercicio no encontrado con Id: " + workoutSetRequest.getExercise().getId()));

			// Creamos el workoutSet
			WorkoutSet workoutSet = new WorkoutSet();
			workoutSet.setWorkout(workout);
			workoutSet.setExercise(exercise);
			if (workoutSetRequest.getStartDate() != null){
				workoutSet.setStartDate(workoutSetRequest.getStartDate().atZone(ZoneId.systemDefault()).toLocalDateTime());
			}
			if (workoutSetRequest.getEndDate() != null) {
				workoutSet.setEndDate(workoutSetRequest.getEndDate().atZone(ZoneId.systemDefault()).toLocalDateTime());
			}
			workoutSet.setNotes(workoutSetRequest.getNotes());
			workoutSet = workoutSetRepository.save(workoutSet);

			// Recorremos los sets
			for (SetRequest setRequest : workoutSetRequest.getSets()) {

				// Creamos el set
				Set set = new Set();
				set.setReps(setRequest.getReps());
				set.setWeight(setRequest.getWeight());
				set.setTime(setRequest.getTime());
				set.setDistance(setRequest.getDistance());
				set.setNotes(setRequest.getNotes());
				set.setDropSet(setRequest.isDropSet());
				if (setRequest.getStartDate() != null){
					set.setStartDate(setRequest.getStartDate().atZone(ZoneId.systemDefault()).toLocalDateTime());
				}
				set.setWorkoutSet(workoutSet);
				setRepository.save(set);
			}
		}

		// Todo guardado. Devolvemos un 201 Created
		return ResponseEntity.status(201).build();
	}
}
