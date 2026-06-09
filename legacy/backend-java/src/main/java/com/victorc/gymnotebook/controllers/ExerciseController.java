package com.victorc.gymnotebook.controllers;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.victorc.gymnotebook.exceptions.ResourceNotFoundException;
import com.victorc.gymnotebook.models.Exercise;
import com.victorc.gymnotebook.models.ImageData;
import com.victorc.gymnotebook.models.User;
import com.victorc.gymnotebook.payload.request.CreateExerciseRequest;
import com.victorc.gymnotebook.payload.request.UpdateExerciseRequest;
import com.victorc.gymnotebook.payload.response.ExerciseResponse;
import com.victorc.gymnotebook.repository.ExerciseRepository;
import com.victorc.gymnotebook.repository.ImageDataRepository;
import com.victorc.gymnotebook.repository.UserRepository;

import jakarta.validation.Valid;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/exercise")
public class ExerciseController {

	@Autowired
	private final ExerciseRepository exerciseRepository;

	@Autowired
	private final ImageDataRepository imageDataRepository;

	@Autowired
	private final UserRepository userRepository;

	public ExerciseController(ExerciseRepository exerciseRepository, ImageDataRepository imageDataRepository,
			UserRepository userRepository) {
		this.exerciseRepository = exerciseRepository;
		this.imageDataRepository = imageDataRepository;
		this.userRepository = userRepository;
	}

	@GetMapping
	public ResponseEntity<List<ExerciseResponse>> getExercises(Principal principal) {
		User user = userRepository.findByUsername(principal.getName())
				.orElseThrow(() -> new ResourceNotFoundException(
						"Usuario no encontrado con nombre: " + principal.getName()));

		List<Exercise> exercises = exerciseRepository.findByUser(user);

		List<ExerciseResponse> response = exercises.stream().map(exercise -> {
			ExerciseResponse exerciseResponse = new ExerciseResponse();
			exerciseResponse.setId(exercise.getId());
			exerciseResponse.setName(exercise.getName());
			exerciseResponse.setDescription(exercise.getDescription());
			if (exercise.getImage() != null) {
				exerciseResponse.setImageId(exercise.getImage().getId());
			}
			exerciseResponse.setType(exercise.getType());
			exerciseResponse.setPrimaryMuscleGroup(exercise.getPrimaryMuscleGroup());
			if (exercise.getSecondaryMuscleGroup() != null) {
				exerciseResponse.setSecondaryMuscleGroup(exercise.getSecondaryMuscleGroup());
			}
			return exerciseResponse;
		}).collect(Collectors.toList());

		return ResponseEntity.ok(response);
	}

	@GetMapping("/{id}")
	public ResponseEntity<?> getExercise(@PathVariable Long id, Principal principal) {
		if (!exerciseRepository.existsById(id)) {
			return ResponseEntity.notFound().build();
		}

		User user = userRepository.findByUsername(principal.getName())
				.orElseThrow(() -> new ResourceNotFoundException(
						"Usuario no encontrado con nombre: " + principal.getName()));
		Exercise exercise = exerciseRepository.findById(id).get();

		// Comprobamos si el ejercicio pertenece al usuario
		if (!exercise.getUser().getId().equals(user.getId())) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}

		// Mapeamos a ExerciseResponse
		ExerciseResponse exerciseResponse = new ExerciseResponse();
		exerciseResponse.setId(exercise.getId());
		exerciseResponse.setName(exercise.getName());
		exerciseResponse.setDescription(exercise.getDescription());
		if (exercise.getImage() != null) {
			exerciseResponse.setImageId(exercise.getImage().getId());
		}
		exerciseResponse.setType(exercise.getType());
		exerciseResponse.setPrimaryMuscleGroup(exercise.getPrimaryMuscleGroup());
		if (exercise.getSecondaryMuscleGroup() != null) {
			exerciseResponse.setSecondaryMuscleGroup(exercise.getSecondaryMuscleGroup());
		}

		return ResponseEntity.ok().body(exerciseResponse);
	}

	@PostMapping
	public ResponseEntity<Exercise> createExercise(@Valid @RequestBody CreateExerciseRequest createExerciseRequest,
			Principal principal) {
		User user = userRepository.findByUsername(principal.getName())
				.orElseThrow(() -> new ResourceNotFoundException(
						"Usuario no encontrado con nombre: " + principal.getName()));

		Exercise newExercise = new Exercise();
		newExercise.setName(createExerciseRequest.getName());

		if (createExerciseRequest.getImageId() != null) {
			ImageData imageData = imageDataRepository.findById(createExerciseRequest.getImageId())
					.orElseThrow(
							() -> new ResourceNotFoundException(
									"La Imagen con id: " + createExerciseRequest.getImageId() + " no existe"));
			newExercise.setImage(imageData);
		}

		newExercise.setDescription(createExerciseRequest.getDescription());
		newExercise.setType(createExerciseRequest.getType());
		newExercise.setPrimaryMuscleGroup(createExerciseRequest.getPrimaryMuscleGroup());
		newExercise.setSecondaryMuscleGroup(createExerciseRequest.getSecondaryMuscleGroup());
		newExercise.setUser(user);

		exerciseRepository.save(newExercise);

		return ResponseEntity.status(HttpStatus.CREATED).build();
	}

	@PutMapping("/{id}")
	public ResponseEntity<Exercise> updateExercise(@Valid @RequestBody UpdateExerciseRequest createExerciseRequest,
			@PathVariable Long id, Principal principal) {

		User user = userRepository.findByUsername(principal.getName())
				.orElseThrow(() -> new ResourceNotFoundException(
						"Usuario no encontrado con nombre: " + principal.getName()));

		Exercise exercise = exerciseRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException(
						"El Ejercicio con id: " + id + " no existe"));

		// Comprobamos si el ejercicio pertenece al usuario
		if (!exercise.getUser().getId().equals(user.getId())) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}

		exercise.setName(createExerciseRequest.getName());

		if (createExerciseRequest.getImageId() != null) {
			ImageData imageData = imageDataRepository.findById(createExerciseRequest.getImageId())
					.orElseThrow(
							() -> new ResourceNotFoundException(
									"La Imagen con id: " + createExerciseRequest.getImageId() + " no existe"));
			exercise.setImage(imageData);
		}

		exercise.setDescription(createExerciseRequest.getDescription());
		exercise.setType(createExerciseRequest.getType());
		exercise.setPrimaryMuscleGroup(createExerciseRequest.getPrimaryMuscleGroup());
		exercise.setSecondaryMuscleGroup(createExerciseRequest.getSecondaryMuscleGroup());

		exerciseRepository.save(exercise);

		return ResponseEntity.status(HttpStatus.CREATED).build();
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<?> deleteExercise(@PathVariable Long id, Principal principal) {
		User user = userRepository.findByUsername(principal.getName())
				.orElseThrow(() -> new ResourceNotFoundException(
						"Usuario no encontrado con nombre: " + principal.getName()));

		Exercise exercise = exerciseRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException(
						"El Ejercicio con id: " + id + " no existe"));

		// Comprobamos si el ejercicio pertenece al usuario
		if (!exercise.getUser().getId().equals(user.getId())) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}

		exerciseRepository.delete(exercise);

		return ResponseEntity.noContent().build();
	}
}
